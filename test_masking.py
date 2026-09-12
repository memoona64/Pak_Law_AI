"""Regression checks for fastapi_app/masking.py - CNIC, phone, and email
pattern masking. No network or models involved, so this always runs fast."""

import unittest

from fastapi_app.masking import mask_text


class MaskingTests(unittest.TestCase):
    def test_masks_cnic_with_dashes_and_keeps_last_two_digits(self):
        result = mask_text("My CNIC is 42101-1234567-1.")
        self.assertIn("CNIC-****-*****71.", result.text)
        self.assertEqual(result.counts["cnic"], 1)

    def test_masks_cnic_with_no_dashes(self):
        result = mask_text("CNIC: 4210112345671")
        self.assertNotIn("4210112345671", result.text)
        self.assertEqual(result.counts["cnic"], 1)

    def test_masks_pakistani_mobile_numbers_in_both_formats(self):
        result = mask_text("Call 0300-1234567 or +92 300 1234567.")
        self.assertNotIn("0300-1234567", result.text)
        self.assertNotIn("+92 300 1234567", result.text)
        self.assertEqual(result.counts["phone"], 2)

    def test_masks_email_and_keeps_first_letter_and_domain(self):
        result = mask_text("Contact me at ali.khan@example.com")
        self.assertIn("a***@example.com", result.text)
        self.assertEqual(result.counts["email"], 1)

    def test_leaves_ordinary_text_and_names_untouched(self):
        text = "Ali Khan lives on Main Boulevard, Lahore."
        result = mask_text(text)
        self.assertEqual(result.text, text)
        self.assertEqual(result.counts, {"cnic": 0, "phone": 0, "email": 0})

    def test_counts_multiple_categories_in_one_pass(self):
        result = mask_text(
            "CNIC 42101-1234567-1, phone 0300-1234567, email a@b.com"
        )
        self.assertEqual(result.counts, {"cnic": 1, "phone": 1, "email": 1})


if __name__ == "__main__":
    unittest.main(verbosity=2)
