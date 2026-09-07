"""Extracts text from an uploaded PDF.

Same pdfplumber approach as scripts/extract.py, but reading upload bytes in
memory instead of a file on disk. PDF only, and scanned documents are not
supported: a PDF with no text layer is reported as such rather than OCR'd
(plan section 9b).
"""

import io
from pathlib import Path

import pdfplumber

from .errors import DocumentExtractionError


def extract_text(filename: str, data: bytes) -> str:
    """Extract text from an uploaded PDF's bytes."""
    if Path(filename).suffix.lower() != ".pdf":
        raise DocumentExtractionError("Only PDF files are supported.")

    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
    except DocumentExtractionError:
        raise
    except Exception as exc:
        # A corrupt/malformed file (or a non-PDF renamed to .pdf) can make
        # pdfplumber raise its own internal errors rather than just returning
        # no text — this is an upload endpoint, so untrusted files are the
        # normal case, not the exception.
        raise DocumentExtractionError(
            "This file could not be read as a PDF. It may be corrupted or not a valid PDF."
        ) from exc

    text = "\n".join(pages).strip()
    if not text:
        raise DocumentExtractionError(
            "No text could be read from this PDF. Scanned documents are not supported — "
            "please upload a PDF with selectable text."
        )
    return text
