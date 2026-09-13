"""Regression check: generate_answer() must prepend an explicit language
directive matching the detected language of the query, not just rely on the
system prompt's general instruction. Mocks the Gemini call (_generate)."""

import unittest

from fastapi_app import generation


def _chunk():
    return {
        "id": "mflo-8",
        "text": "Where the right to divorce has been duly delegated to the wife...",
        "metadata": {"act": "MFLO", "section": "8", "title": "Dissolution of marriage otherwise than by talaq", "short_code": "mflo"},
    }


class GenerateAnswerLanguageDirectiveTests(unittest.TestCase):
    def setUp(self):
        self.original_generate = generation._generate
        self.captured_prompt = None

        def fake_generate(prompt, config):
            self.captured_prompt = prompt
            return "some answer"

        generation._generate = fake_generate

    def tearDown(self):
        generation._generate = self.original_generate

    def test_roman_urdu_query_gets_a_roman_urdu_directive(self):
        generation.generate_answer("mujhe khula kaise mil sakta hai", [_chunk()])
        self.assertIn("Roman Urdu", self.captured_prompt)
        self.assertIn("MUST also be in Roman Urdu", self.captured_prompt)

    def test_urdu_script_query_gets_an_urdu_script_directive(self):
        generation.generate_answer("خلع کیسے حاصل کریں؟", [_chunk()])
        self.assertIn("Urdu script", self.captured_prompt)

    def test_english_query_gets_an_english_directive(self):
        generation.generate_answer("How can a wife get khula?", [_chunk()])
        self.assertIn("MUST be in English", self.captured_prompt)


if __name__ == "__main__":
    unittest.main(verbosity=2)
