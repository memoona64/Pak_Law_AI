"""
Cleaning script.
Reads one raw .txt file (produced by extract.py) and, in two steps, turns it
into clean text for the chunker: removes page numbers, running headers, and
blank lines, and normalises whitespace and hyphenation (words rejoined across
line breaks).

TOC and footnote removal are NOT implemented yet - left out on purpose,
pending a decision on how to handle them. See notes/decisions.md.

Step 1 (default): look for repeating header/footer lines and print them as
candidates. Before comparing, each line is normalised (a leading or trailing
standalone page number stripped, extra whitespace collapsed) so a header like
"CONSTITUTION OF PAKISTAN 11" and "12 CONSTITUTION OF PAKISTAN" are recognised
as the same repeating line even though the page number glued to it changes
every page. Detection only - changes nothing.

Step 2 (--apply): remove the lines you approved, plus page numbers and blank
lines, then tidy up spacing and hyphenated line breaks. Writes the result to
data/clean/<name>.txt.

Step 2 (--dry-run): lists every line the page-number rule alone would remove
- page index, the line itself, and the lines immediately before/after it for
context. Prints only, writes nothing.
"""

import re
import sys
from collections import Counter
from pathlib import Path

PAGE_MARKER = "<<<PAGE>>>"

# A line counts as a "candidate" if it appears on this fraction of pages or more.
CANDIDATE_THRESHOLD = 0.5

# Paste lines you've approved from the Step 1 candidate list here (exact text,
# no leading/trailing spaces), then re-run with --apply.
JUNK_LINES = [
    "CONSTITUTION OF PAKISTAN",
]

# Matches a line that is only digits, e.g. a lone page number: "245"
PAGE_NUMBER_ONLY_PATTERN = re.compile(r'^\d+$')

# Matches a dash-wrapped page number, e.g. "- 245 -"
DASH_PAGE_NUMBER_PATTERN = re.compile(r'^-\s*\d+\s*-$')

# Matches "Page 105 of 179" style footers, case-insensitive.
PAGE_OF_PATTERN = re.compile(r'^Page\s+\d+\s+of\s+\d+$', re.IGNORECASE)

# Matches a line ending in a lowercase letter then a hyphen, e.g. "pun-"
# — the shape a word takes when it gets broken across a line end.
HYPHEN_BREAK_PATTERN = re.compile(r'[a-z]-$')

# Matches a standalone number token at the very start of a line, e.g. the
# "12" in "12 CONSTITUTION OF PAKISTAN" (used for Step 1 normalisation only).
LEADING_NUMBER_TOKEN_PATTERN = re.compile(r'^\d+\s+')

# Matches a standalone number token at the very end of a line, e.g. the "11"
# in "CONSTITUTION OF PAKISTAN 11" (used for Step 1 normalisation only).
TRAILING_NUMBER_TOKEN_PATTERN = re.compile(r'\s+\d+$')


# Reads the raw file and splits it into a list of page strings. Each page
# also has the stray "\n" left over from how extract.py joined pages
# stripped off, so line 0 of a page is real page content, not a leftover
# blank line from the marker join.
def read_pages(file_path):
    text = file_path.read_text(encoding="utf-8")
    raw_pages = text.split(PAGE_MARKER)
    return [page.strip("\n") for page in raw_pages]


