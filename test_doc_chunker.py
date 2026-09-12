"""Regression checks for fastapi_app/doc_chunker.py - splitting an uploaded
document into clause-like chunks. No network or models involved."""

import unittest

from fastapi_app.doc_chunker import chunk_document


class ChunkDocumentTests(unittest.TestCase):
    def test_preamble_before_the_first_numbered_clause_is_kept_as_its_own_chunk(self):
        text = (
            "THIS AGREEMENT is made between Ali and Bilal on 1 January 2026.\n"
            "1. The tenant shall pay rent monthly.\n"
            "2. The landlord shall maintain the property.\n"
        )
        chunks = chunk_document(text)
        self.assertEqual(chunks[0]["clause_number"], None)
        self.assertIn("THIS AGREEMENT", chunks[0]["text"])
        self.assertEqual(chunks[1]["clause_number"], "1")
        self.assertEqual(chunks[2]["clause_number"], "2")

    def test_document_with_no_preamble_has_no_extra_leading_chunk(self):
        text = "1. First clause.\n2. Second clause.\n"
        chunks = chunk_document(text)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["clause_number"], "1")

    def test_restarted_numbering_across_a_schedule_is_preserved_as_written(self):
        # A Schedule/Annexure re-using "1.", "2." is a real, expected shape -
        # doc_chunker.py doesn't (and shouldn't) try to renumber it; that's
        # handled downstream in generation.py's analyze_clauses matching.
        text = "1. Main clause one.\n2. Main clause two.\nSCHEDULE\n1. Schedule item one.\n"
        chunks = chunk_document(text)
        numbers = [c["clause_number"] for c in chunks]
        self.assertEqual(numbers, ["1", "2", "1"])

    def test_documents_with_fewer_than_two_clause_markers_use_the_sentence_window_fallback(self):
        text = "This is a notice with no numbered clauses at all. It just has sentences. Three of them."
        chunks = chunk_document(text)
        self.assertTrue(all(c["clause_number"] is None for c in chunks))
        self.assertGreater(len(chunks), 0)

    def test_empty_document_produces_no_chunks(self):
        self.assertEqual(chunk_document(""), [])
        self.assertEqual(chunk_document("   \n  "), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
