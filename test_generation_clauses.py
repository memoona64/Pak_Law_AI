"""Regression check for fastapi_app/generation.py's analyze_clauses(): a real
document can restart clause numbering (e.g. a Schedule/Annexure re-using
"1.", "2." ...), so matching Gemini's response back to the right clause must
not rely on that possibly-duplicated document label. Mocks the Gemini call
(_generate) so this never touches the network."""

import json
import unittest

from fastapi_app import generation


class AnalyzeClausesDuplicateNumberTests(unittest.TestCase):
    def setUp(self):
        self.original_generate = generation._generate

    def tearDown(self):
        generation._generate = self.original_generate

    def test_two_items_with_the_same_document_clause_number_get_distinct_results(self):
        # Simulates a main-body "Clause 1" and a Schedule "Clause 1" landing
        # in the same batch - main.py assigns both clause_number "1" straight
        # from the document, with no de-duplication.
        items = [
            {"clause_number": "1", "text": "Main body clause one.", "chunks": []},
            {"clause_number": "1", "text": "Schedule clause one.", "chunks": []},
        ]

        # The mock stands in for Gemini: it must respond keyed by BATCH
        # POSITION ("1", "2"), not by the document's clause_number, matching
        # what analyze_clauses now asks for in the prompt.
        def fake_generate(prompt, config):
            self.assertIn("CLAUSE 1:", prompt)
            self.assertIn("CLAUSE 2:", prompt)
            return json.dumps([
                {"clause_number": "1", "risk": "ok", "note": "Main body clause is standard.", "obligation": None},
                {"clause_number": "2", "risk": "flag", "note": "Schedule clause conflicts with statute.", "obligation": None},
            ])

        generation._generate = fake_generate
        results = generation.analyze_clauses(items)

        self.assertEqual(results[0]["risk"], "ok")
        self.assertEqual(results[0]["note"], "Main body clause is standard.")
        self.assertEqual(results[1]["risk"], "flag")
        self.assertEqual(results[1]["note"], "Schedule clause conflicts with statute.")

    def test_missing_entry_for_one_position_falls_back_to_unparsed_for_that_item_only(self):
        items = [
            {"clause_number": "1", "text": "Clause one.", "chunks": []},
            {"clause_number": "1", "text": "Duplicate-numbered clause.", "chunks": []},
        ]

        def fake_generate(prompt, config):
            # Model only returned one result instead of two.
            return json.dumps([
                {"clause_number": "1", "risk": "ok", "note": "Fine.", "obligation": None},
            ])

        generation._generate = fake_generate
        results = generation.analyze_clauses(items)

        self.assertEqual(results[0]["risk"], "ok")
        self.assertEqual(results[1]["risk"], "warn")  # _unparsed_clause fallback


if __name__ == "__main__":
    unittest.main(verbosity=2)