# Strips one leading and/or one trailing standalone number token (e.g. a
# glued-on page number) and collapses whitespace, so lines that only differ
# by a page number compare as equal. The original line is never modified —
# this is only used to decide whether two lines are "the same" for counting.
def normalize_line(line):
    text = line.strip()
    text = LEADING_NUMBER_TOKEN_PATTERN.sub("", text)
    text = TRAILING_NUMBER_TOKEN_PATTERN.sub("", text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


# Looks at only the first 2 and last 2 lines of one page and returns the
# non-blank original lines (as typed on the page, duplicates possible if a
# short page's first/last 2 lines overlap).
def edge_lines_of_page(page):
    lines = page.split("\n")
    edges = lines[:2] + lines[-2:]
    return [line.strip() for line in edges if line.strip()]


# Counts how many pages each *normalised* edge line appears on (once per
# page), and keeps a few original lines per normalised form as examples.
# Returns the normalised forms that clear CANDIDATE_THRESHOLD, most common
# first, as (normalized_form, count, example_original_lines) tuples.
def find_junk_candidates(pages):
    counts = Counter()
    examples = {}
    for page in pages:
        originals = edge_lines_of_page(page)
        seen_this_page = set()
        for original in originals:
            normalized = normalize_line(original)
            if not normalized:
                continue
            if normalized not in seen_this_page:
                counts[normalized] += 1
                seen_this_page.add(normalized)
            examples.setdefault(normalized, [])
            if original not in examples[normalized]:
                examples[normalized].append(original)

    total_pages = len(pages)
    candidates = [
        (normalized, count, examples[normalized][:3])
        for normalized, count in counts.items()
        if count / total_pages >= CANDIDATE_THRESHOLD
    ]
    candidates.sort(key=lambda item: item[1], reverse=True)
    return candidates


# Prints the candidate list: normalised form, count, and a couple of the
# original lines it matched. Changes nothing.
def print_candidates(candidates, total_pages):
    print(f"Pages: {total_pages}")
    print(f"Candidates appearing on {int(CANDIDATE_THRESHOLD * 100)}% or more of pages")
    print("(compared after stripping a leading/trailing standalone number):\n")
    if not candidates:
        print("  (none found)")
        return
    for normalized, count, example_lines in candidates:
        percent = count / total_pages * 100
        print(f'  {count:>4}/{total_pages} pages ({percent:5.1f}%): "{normalized}"')
        for example in example_lines:
            print(f'      e.g. "{example}"')


# Decides what a single line is: real content to keep, or one of the junk
# categories to drop. Approved-junk matching uses the same normalisation as
# Step 1 detection, so a line is dropped on every page it appears on, not
# just the pages where no page number happened to be glued to it.
#
# A bare number ("245", with nothing else on the line) is genuinely a page
# number only near the edges of a page - elsewhere it's usually a footnote
# marker or a table-cell figure, so it's only removed when is_edge_line is
# True. "Page N of M" and "- N -" are unambiguous and match anywhere.
def classify_line(stripped_line, is_edge_line):
    if stripped_line == "":
        return "empty"
    if normalize_line(stripped_line) in JUNK_LINES:
        return "approved_junk"
    if DASH_PAGE_NUMBER_PATTERN.match(stripped_line):
        return "page_number"
    if PAGE_OF_PATTERN.match(stripped_line):
        return "page_number"
    if is_edge_line and PAGE_NUMBER_ONLY_PATTERN.match(stripped_line):
        return "page_number"
    return "keep"


# Finds every line the page-number rule alone would remove, with its page
# index and the raw lines immediately before/after it, for --dry-run.
def find_page_number_removals(pages):
    removals = []
    for page_index, page in enumerate(pages):
        lines = page.split("\n")
        for line_index, line in enumerate(lines):
            is_edge_line = line_index < 2 or line_index >= len(lines) - 2
            if classify_line(lines[line_index].strip(), is_edge_line) != "page_number":
                continue
            before = lines[line_index - 1] if line_index > 0 else None
            after = lines[line_index + 1] if line_index + 1 < len(lines) else None
            removals.append((page_index, lines[line_index], before, after))
    return removals


# Prints the --dry-run report. Changes nothing.
def print_page_number_removals(removals):
    print(f"Page-number rule would remove {len(removals)} lines:\n")
    for page_index, line, before, after in removals:
        before_text = repr(before) if before is not None else "(start of page)"
        after_text = repr(after) if after is not None else "(end of page)"
        print(f"Page {page_index}:")
        print(f"  before: {before_text}")
        print(f"  remove: {line!r}")
        print(f"  after:  {after_text}")
        print()


# Walks a page's lines, joining any line that ends mid-word (a lowercase
# letter then a hyphen) onto the start of the next line.
def rejoin_hyphenated_words(lines):
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped_right = line.rstrip()
        has_next = i + 1 < len(lines)
        next_start = lines[i + 1].lstrip()[:1] if has_next else ""
        if has_next and HYPHEN_BREAK_PATTERN.search(stripped_right) and next_start.islower():
            merged = stripped_right[:-1] + lines[i + 1].lstrip()
            result.append(merged)
            i += 2
        else:
            result.append(line)
            i += 1
    return result


# Collapses runs of 2+ spaces in one line down to a single space.
def collapse_spaces(line):
    return re.sub(r' {2,}', ' ', line)


# Cleans one page: drops junk/page-number/blank lines, rejoins hyphenated
# words, collapses extra spaces. Returns counts of what was dropped and why,
# plus (original, normalised) pairs for every approved-junk line removed.
def clean_page(page):
    stats = Counter()
    kept_lines = []
    junk_removals = []
    lines = page.split("\n")
    for line_index, line in enumerate(lines):
        stripped = line.strip()
        is_edge_line = line_index < 2 or line_index >= len(lines) - 2
        category = classify_line(stripped, is_edge_line)
        stats[category] += 1
        if category == "keep":
            kept_lines.append(line)
        elif category == "approved_junk":
            junk_removals.append((stripped, normalize_line(stripped)))

    kept_lines = rejoin_hyphenated_words(kept_lines)
    kept_lines = [collapse_spaces(line) for line in kept_lines]
    return "\n".join(kept_lines), stats, junk_removals


# Cleans every page, joins them back into one document, and collapses any
# 3+ blank-line runs left behind where whole pages had nothing kept
# (e.g. the Constitution's blank separator pages).
def clean_document(pages):
    cleaned_pages = []
    total_stats = Counter()
    all_junk_removals = []
    for page in pages:
        cleaned_page, stats, junk_removals = clean_page(page)
        cleaned_pages.append(cleaned_page)
        total_stats.update(stats)
        all_junk_removals.extend(junk_removals)

    full_text = "\n\n".join(cleaned_pages)
    full_text = re.sub(r'\n{3,}', '\n\n', full_text)
    full_text = full_text.strip() + "\n"
    return full_text, total_stats, all_junk_removals


# Prints the junk-removal safety report: total removed, and any removed
# line whose original text was more than 5 characters longer than its
# normalised form — a sign that something besides a page number was
# stripped off, worth a manual look.
def print_junk_safety_report(junk_removals, length_diff_threshold=5):
    print(f"\nLines removed by junk matching: {len(junk_removals)}")
    flagged = [
        (original, normalized) for original, normalized in junk_removals
        if len(original) - len(normalized) > length_diff_threshold
    ]
    print(f"Of those, more than {length_diff_threshold} chars longer than their normalised form: {len(flagged)}")
    for original, normalized in flagged:
        print(f'  original:   "{original}"')
        print(f'  normalised: "{normalized}"')


# Turns "constitution.raw.txt" into "constitution.txt" in the same folder.
def output_path_for(input_path):
    output_name = input_path.name.replace(".raw.txt", ".txt")
    return input_path.with_name(output_name)


# For one candidate line (already normalised, or normalised here), returns
# the page indexes (0-based, same numbering as splitting on <<<PAGE>>>)
# whose first/last 2 lines did NOT normalise to that candidate. Lets you
# check whether the "misses" are pages you already expect (e.g. blank
# pages) rather than pages where the header got merged into real text.
def find_page_misses(pages, candidate):
    target = normalize_line(candidate)
    misses = []
    for index, page in enumerate(pages):
        normalized_edges = {normalize_line(line) for line in edge_lines_of_page(page)}
        if target not in normalized_edges:
            misses.append(index)
    return misses


# Prints the miss list for --show-misses. Changes nothing.
def print_misses(misses, total_pages, candidate):
    print(f'Pages where "{candidate}" did NOT appear (normalised) in the first/last 2 lines:')
    print(f"{len(misses)} of {total_pages} pages\n")
    print(misses)


# Pulls "--show-misses <candidate text>" out of the argument list, if
# present, returning (remaining_args, candidate_or_None).
def extract_show_misses_arg(args):
    if "--show-misses" not in args:
        return args, None
    index = args.index("--show-misses")
    if index + 1 >= len(args):
        print('Usage: --show-misses "<candidate text>" (value missing)')
        sys.exit(1)
    candidate = args[index + 1]
    remaining = args[:index] + args[index + 2:]
    return remaining, candidate


# Reads the input path and flags from the command line and runs the
# candidate report (default), the miss report (--show-misses), the
# page-number dry run (--dry-run), or the full clean (--apply).
def main():
    args, show_misses_candidate = extract_show_misses_arg(sys.argv[1:])
    apply_flag = "--apply" in args
    dry_run_flag = "--dry-run" in args
    positional = [arg for arg in args if arg not in ("--apply", "--dry-run")]

    if len(positional) != 1:
        print("Usage: python scripts\\clean.py <input_raw.txt> [--apply]")
        print("   or: python scripts\\clean.py <input_raw.txt> --dry-run")
        print('   or: python scripts\\clean.py <input_raw.txt> --show-misses "<candidate text>"')
        sys.exit(1)

    input_path = Path(positional[0])
    if not input_path.exists():
        print(f"File not found: {input_path}")
        sys.exit(1)

    pages = read_pages(input_path)

    if show_misses_candidate is not None:
        misses = find_page_misses(pages, show_misses_candidate)
        print_misses(misses, len(pages), show_misses_candidate)
        return

    if dry_run_flag:
        removals = find_page_number_removals(pages)
        print_page_number_removals(removals)
        print("No files were changed - this is a --dry-run report.")
        return

    if not apply_flag:
        candidates = find_junk_candidates(pages)
        print_candidates(candidates, len(pages))
        print("\nNo files were changed. Approve the lines you want removed by")
        print("adding them to JUNK_LINES at the top of this script, then re-run")
        print("with --apply.")
        return

    if not input_path.name.endswith(".raw.txt"):
        print(f"Refusing to run --apply on {input_path}")
        print('Input filename must end in ".raw.txt" - output_path_for() drops')
        print('that suffix to name the output file, so a different filename')
        print("would make the output path equal the input path and overwrite it.")
        sys.exit(1)

    full_text, stats, junk_removals = clean_document(pages)
    output_path = output_path_for(input_path)
    output_path.write_text(full_text, encoding="utf-8")

    print(f"Saved cleaned text to {output_path}")
    print(f"Lines kept: {stats['keep']}")
    print(f"Lines dropped - empty: {stats['empty']}, page numbers: {stats['page_number']}, approved junk: {stats['approved_junk']}")
    print_junk_safety_report(junk_removals)


if __name__ == "__main__":
    main()
