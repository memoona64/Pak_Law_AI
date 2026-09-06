"""Extracts text from an uploaded document: PDF, DOCX, or a scanned image.

Unlike scripts/extract.py (which extracts from known-good corpus PDFs on
disk to a file), this takes raw upload bytes and returns text in memory,
dispatching by file extension and falling back to OCR for scanned PDFs.
"""

import io
from pathlib import Path

import pdfplumber

from .errors import DocumentExtractionError

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".jpg", ".jpeg", ".png"}


def _extract_pdf(data: bytes) -> str:
    pages = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    text = "\n".join(pages).strip()
    # An empty text layer on every page means this is almost certainly a
    # scanned PDF, not an empty document — fall back to OCR.
    return text if text else _ocr_pdf(data)


def _ocr_pdf(data: bytes) -> str:
    try:
        import pymupdf  # renders pages to images without a poppler dependency.
        import pytesseract
        from PIL import Image
    except ImportError as exc:
        raise DocumentExtractionError(
            "This PDF has no extractable text layer (likely scanned), and OCR support is not installed."
        ) from exc

    try:
        pages_text = []
        with pymupdf.open(stream=data, filetype="pdf") as pdf:
            for page in pdf:
                pixmap = page.get_pixmap(dpi=200)
                image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                pages_text.append(pytesseract.image_to_string(image))
        return "\n".join(pages_text).strip()
    except pytesseract.TesseractNotFoundError as exc:
        raise DocumentExtractionError(
            "This PDF has no extractable text layer, and the Tesseract OCR engine is not installed on this server."
        ) from exc


def _extract_docx(data: bytes) -> str:
    try:
        import docx
    except ImportError as exc:
        raise DocumentExtractionError("DOCX support is not installed (missing python-docx).") from exc

    document = docx.Document(io.BytesIO(data))
    return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()


def _extract_image(data: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError as exc:
        raise DocumentExtractionError("Image OCR support is not installed (missing pillow or pytesseract).") from exc

    try:
        image = Image.open(io.BytesIO(data))
        return pytesseract.image_to_string(image).strip()
    except pytesseract.TesseractNotFoundError as exc:
        raise DocumentExtractionError(
            "The Tesseract OCR engine is not installed on this server."
        ) from exc


def extract_text(filename: str, data: bytes) -> str:
    """Extract text from an uploaded document's bytes, based on its file extension."""
    extension = Path(filename).suffix.lower()
    if extension == ".pdf":
        text = _extract_pdf(data)
    elif extension == ".docx":
        text = _extract_docx(data)
    elif extension in {".jpg", ".jpeg", ".png"}:
        text = _extract_image(data)
    else:
        raise DocumentExtractionError(
            f"Unsupported file type '{extension}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )

    if not text:
        raise DocumentExtractionError("No text could be extracted from this document.")
    return text
