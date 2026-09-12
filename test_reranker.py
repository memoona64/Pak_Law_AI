"""Network-free regression check for the reranker's title fallback.

Not every corpus file stores a chunk's heading under the same metadata key
(section_title / article_title / plain "title" - see fastapi_app/reranker.py
and fastapi_app/search_service.py's _bm25_text for the same fallback used
elsewhere). This test never loads the real cross-encoder model - it swaps in
a fake one that just records what text it was asked to score.
"""

import unittest

from fastapi_app import reranker


class FakeCrossEncoder:
    def __init__(self):
        self.documents = []

    def predict(self, pairs, batch_size=4):
        self.documents = [document for _, document in pairs]
        return [0.0 for _ in pairs]


def _chunk(chunk_id, text, metadata):
    return {"id": chunk_id, "text": text, "metadata": metadata}


class RerankerTitleFallbackTests(unittest.TestCase):
    def setUp(self):
        self.fake = FakeCrossEncoder()
        self.original_get_reranker = reranker.get_reranker
        reranker.get_reranker = lambda: self.fake

    def tearDown(self):
        reranker.get_reranker = self.original_get_reranker

    def test_uses_section_title_when_present(self):
        chunk = _chunk("ppc-302", "text", {"section_title": "Punishment of qatl-i-amd"})
        reranker.rerank("query", [chunk], top_k=1)
        self.assertIn("Title: Punishment of qatl-i-amd", self.fake.documents[0])

    def test_falls_back_to_article_title(self):
        chunk = _chunk("const-25", "text", {"article_title": "Equality of citizens"})
        reranker.rerank("query", [chunk], top_k=1)
        self.assertIn("Title: Equality of citizens", self.fake.documents[0])

    def test_falls_back_to_plain_title_for_mflo_and_srpo(self):
        chunk = _chunk("mflo-7", "text", {"title": "Talaq"})
        reranker.rerank("query", [chunk], top_k=1)
        self.assertIn("Title: Talaq", self.fake.documents[0])

    def test_blank_title_when_none_of_the_keys_are_present(self):
        chunk = _chunk("x-1", "text", {})
        reranker.rerank("query", [chunk], top_k=1)
        self.assertIn("Title: ;", self.fake.documents[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
