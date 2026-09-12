"""Regression checks for fastapi_app/document_extraction.py. Builds tiny PDFs
in memory with pypdf/pdfplumber's own reportlab-free primitives so this never
needs a real file on disk or any network access."""

import io
import unittest

import pypdf

from fastapi_app.document_extraction import MAX_PAGES, extract_text
from fastapi_app.errors import DocumentExtractionError


def _blank_pdf_bytes(num_pages=1):
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


class ExtractTextTests(unittest.TestCase):
    def test_rejects_non_pdf_filenames_before_touching_the_bytes(self):
        with self.assertRaises(DocumentExtractionError) as ctx:
            extract_text("notice.docx", b"whatever")
        self.assertIn("Only PDF files", str(ctx.exception))

    def test_password_protected_pdf_gives_a_specific_actionable_message(self):
        writer = pypdf.PdfWriter()
        writer.add_blank_page(width=200, height=200)
        writer.encrypt(user_password="secret")
        buffer = io.BytesIO()
        writer.write(buffer)

        with self.assertRaises(DocumentExtractionError) as ctx:
            extract_text("agreement.pdf", buffer.getvalue())
        self.assertIn("password-protected", str(ctx.exception))

    def test_pdf_with_no_extractable_text_is_reported_as_such(self):
        # A blank page has no text layer at all.
        with self.assertRaises(DocumentExtractionError) as ctx:
            extract_text("blank.pdf", _blank_pdf_bytes())
        self.assertIn("No text could be read", str(ctx.exception))

    def test_pdf_exceeding_the_page_limit_is_rejected_with_the_actual_count(self):
        data = _blank_pdf_bytes(num_pages=MAX_PAGES + 1)
        with self.assertRaises(DocumentExtractionError) as ctx:
            extract_text("huge.pdf", data)
        self.assertIn(str(MAX_PAGES + 1), str(ctx.exception))
        self.assertIn("too many pages", str(ctx.exception))

    def test_corrupted_bytes_are_reported_as_unreadable_not_a_raw_traceback(self):
        with self.assertRaises(DocumentExtractionError) as ctx:
            extract_text("fake.pdf", b"this is not a real pdf file at all")
        self.assertIn("could not be read as a PDF", str(ctx.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
