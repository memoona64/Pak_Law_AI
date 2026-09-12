"""
Chunk data/clean/crpc.txt (the Code of Criminal Procedure, 1898) into one
JSON object per section, in the same shape the other chunk files already use
(see data/chunks/pakistan_penal_code_cleaned.json for reference).

Why this exists: CrPC was cleaned but never chunked, so it was missing from
the search corpus entirely -- including Section 154 and Section 22A, the two
most-referenced sections in the whole app (the "police won't register my
FIR" flow). This script fixes that gap.

What it skips on purpose:
- The table of contents at the start of the file (lines before "It is hereby
  enacted as follows:__"). The TOC repeats every section number and title
  with no body text, and would otherwise produce hundreds of empty chunks.
- The Second Schedule onward (everything from the first "SCHEDULE" heading).
  This matches the documented decision (notes/decisions.md, 2026-08-30) to
  exclude the Second Schedule's offence table, which extracts as scattered
  fragments rather than usable text. The other schedules (forms, repealed
  enactments) are cut for the same reason -- they're tables/forms, not
  numbered sections, and don't parse the same way.
- Sections that are wholly repealed/omitted, like "2. [Repealed]", never
  appear in the real body text at all (only in the table of contents), so
  they're simply absent from the output -- no fake chunk is created for
  them.
- Footnotes (citations like "1Subs. by Ord. No. XXXVII of 2001, s.4."). In
  the original PDF these were small superscript numbers at the page bottom;
  the text extractor flattened them into the middle of the section text
  wherever a page happened to break. They are dropped so section text is
  just the law, not a mix of law and amendment-history trivia -- see
  FOOTNOTE_NUMBER_LINE / FOOTNOTE_TEXT_START below for how they're found.
"""

import json
import re
from pathlib import Path

# Anchored to the project root (one level up from scripts/) so this script
# works no matter which folder it's run from, not just when the current
# directory happens to be the project root.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = PROJECT_ROOT / "data" / "clean" / "crpc.txt"
OUTPUT_PATH = PROJECT_ROOT / "data" / "chunks" / "crpc.json"

ACT_NAME = "Code of Criminal Procedure, 1898"
ACT_NO = "V of 1898"
SHORT_CODE = "CrPC"

# Matches a line that starts a new section, e.g. "154. Information in
# cognizable cases..." or "22A. Powers of..." -- and tolerates a leading
# footnote-insertion marker like "1[565. Order for..." which appears on a
# handful of sections that were inserted by later amendments.
SECTION_START = re.compile(r"^(?:\d+\[)?(\d{1,3})([A-Z]{0,2})\.\s+(.*)$")

CHAPTER_START = re.compile(r"^CHAPTER\s+([IVXLCM]+)\b")

# Two more line shapes that show up throughout the body but aren't real,
# single-numbered sections:
#   - Lettered sub-chapter headings, e.g. "F.__ Suspension and Removal" --
#     these introduce a group of sections but have no body of their own.
#   - Repeal notices covering a range of numbers at once, e.g.
#     "26 and 27. [Suspension and removal ...] Rep. by A.O., 1937." or
#     "18-21. [Omitted]" -- these don't have one clean section number, and
#     carry no usable text either way.
# Neither matches SECTION_START, so without handling them they silently get
# absorbed into whatever section came right before them. Treating them as
# boundaries (end the current section, discard this line) keeps them from
# polluting the preceding section's text.
LETTERED_SUBHEADING = re.compile(r"^[A-Z]\.__")
RANGE_NOTICE = re.compile(r"^\d+\s*(?:-|and)\s*\d+\.")

# A footnote is a citation number that was superscript in the original PDF.
# The text extractor turns it into plain text two different ways in this
# file: sometimes the number and its text share a line ("3The words...
# omitted."), sometimes the number sits alone on its own line and the text
# starts on the next line ("1" then, on the next line, "Subs. by Ord. No.
# XXXVII of 2001, s.4."). Either way, once a footnote starts, its text keeps
# flowing across lines like an ordinary paragraph -- the one reliable signal
# that it has ended is the next blank line, after which real section text
# resumes.
#
# Neither pattern can match a real section-start line (e.g. "22A. Powers of
# ...", "3[12. Sub ordinate Magistrates..."): those always have a "." or a
# "[" immediately after the number, never a bare capital letter.
FOOTNOTE_NUMBER_LINE = re.compile(r"^\d{1,2}$")
FOOTNOTE_TEXT_START = re.compile(r"^\d{1,2}[A-Z][a-z]")

# One confirmed OCR error in the source text: real section 55 ("Arrest of
# vagabonds, habitual robbers, etc.") is misprinted as "655." -- verified by
# hand, since it sits exactly between sections 54 and 56 and its title
# matches the table of contents entry for section 55 exactly. This is a
# single, checked correction, not a generic pattern rule.
KNOWN_OCR_FIXES = [
    ("655. Arrest of vagabonds, habitual robbers, etc.", "55. Arrest of vagabonds, habitual robbers, etc."),
]

# A footnote after section 1's body lists enforcement dates by province and
# happens to restart its own numbering ("1. In the Punjab...", "2. In
# N.W.F.P...."), which matches the section-start pattern. Verified by hand:
# this is the only such footnote in the document (checked by looking at
# every jump in section numbering -- every other jump is a real section that
# was inserted out of numeric order by a later amendment, e.g. "193A"
# appearing right after section 93). These four lines are excluded by exact
# text match rather than a generic rule, since a generic "numbers can't go
# backward" rule turned out to be wrong for this document.
FALSE_SECTION_STARTS = {
    "1. In the Punjab 26 12 1975",
    "2. In N.W.F.P. (Except Tribal Areas) 26 12 1975",
    "3. In Sind 24 12 1975",
    "4. In Quetta Town, Cantonment Areas and Nasirabad Distt.of Baluchistan. 23 12 1975",
}


