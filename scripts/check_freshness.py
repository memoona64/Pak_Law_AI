"""
Freshness check script.
Reads data/corpus_meta.json and reports which documents might be stale -
how long since we downloaded each one, how long since we last checked the
source for changes, and (with --recheck) whether the source has actually
changed, by comparing hashes. Never touches data/raw/ - if a source has
changed, a human decides what to do about it.
"""

import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

META_PATH = Path("data/corpus_meta.json")

# Downloaded copies go here for hashing, never to the system temp folder
# (which on this machine can default to the nearly-full C: drive).
TMP_DIR = Path("data/tmp_recheck")

FILL_ME = "FILL_ME"
STALE_AFTER_DAYS = 90

# Government sites sometimes reject requests with no browser-like User-Agent.
REQUEST_HEADERS = {"User-Agent": "Mozilla/5.0 (PakLawAI freshness checker)"}


# Loads the list of entries from corpus_meta.json.
def load_meta(path):
    if not path.exists():
        print(f"{path} does not exist. Run scripts/meta.py first.")
        sys.exit(1)
    return json.loads(path.read_text(encoding="utf-8"))


# Writes the entries list back out as readable, indented JSON.
def save_meta(path, entries):
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# Turns a stored "YYYY-MM-DD" string into a date, or None if it's missing,
# still FILL_ME, or not a real date.
def parse_date(date_str):
    if not date_str or FILL_ME in date_str:
        return None
    try:
        return date.fromisoformat(date_str)
    except ValueError:
        return None


# Days between a stored date string and today, or None if it can't be parsed.
def days_since(date_str):
    parsed = parse_date(date_str)
    if parsed is None:
        return None
    return (date.today() - parsed).days


# Prints one line of "N days ago" or "unknown" if the date is missing/bad.
def format_days(days):
    return f"{days} days ago" if days is not None else "unknown"


# Prints the plain-language freshness report for every entry. Changes nothing.
def print_freshness_report(entries):
    print(f"Freshness report - {date.today().isoformat()}\n")
    stale_count = 0
    for entry in entries:
        checked_days = days_since(entry.get("source_checked_on", ""))
        is_stale = checked_days is not None and checked_days > STALE_AFTER_DAYS
        if is_stale:
            stale_count += 1

        print(entry.get("act", "FILL_ME"))
        print(f"  downloaded_on:     {entry.get('downloaded_on')} ({format_days(days_since(entry.get('downloaded_on', '')))})")
        print(f"  source_checked_on: {entry.get('source_checked_on')} ({format_days(checked_days)})")
        print(f"  amended_up_to:     {entry.get('amended_up_to')}")
        if is_stale:
            print(f"  ** STALE - source not re-checked in over {STALE_AFTER_DAYS} days **")
        print()

    print(f"{stale_count} of {len(entries)} source(s) overdue for a recheck (>{STALE_AFTER_DAYS} days).")


# True if the downloaded bytes look like a real PDF (they start with the
# PDF file signature). A landing page comes back as HTML instead.
def looks_like_pdf(content_bytes):
    return content_bytes[:5] == b"%PDF-"


# Downloads the URL's bytes to tmp_path (on D:) and returns them. Spaces and
# other unsafe characters in the URL (e.g. a filename with a space in it) are
# percent-encoded first, since urllib refuses to send them as-is.
def download_to_temp(url, tmp_path):
    safe_url = urllib.parse.quote(url, safe=":/?&=")
    request = urllib.request.Request(safe_url, headers=REQUEST_HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        content_bytes = response.read()
    tmp_path.write_bytes(content_bytes)
    return content_bytes


# Re-downloads one entry's source and compares its hash against the stored
# one. Returns "unchanged", "changed", "skipped", or "error" so main() knows
# whether corpus_meta.json needs saving.
def recheck_entry(entry, tmp_dir):
    short_code = entry["short_code"]
    url = entry.get("source_url", "")
    tmp_path = tmp_dir / f"{short_code}_recheck.pdf"

    if not url or FILL_ME in url:
        print(f"{short_code}: SKIPPED - no source_url recorded yet")
        return "skipped"

    try:
        content_bytes = download_to_temp(url, tmp_path)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as error:
        print(f"{short_code}: ERROR - could not download ({error})")
        return "error"

    if not looks_like_pdf(content_bytes):
        print(f"{short_code}: SKIPPED - source_url returned something other than a PDF")
        print(f"    (this is a landing page, not a direct PDF link - find the real PDF URL by hand)")
        tmp_path.unlink(missing_ok=True)
        return "skipped"

    new_hash = hashlib.sha256(content_bytes).hexdigest()
    old_hash = entry.get("source_sha256", "")

    if new_hash == old_hash:
        print(f"{short_code}: UNCHANGED - hash matches, source_checked_on updated to today")
        entry["source_checked_on"] = date.today().isoformat()
        tmp_path.unlink(missing_ok=True)
        return "unchanged"

    print(f"{short_code}: *** CHANGED *** stored hash does not match the downloaded file")
    print(f"    stored hash:     {old_hash}")
    print(f"    downloaded hash: {new_hash}")
    print(f"    downloaded copy kept at: {tmp_path}")
    print( "    Nothing in corpus_meta.json or data/raw/ was changed. A human needs to:")
    print(f"      1. Compare {tmp_path} against data/raw/{short_code}.pdf")
    print( "      2. Decide if this is a real legal amendment or just a reformatted reissue")
    print(f"      3. If it's real: replace data/raw/{short_code}.pdf by hand, then re-run")
    print( "         extract.py, clean.py, and meta.py for this document")
    print( "      4. Update amended_up_to, source_sha256, and source_checked_on by hand")
    return "changed"


# Runs the freshness report (default) and, with --recheck, re-downloads and
# hashes every source, saving corpus_meta.json only for unchanged entries.
def main():
    recheck_flag = "--recheck" in sys.argv[1:]

    entries = load_meta(META_PATH)
    print_freshness_report(entries)

    if not recheck_flag:
        return

    print("\n--- Re-checking sources against corpus_meta.json ---\n")
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    any_unchanged = False
    for entry in entries:
        result = recheck_entry(entry, TMP_DIR)
        if result == "unchanged":
            any_unchanged = True
        print()

    if any_unchanged:
        save_meta(META_PATH, entries)
        print(f"Saved updated source_checked_on date(s) to {META_PATH}")


if __name__ == "__main__":
    main()
