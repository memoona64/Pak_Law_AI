"""Regression checks for fastapi_app/query_normalizer.py's corpus-gap
bridging: "khula" is a real, correct legal term that MFLO's actual text
never uses (it just says "dissolve the marriage otherwise than by talaq"),
so retrieval found nothing for real khula questions until the query was
also enriched with the corpus's actual wording. No network — LLM calls are
mocked or simply fail (no API keys set in this test process)."""

import os
import unittest

from fastapi_app import query_normalizer


class KeywordBridgeTests(unittest.TestCase):
    def setUp(self):
        # Ensure no real API key makes this test hit the network.
        self.original_env = {
            key: os.environ.pop(key, None)
            for key in ("GEMINI_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY")
        }

    def tearDown(self):
        for key, value in self.original_env.items():
            if value is not None:
                os.environ[key] = value

    def test_khula_gets_the_corpus_bridging_terms_appended(self):
        normalized, used_llm = query_normalizer.normalize_query("What is khula?")
        self.assertFalse(used_llm)
        self.assertIn("What is khula?", normalized)  # original wording preserved
        self.assertIn("dissolve the marriage otherwise than by talaq".split()[0], normalized.lower())
        self.assertIn("muslim family laws ordinance", normalized.lower())

    def test_bridge_fires_regardless_of_surrounding_phrasing(self):
        for query in ["khula", "khula case procedure", "how can a wife get khula in Pakistan?"]:
            normalized, _ = query_normalizer.normalize_query(query)
            self.assertIn("Muslim Family Laws Ordinance", normalized)

    def test_bridge_does_not_fire_for_unrelated_queries(self):
        normalized, _ = query_normalizer.normalize_query("What is Section 302 PPC?")
        self.assertNotIn("Muslim Family Laws Ordinance", normalized)

    def test_bridge_does_not_match_khula_as_a_substring_of_another_word(self):
        # Word-boundary check: "khulafa" (caliphs) contains "khula" as a
        # substring but is a completely unrelated word.
        normalized, _ = query_normalizer.normalize_query("who were the Khulafa e Raashideen")
        self.assertNotIn("Muslim Family Laws Ordinance", normalized)

    def test_bridge_still_applies_on_top_of_an_exact_fallback_dict_match(self):
        # "khula ka procedure" already matches an existing FALLBACK_DICT
        # entry - the bridge should still be appended on top of that.
        normalized, _ = query_normalizer.normalize_query("khula ka procedure")
        self.assertIn("Muslim Family Laws Ordinance", normalized)


if __name__ == "__main__":
    unittest.main(verbosity=2)
