"""Regression checks for fastapi_app/citation_verifier.py - the hallucination
guard that confirms every citation in a generated answer was actually
retrieved. No network or models involved, so this always runs fast."""

import unittest

from fastapi_app.citation_verifier import find_unsupported_claims, verify_citations


def _chunk(text, section=None, article=None):
    metadata = {}
    if section is not None:
        metadata["section"] = section
    if article is not None:
        metadata["Article"] = article
    return {"text": text, "metadata": metadata}


class VerifyCitationsTests(unittest.TestCase):
    def test_citation_matching_a_retrieved_chunks_metadata_is_verified(self):
        chunks = [_chunk("Whoever commits theft...", section="379")]
        result = verify_citations("Under Section 379, theft is punishable.", chunks)
        self.assertEqual(result["verified"], [{"type": "section", "number": "379"}])
        self.assertEqual(result["unverified"], [])
        self.assertTrue(result["all_verified"])

    def test_citation_to_a_section_never_retrieved_is_unverified(self):
        chunks = [_chunk("Whoever commits theft...", section="379")]
        result = verify_citations("Under Section 302, this is murder.", chunks)
        self.assertEqual(result["unverified"], [{"type": "section", "number": "302"}])
        self.assertFalse(result["all_verified"])

    def test_citation_grounded_by_chunk_text_cross_reference(self):
        # A retrieved section's own body can mention another section number -
        # that's still grounded, even though it isn't that chunk's own number.
        chunks = [_chunk("This offence is read with Section 34 of the Code.", section="149")]
        result = verify_citations("See Section 34 for common intention.", chunks)
        self.assertTrue(result["all_verified"])

    def test_article_references_are_checked_separately_from_sections(self):
        chunks = [_chunk("Equality of citizens.", article="25")]
        result = verify_citations("Article 25 guarantees equality.", chunks)
        self.assertTrue(result["all_verified"])

    def test_no_citations_in_answer_means_nothing_to_verify(self):
        result = verify_citations("This is general guidance with no citations.", [])
        self.assertEqual(result, {"verified": [], "unverified": [], "all_verified": True})


class FindUnsupportedClaimsTests(unittest.TestCase):
    def test_sentence_with_no_overlap_with_retrieved_text_is_flagged(self):
        chunks = [_chunk("Whoever commits theft shall be punished with imprisonment.")]
        answer = "Whoever commits theft shall be punished with imprisonment. Bananas are a good source of potassium."
        unsupported = find_unsupported_claims(answer, chunks)
        self.assertTrue(any("Bananas" in sentence for sentence in unsupported))

    def test_sentence_overlapping_retrieved_text_is_not_flagged(self):
        chunks = [_chunk("Whoever commits theft shall be punished with imprisonment.")]
        answer = "Whoever commits theft shall be punished with imprisonment."
        self.assertEqual(find_unsupported_claims(answer, chunks), [])

    def test_disclaimer_sentence_is_never_flagged(self):
        chunks = [_chunk("Whoever commits theft shall be punished with imprisonment.")]
        answer = "This is not a substitute for professional legal advice from a qualified lawyer."
        self.assertEqual(find_unsupported_claims(answer, chunks), [])

    def test_no_retrieved_context_means_nothing_can_be_flagged(self):
        answer = "This sentence has nothing to compare against."
        self.assertEqual(find_unsupported_claims(answer, []), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
