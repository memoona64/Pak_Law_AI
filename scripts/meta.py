"""
Metadata script.
Builds data/corpus_meta.json, one entry per PDF in data/raw/, recording
where each law came from and how fresh it is. The chunker and any future
"has this law changed?" check both read this file.

Run with no flags to create/update the file: computed fields (short_code,
source_sha256, pages) are always filled in; fields only a human can answer
are set to "FILL_ME" on brand new entries and never touched on existing ones.

Run with --check to list every field still set to "FILL_ME".
"""

import hashlib
import json
import sys
from pathlib import Path

import pdfplumber

RAW_DIR = Path("data/raw")
META_PATH = Path("data/corpus_meta.json")

FILL_ME = "FILL_ME"
CORPUS_VERSION = "v1"
EXTRACTION_METHOD = "text_layer"


# Turns "ppc.pdf" into "ppc" - the short code used to key each entry.
def derive_short_code(pdf_path):
    return pdf_path.stem.lower()


# Reads the whole PDF and returns its SHA-256 hash as a hex string.
def compute_sha256(pdf_path):
    file_bytes = pdf_path.read_bytes()
    return hashlib.sha256(file_bytes).hexdigest()


# Opens the PDF just to count its pages.
def count_pages(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        return len(pdf.pages)


# Builds a brand new entry: computed fields filled in for real, every
# hand-filled field set to FILL_ME so it's obvious what's still missing.
def build_new_entry(pdf_path):
    return {
        "short_code": derive_short_code(pdf_path),
        "act": FILL_ME,
        "jurisdiction": FILL_ME,
        "province": FILL_ME,
        "amended_up_to": FILL_ME,
        "source_url": FILL_ME,
        "downloaded_on": FILL_ME,
        "source_checked_on": FILL_ME,
        "source_sha256": compute_sha256(pdf_path),
        "corpus_version": CORPUS_VERSION,
        "pages": count_pages(pdf_path),
        "extraction_method": EXTRACTION_METHOD,
        "quality_notes": FILL_ME,
        "known_gaps": FILL_ME,
    }


# Loads the existing entries list, or an empty list if the file doesn't exist yet.
def load_existing_entries(path):
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


# Writes the entries list back out as readable, indented JSON.
def save_entries(path, entries):
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# For each PDF found: adds a fresh FILL_ME entry if it's new, or recomputes
# only pages/source_sha256 if it's already in the file. Any existing entry
# whose PDF is no longer in data/raw/ is kept as-is rather than dropped.
def build_or_update_entries(pdf_paths, existing_entries):
    existing_by_code = {entry["short_code"]: entry for entry in existing_entries}
    covered_codes = set()
    updated_entries = []

    for pdf_path in pdf_paths:
        short_code = derive_short_code(pdf_path)
        covered_codes.add(short_code)
        if short_code in existing_by_code:
            entry = existing_by_code[short_code]
            entry["pages"] = count_pages(pdf_path)
            entry["source_sha256"] = compute_sha256(pdf_path)
            print(f"Updated pages/hash for existing entry: {short_code}")
        else:
            entry = build_new_entry(pdf_path)
            print(f"Added new entry: {short_code}")
        updated_entries.append(entry)

    for short_code, entry in existing_by_code.items():
        if short_code not in covered_codes:
            updated_entries.append(entry)
            print(f"Kept existing entry with no matching PDF in data/raw/: {short_code}")

    return updated_entries


# Finds every (short_code, field) pair still marked FILL_ME - matches a
# value that's exactly "FILL_ME" or one that still contains it as a note
# to self (e.g. "FILL_ME - pending Second Schedule decision").
def find_fill_me_fields(entries):
    missing = []
    for entry in entries:
        short_code = entry.get("short_code", "UNKNOWN")
        for field, value in entry.items():
            if isinstance(value, str) and FILL_ME in value:
                missing.append((short_code, field))
    return missing


# Prints the --check report.
def print_check_report(missing):
    if not missing:
        print("No FILL_ME values found. Every entry is complete.")
        return
    print(f"{len(missing)} field(s) still need to be filled in:\n")
    for short_code, field in missing:
        print(f"  {short_code}: {field}")


# Runs --check (report only) or the default build/update, based on the
# command line.
def main():
    check_flag = "--check" in sys.argv[1:]

    if check_flag:
        if not META_PATH.exists():
            print(f"{META_PATH} does not exist yet. Run the script without --check first.")
            sys.exit(1)
        entries = load_existing_entries(META_PATH)
        print_check_report(find_fill_me_fields(entries))
        return

    pdf_paths = sorted(RAW_DIR.glob("*.pdf"))
    if not pdf_paths:
        print(f"No PDF files found in {RAW_DIR}")
        return

    existing_entries = load_existing_entries(META_PATH)
    updated_entries = build_or_update_entries(pdf_paths, existing_entries)
    save_entries(META_PATH, updated_entries)
    print(f"\nSaved {len(updated_entries)} entries to {META_PATH}")


if __name__ == "__main__":
    main()
