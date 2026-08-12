"""
Raw extraction quality checker.
Reads one raw .txt file (produced by extract.py) and prints a report on
its extraction quality. Never writes anything back to the file.
"""

import re
import sys
from pathlib import Path

PAGE_MARKER = "<<<PAGE>>>"

# Matches a line that starts with digits, an optional letter or hyphen-letter
# suffix, then a full stop. Examples: "378." "302B." "22-A."
SECTION_START_PATTERN = re.compile(r'^(\d+)(-?[A-Za-z])?\.')

# "Standard" means printable ASCII (space through ~) plus tab. Anything
# outside that - Urdu/Arabic script, curly quotes, em-dashes - fails this.
STANDARD_CHAR_PATTERN = re.compile(r'^[\x20-\x7E\t]*$')


# Reads the file and returns its full text and a list of lines (no newlines).
def read_file(file_path):
    text = file_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    return text, lines


# Finds every line that looks like it starts a section.
# Returns a list of (line_number, line_text, section_number) tuples.
def find_section_start_lines(lines):
    matches = []
    for line_number, line in enumerate(lines, start=1):
        match = SECTION_START_PATTERN.match(line)
        if match:
            section_number = int(match.group(1))
            matches.append((line_number, line, section_number))
    return matches


# Walks the section-start lines in file order and returns every place
# where a number is lower than the one right before it.
def find_out_of_order(section_lines):
    problems = []
    previous = None
    for entry in section_lines:
        if previous is not None and entry[2] < previous[2]:
            problems.append((previous, entry))
        previous = entry
    return problems


# Returns the "count" longest lines as (length, line_number, line_text) tuples.
def find_longest_lines(lines, count=10):
    numbered = [(len(line), i + 1, line) for i, line in enumerate(lines)]
    numbered.sort(key=lambda item: item[0], reverse=True)
    return numbered[:count]


# Finds lines that contain characters outside standard ASCII text/punctuation.
def find_non_standard_lines(lines):
    flagged = []
    for line_number, line in enumerate(lines, start=1):
        if not STANDARD_CHAR_PATTERN.match(line):
            flagged.append((line_number, line))
    return flagged


# Prints the full report to the screen.
def print_report(file_path, text, lines):
    print(f"=== Raw extraction quality report: {file_path.name} ===\n")

    print(f"Total characters: {len(text)}")
    print(f"Total lines: {len(lines)}")
    print(f"<<<PAGE>>> markers: {text.count(PAGE_MARKER)}")

    section_lines = find_section_start_lines(lines)
    print("\n--- Section-start lines ---")
    print(f"Lines matching section-start pattern: {len(section_lines)}")

    print("\nFirst 5:")
    for line_number, line, _ in section_lines[:5]:
        print(f"  {line_number}: {line}")

    print("\nLast 5:")
    for line_number, line, _ in section_lines[-5:]:
        print(f"  {line_number}: {line}")

    problems = find_out_of_order(section_lines)
    print("\n--- Section number ordering ---")
    print(f"Numbers ascend with no drops: {'Yes' if not problems else 'No'}")
    print(f"Out-of-order points: {len(problems)}")
    for previous, current in problems:
        prev_line_number, prev_line, prev_number = previous
        cur_line_number, cur_line, cur_number = current
        print(f"  Line {cur_line_number}: {cur_number} comes right after {prev_number} (line {prev_line_number})")
        print(f"    previous: {prev_line}")
        print(f"    current:  {cur_line}")

    longest = find_longest_lines(lines)
    print("\n--- 10 longest lines ---")
    for length, line_number, line in longest:
        print(f"  {length} chars, line {line_number}: {line}")

    non_standard = find_non_standard_lines(lines)
    print("\n--- Non-standard characters ---")
    print(f"Lines with non-standard characters: {len(non_standard)}")
    if non_standard:
        print("First 10 examples:")
        for line_number, line in non_standard[:10]:
            print(f"  Line {line_number}: {line}")


# Reads the input file path from the command line and runs the report.
def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts\\check_raw.py <path_to_raw_txt>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)

    text, lines = read_file(file_path)
    print_report(file_path, text, lines)


if __name__ == "__main__":
    main()
