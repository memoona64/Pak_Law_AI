"""Extracts text from an uploaded PDF.

Same pdfplumber approach as scripts/extract.py, but reading upload bytes in
memory instead of a file on disk. PDF only, and scanned documents are not
supported: a PDF with no text layer is reported as such rather than OCR'd
(plan section 9b).
"""

import io
from pathlib import Path

import pdfplumber
import pypdf

from .errors import DocumentExtractionError

# The 10 MB upload cap (see main.py's MAX_UPLOAD_BYTES) doesn't bound page
# count on its own - a small file can still contain thousands of pages.
# Real rent agreements/employment contracts/court orders are nowhere near
# this; it exists only to fail fast on a pathological upload instead of
# tying up the request for a long time extracting page by page.
MAX_PAGES = 300


def extract_text(filename: str, data: bytes) -> str:
    """Extract text from an uploaded PDF's bytes."""
    if Path(filename).suffix.lower() != ".pdf":
        raise DocumentExtractionError("Only PDF files are supported.")

    # Checked separately from the pdfplumber extraction below: an encrypted
    # PDF fails inside pdfplumber/pdfminer with an error that looks the same
    # as "corrupted file", which tells the user nothing they can act on.
    try:
        if pypdf.PdfReader(io.BytesIO(data)).is_encrypted:
            raise DocumentExtractionError(
                "This PDF is password-protected. Please upload a version without a password."
            )
    except DocumentExtractionError:
        raise
    except Exception:
        # pypdf couldn't even open it — leave diagnosis to pdfplumber below,
        # which already has a generic "corrupted or not a valid PDF" message.
        pass

    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            if len(pdf.pages) > MAX_PAGES:
                raise DocumentExtractionError(
                    f"This PDF has too many pages ({len(pdf.pages)}). "
                    f"The limit is {MAX_PAGES} pages."
                )
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