def find_body_range(lines):
    """Return (start, end) line indexes covering only the real section text --
    skipping the front table of contents and everything from the Schedules
    onward."""
    start = None
    for i, line in enumerate(lines):
        if "It is hereby enacted as follows" in line:
            start = i + 1
            break
    if start is None:
        raise ValueError("Could not find the start-of-body marker in crpc.txt")

    end = len(lines)
    for i in range(start, len(lines)):
        if lines[i].strip().startswith("SCHEDULE"):
            end = i
            break
    return start, end


def extract_title(text):
    """Best-effort section title: the short heading before the section body
    starts. Old Pakistani statute text doesn't mark this consistently -- some
    sections use ".__" (this corpus's rendering of an em-dash) right after
    the title, some use a bare "__" with no period, some just start a
    numbered subsection with "(1)", and some have no marker at all. We take
    whichever boundary comes first in the text, not whichever marker we
    happen to check first."""
    candidates = [text.find(marker) for marker in [".__", "__", ". ("]]
    candidates = [idx for idx in candidates if idx != -1]
    if candidates:
        return text[:min(candidates)].strip()
    idx = text.find(". ")
    if idx != -1:
        return text[:idx].strip()
    return text[:80].strip()


def chunk_crpc():
    """Read crpc.txt, split it into per-section chunks, and write data/chunks/crpc.json."""
    lines = INPUT_PATH.read_text(encoding="utf-8").splitlines()
    start, end = find_body_range(lines)

    chunks = []
    current_chapter = None
    section_number = None
    section_suffix = None
    section_lines = []
    skipping_footnote = False

    # Turns whatever's been collected in section_lines into one finished
    # chunk and appends it to chunks. Does nothing if no section is open.
    def flush_section():
        if section_number is None:
            return
        raw = " ".join(" ".join(section_lines).split())  # collapse whitespace
        match = SECTION_START.match(raw)
        after_number = match.group(3) if match else raw
        chunk_id = f"crpc-1898-{int(section_number):03d}{section_suffix or ''}"
        chunks.append({
            "id": chunk_id,
            "text": raw,
            "metadata": {
                "act": ACT_NAME,
                "short_code": SHORT_CODE,
                "act_no": ACT_NO,
                "section": f"{section_number}{section_suffix or ''}",
                "section_number": section_number,
                "section_suffix": section_suffix or None,
                "section_title": extract_title(after_number),
                "chapter": current_chapter,
                "jurisdiction": "federal",
                "province": None,
                "amendment_note": None,
                "source_status": "Active",
            },
        })

    i = start
    while i < end:
        line = lines[i].strip()
        for bad, good in KNOWN_OCR_FIXES:
            if line.startswith(bad):
                line = good + line[len(bad):]

        if skipping_footnote:
            # Stay in skip mode until the blank line that ends the footnote
            # block -- unless a real section/chapter start shows up first
            # (never observed in this document, but a cheap safety net in
            # case a footnote ever runs right up against one with no blank
            # line between them, so we don't eat real law text by mistake).
            is_real_start = CHAPTER_START.match(line) or LETTERED_SUBHEADING.match(line) \
                or RANGE_NOTICE.match(line) \
                or (line not in FALSE_SECTION_STARTS and SECTION_START.match(line))
            if not line:
                skipping_footnote = False
                i += 1
                continue
            elif not is_real_start:
                i += 1
                continue
            else:
                skipping_footnote = False
                # fall through and process this line normally below

        if FOOTNOTE_NUMBER_LINE.match(line) or FOOTNOTE_TEXT_START.match(line):
            skipping_footnote = True
            i += 1
            continue

        chapter_match = CHAPTER_START.match(line)
        section_match = None if line in FALSE_SECTION_STARTS else SECTION_START.match(line)

        if chapter_match:
            # The chapter's title usually follows on the next non-blank line
            # in capitals, e.g. "CHAPTER II" / "OF THE CONSTITUTION OF...".
            title = ""
            j = i + 1
            while j < end and not lines[j].strip():
                j += 1
            if j < end and lines[j].strip() and lines[j].strip() == lines[j].strip().upper() \
                    and not CHAPTER_START.match(lines[j].strip()) and not SECTION_START.match(lines[j].strip()):
                title = lines[j].strip()
                i = j
            chapter_label = re.sub(r"[^\w\s]+$", "", line).strip()  # drop stray trailing punctuation/markers
            current_chapter = f"{chapter_label} - {title}" if title else chapter_label
        elif section_match:
            flush_section()
            section_number = section_match.group(1)
            section_suffix = section_match.group(2) or None
            section_lines = [line]
        elif LETTERED_SUBHEADING.match(line) or RANGE_NOTICE.match(line):
            # A boundary, but not a section we can chunk on its own -- end
            # whatever section was accumulating and discard this line.
            flush_section()
            section_number = None
        elif line:
            section_lines.append(line)

        i += 1

    flush_section()

    OUTPUT_PATH.write_text(
        json.dumps(chunks, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(chunks)} sections to {OUTPUT_PATH}")
    print(f"First section: {chunks[0]['metadata']['section']} - {chunks[0]['metadata']['section_title']}")
    print(f"Last section: {chunks[-1]['metadata']['section']} - {chunks[-1]['metadata']['section_title']}")


if __name__ == "__main__":
    chunk_crpc()
