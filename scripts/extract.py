"""
Extraction script.
Reads one PDF, page by page, and saves the raw text to a .txt file, with a
<<<PAGE>>> marker between pages so the next script can find page boundaries.
"""

import sys
from pathlib import Path

import pdfplumber

PAGE_MARKER = "<<<PAGE>>>"


# Reads every page of the PDF in order and returns a list of page texts.
def extract_pages(pdf_path):
    page_texts = []
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for page_number, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            page_texts.append(text)
            if page_number % 25 == 0:
                print(f"  ...processed {page_number}/{total_pages} pages")
    return page_texts


# Joins the page texts with the page marker and writes them to a UTF-8 file.
def save_pages(page_texts, output_path):
    joined = f"\n{PAGE_MARKER}\n".join(page_texts)
    output_path.write_text(joined, encoding="utf-8")


# Prints how many pages were processed, total characters, and empty pages.
def print_summary(page_texts):
    total_pages = len(page_texts)
    total_chars = sum(len(text) for text in page_texts)
    empty_pages = sum(1 for text in page_texts if len(text) == 0)
    print()
    print(f"Pages processed: {total_pages}")
    print(f"Total characters written: {total_chars}")
    print(f"Pages with no text at all: {empty_pages}")


# Reads the input/output paths from the command line and runs extraction.
def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts\\extract.py <input.pdf> <output.txt>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"Input file not found: {input_path}")
        sys.exit(1)

    print(f"Reading {input_path.name} ...")
    page_texts = extract_pages(input_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    save_pages(page_texts, output_path)

    print(f"Saved to {output_path}")
    print_summary(page_texts)


if __name__ == "__main__":
    main()
