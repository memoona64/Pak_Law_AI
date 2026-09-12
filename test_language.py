"""Regression checks for fastapi_app/language.py - the language guess that
tells generation.py which language/script to answer in. No network."""

import unittest

from fastapi_app.language import detect_language, language_directive


class DetectLanguageTests(unittest.TestCase):
    def test_urdu_script_is_detected_regardless_of_latin_characters_mixed_in(self):
        self.assertEqual(detect_language("FIR کیسے درج کروائیں؟"), "ur")

    def test_roman_urdu_is_detected_from_common_function_words(self):
        self.assertEqual(detect_language("police FIR darj nahi kar rahi hai"), "roman_ur")
        self.assertEqual(detect_language("mujhe khula kaise mil sakta hai"), "roman_ur")

    def test_plain_english_is_detected_as_english(self):
        self.assertEqual(detect_language("What does Section 154 CrPC say about FIRs?"), "en")

    def test_empty_or_missing_text_defaults_to_english(self):
        self.assertEqual(detect_language(""), "en")
        self.assertEqual(detect_language(None), "en")

    def test_a_single_incidental_roman_urdu_like_word_does_not_flip_english(self):
        self.assertEqual(detect_language("Is there a case called State ka versus someone"), "en")


class LanguageDirectiveTests(unittest.TestCase):
    def test_urdu_directive_explicitly_forbids_switching_language(self):
        directive = language_directive("FIR کیسے درج کروائیں؟")
        self.assertIn("Urdu script", directive)
        self.assertIn("MUST", directive)

    def test_roman_urdu_directive_explicitly_names_roman_urdu(self):
        directive = language_directive("mera FIR darj nahi ho raha")
        self.assertIn("Roman Urdu", directive)

    def test_english_directive_is_returned_for_english_text(self):
        directive = language_directive("What is Section 302?")
        self.assertIn("English", directive)


if __name__ == "__main__":
    unittest.main(verbosity=2)
