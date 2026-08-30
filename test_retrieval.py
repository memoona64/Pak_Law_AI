"""Network-free regression checks for the FastAPI retrieval stack."""

import unittest

import numpy as np
from fastapi import HTTPException

from fastapi_app import embeddings, main, search_service
from fastapi_app.errors import ModelUnavailableError


def _chunk(chunk_id, text, province=None, section="1"):
    return {
        "id": chunk_id,
        "text": text,
        "metadata": {
            "section": section,
            "section_number": section,
            "province": province,
            "short_code": "TEST",
        },
    }


class RetrievalTests(unittest.TestCase):
    def setUp(self):
        self.originals = {
            "_chunks": search_service._chunks,
            "_bm25": search_service._bm25,
            "_collection": search_service._collection,
            "_corpus_fingerprint": search_service._corpus_fingerprint,
            "_vector_search": search_service._vector_search,
            "rerank": search_service.rerank,
        }
        search_service._chunks = [
            _chunk("federal", "federal tenancy law", None, "10"),
            _chunk("sindh", "sindh tenancy law", "Sindh", "11"),
            _chunk("punjab", "punjab tenancy law", "Punjab", "12"),
        ]
        search_service._bm25 = search_service.build_bm25(search_service._chunks)
        search_service._collection = object()  # Avoid model/index initialization.
        self.vector_provinces = []

        def fake_vector_search(query, province, k=20):
            self.vector_provinces.append(province)
            return list(reversed(search_service._eligible_indices(province)))[:k]

        search_service._vector_search = fake_vector_search
        search_service.rerank = lambda query, chunks, top_k: chunks[:top_k]

    def tearDown(self):
        for name, value in self.originals.items():
            setattr(search_service, name, value)

    def test_province_filter_applies_before_bm25_and_vector_ranking(self):
        eligible = search_service._eligible_indices("sindh")
        self.assertEqual(
            {search_service._chunks[index]["id"] for index in eligible},
            {"federal", "sindh"},
        )
        bm25 = search_service._bm25_search("tenancy", eligible)
        self.assertEqual({search_service._chunks[index]["id"] for index in bm25}, {"federal", "sindh"})
        results, _, _ = search_service.search("tenancy", province="SINDH", use_reranker=False)
        self.assertEqual({chunk["id"] for chunk in results}, {"federal", "sindh"})
        self.assertEqual(self.vector_provinces, ["SINDH"])

    def test_chroma_metadata_and_fingerprint_are_stable(self):
        metadata = search_service._chroma_metadata(search_service._chunks[1])
        self.assertEqual(metadata["province"], "sindh")
        self.assertEqual(metadata["scope"], "province")
        self.assertEqual(search_service._chroma_metadata(search_service._chunks[0])["scope"], "federal")
        fingerprint = search_service._fingerprint(search_service._chunks)
        self.assertEqual(fingerprint, search_service._fingerprint(search_service._chunks))
        self.assertEqual(
            search_service._chroma_where("Sindh"),
            {"$or": [{"scope": "federal"}, {"province": "sindh"}]},
        )

    def test_e5_prefixes_are_applied(self):
        class FakeModel:
            def __init__(self):
                self.calls = []

            def encode(self, value, convert_to_numpy=True):
                self.calls.append(value)
                return np.array([[0.0, 1.0] for _ in value])

        fake_model = FakeModel()
        original_model = embeddings._model
        embeddings._model = fake_model
        try:
            embeddings.embed(["law text"])
            embeddings.embed_query("legal question")
        finally:
            embeddings._model = original_model
        self.assertEqual(fake_model.calls, [["passage: law text"], ["query: legal question"]])

    def test_api_returns_503_for_missing_model(self):
        original_search = main.search_service.search
        main.search_service.search = lambda **kwargs: (_ for _ in ()).throw(
            ModelUnavailableError("model cache missing")
        )
        try:
            with self.assertRaises(HTTPException) as caught:
                main.rag_query(main.QueryRequest(query="tenancy"))
        finally:
            main.search_service.search = original_search
        self.assertEqual(caught.exception.status_code, 503)

    def test_extract_section_ref_supports_urdu_and_roman_urdu(self):
        self.assertEqual(search_service._extract_section_ref("دفعہ 302 PPC"), ("section", "302", None))
        self.assertEqual(search_service._extract_section_ref("آرٹیکل 25"), ("article", "25", None))
        self.assertEqual(search_service._extract_section_ref("dhara 302"), ("section", "302", None))
        self.assertEqual(search_service._extract_section_ref("dafah 154 CrPC"), ("section", "154", None))

    def test_extract_section_ref_ignores_word_fragments_and_finds_act_code(self):
        self.assertIsNone(search_service._extract_section_ref("what does part 2 of my tenancy mean"))
        self.assertIsNone(search_service._extract_section_ref("my cart 5 was stolen"))
        self.assertEqual(
            search_service._extract_section_ref("section 11 TEST"), ("section", "11", "TEST")
        )

    def test_extract_section_ref_supports_plural_phrasing(self):
        self.assertEqual(
            search_service._extract_section_ref("what do sections 302 and 34 PPC say"),
            ("section", "302", None),
        )
        self.assertEqual(
            search_service._extract_section_ref("articles 8 and 9"), ("article", "8", None)
        )

    def test_exact_lookup_disambiguates_by_act_code(self):
        search_service._chunks.append(
            _chunk("other-act", "other act with same section", None, "10")
        )
        search_service._chunks[-1]["metadata"]["short_code"] = "OTHER"
        results = search_service._exact_lookup("section", "10", "OTHER", None)
        self.assertEqual([chunk["id"] for chunk in results], ["other-act"])

    def test_query_normalization_rewrites_roman_urdu(self):
        normalized, used_llm = search_service.normalize_query("police FIR darj nahi kar rahi")
        self.assertIn("154", normalized)
        self.assertIn("FIR", normalized)

    def test_search_falls_back_when_reranker_model_is_unavailable(self):
        def failing_rerank(query, chunks, top_k):
            raise ModelUnavailableError("reranker cache missing")

        search_service.rerank = failing_rerank
        results, timings, _ = search_service.search("tenancy", province="Sindh", use_reranker=True)
        self.assertEqual(len(results), 2)
        self.assertEqual(timings.get("rerank_status"), "fallback_no_model")

    def test_search_falls_back_to_bm25_when_embedding_model_is_unavailable(self):
        def failing_vector_search(query, province, k=20):
            raise ModelUnavailableError("embedding model cache missing")

        search_service._vector_search = failing_vector_search
        results, timings, _ = search_service.search("tenancy", province="Sindh", use_reranker=False)
        self.assertTrue(len(results) > 0)
        self.assertEqual(timings.get("vector_status"), "fallback_bm25_only")


if __name__ == "__main__":
    unittest.main(verbosity=2)
