"""
Triage script.
Checks every PDF in data/raw/ to see whether it has real, selectable text
or is just a scanned image (which would need OCR before we could use it).
"""

import pdfplumber
from pathlib import Path

RAW_DIR = Path("data/raw")


# Picks 5 page numbers spread through the document (around 10%, 30%, 50%,
# 70%, 90% of the way through) instead of just the first 5 pages.
def pick_sample_pages(total_pages):
    fractions = [0.10, 0.30, 0.50, 0.70, 0.90]
    indexes = []
    for fraction in fractions:
        index = int(total_pages * fraction)
        index = min(index, total_pages - 1)  # never step past the last page
        if index not in indexes:
            indexes.append(index)
    return indexes


# Opens one PDF, measures its text and images, and returns a dict of results.
def triage_one_pdf(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            if total_pages == 0:
                return {"file": pdf_path.name, "error": "PDF has 0 pages"}

            # Count every embedded image across the whole document.
            image_count = 0
            for page in pdf.pages:
                image_count += len(page.images)

            # Measure text only on the sampled pages.
            sample_pages = pick_sample_pages(total_pages)
            char_counts = []
            for index in sample_pages:
                text = pdf.pages[index].extract_text() or ""
                char_counts.append(len(text))
            average_chars = sum(char_counts) / len(char_counts)

            if average_chars < 100:
                verdict = "SCANNED - needs OCR"
            elif average_chars <= 500:
                verdict = "PARTIAL - inspect manually"
            else:
                verdict = "OK - has text layer"

            size_mb = pdf_path.stat().st_size / (1024 * 1024)

            return {
                "file": pdf_path.name,
                "pages": total_pages,
                "size_mb": size_mb,
                "avg_chars": average_chars,
                "images": image_count,
                "verdict": verdict,
            }
    except Exception as error:
        return {"file": pdf_path.name, "error": str(error)}


# Prints one aligned table with a row per PDF.
def print_table(results):
    header = (
        f'{"File":<25}{"Pages":>7}{"Size(MB)":>10}'
        f'{"AvgChars":>10}{"Images":>8}  Verdict'
    )
    print(header)
    print("-" * len(header))
    for result in results:
        if "error" in result:
            print(f'{result["file"]:<25}  ERROR: {result["error"]}')
        else:
            print(
                f'{result["file"]:<25}'
                f'{result["pages"]:>7}'
                f'{result["size_mb"]:>10.1f}'
                f'{result["avg_chars"]:>10.0f}'
                f'{result["images"]:>8}'
                f'  {result["verdict"]}'
            )


# Runs triage on every PDF found in data/raw/ and prints the results.
def main():
    pdf_files = sorted(RAW_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {RAW_DIR}")
        return

    results = []
    for pdf_path in pdf_files:
        print(f"Checking {pdf_path.name} ...")
        results.append(triage_one_pdf(pdf_path))

    print()
    print_table(results)


if __name__ == "__main__":
    main()
