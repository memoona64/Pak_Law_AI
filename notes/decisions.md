# Documents used

## constitution.pdf
- URL: https://www.na.gov.pk/en/downloads.php
- Downloaded: 2026-08-12
- Amendment date printed in document: "As amended upto the Twenty-Seventh Amendment" / "GOVERNMENT OF PAKISTAN, MINISTRY OF LAW AND JUSTICE, 2025"
- amended_up_to: 27th Amendment, 2025 (no exact date given inside the file)
- Jurisdiction: federal | Province: null
- Pages: 252 | Size: 1.4 MB | Producer: Nitro Pro 10
- Text layer: yes, fonts embedded
- Triage: OK — avg 1,599 chars/page
- Notes:
  - Uses "Article" numbering, not "Section". Needs its own regex pattern.
  - Article 25 (equality of citizens) confirmed present and complete.
  - The NA download page said "as amended upto the 21st November, 2025", but that date is on the *webpage*, not inside the file. Recorded separately, not treated as verified.
  - Most volatile document in the corpus — the 27th Amendment changed judiciary structure. Re-check before any demo.

## ppc.pdf
- URL: https://pakistancode.gov.pk (Pakistan Code, Ministry of Law and Justice)
- Downloaded: 2026-08-12
- Amendment date printed in document: "Dated: 30-11-2025" on the final page
- amended_up_to: 2025-11-30
- Jurisdiction: federal | Province: null
- Pages: 179 | Size: 1.6 MB | Producer: Microsoft Word 2016
- Text layer: yes, but fonts NOT embedded (Times New Roman, WinAnsi)
- Triage: OK — avg 2,909 chars/page (cleanest of the five)
- Notes:
  - Section 302 (qatl-i-amd) and Section 378 (theft) confirmed present and complete.
  - Pakistan Code listed this act as "(Under Review)". File itself is dated 30-11-2025, so treating as current. Flagged for re-check.
  - Non-embedded fonts are a theoretical extraction risk, but pdfplumber returned clean text on every sampled page. Not a blocker.
  - 184 embedded images — decorative "THE PAKISTAN CODE" watermarks, not content.

## crpc.pdf
- URL: https://pakistancode.gov.pk
- Downloaded: 2026-08-12
- Amendment date printed in document: "Dated: 10-06-2026" on the final page
- amended_up_to: 2026-06-10
- Jurisdiction: federal | Province: null
- Pages: 307 | Size: 15.5 MB | Producer: Microsoft Word 2016
- Text layer: yes, fonts not embedded
- Triage: OK — avg 2,641 chars/page
- Notes:
  - Most recently updated document in the corpus.
  - Section 154 (information in cognizable cases — the FIR section) confirmed present and complete.
  - IMPORTANT: this document writes the Justice of the Peace section as "22A", NOT "22-A". Searched both — "22-A" returns zero matches here. Sindh Rented uses the hyphenated form. Both forms exist in the corpus.
  - Section 25 is "Ex-officio Justices of the peace" — also relevant to the FIR flow.
  - 312 embedded watermark images explain the file size. Not a scan, no OCR needed.

## mfl.pdf
- URL: https://pakistancode.gov.pk
- Downloaded: 2026-08-12
- Amendment statement in document: "Updated till 10-3-2022" printed at the top
  of page 1 only (not a repeating per-page header - an earlier note in this
  file claimed otherwise and was incorrect)
- amended_up_to: 2022-03-10
- Jurisdiction: federal | Province: null
- Pages: 7 | Size: 0.3 MB
- Text layer: yes, clean
- Triage: OK — avg 2,082 chars/page
- Notes:
  - Only 13 sections; 12 and 13 are marked "Omitted".
  - Contains the sections our guided flows need: 5 (marriage registration), 6 (polygamy), 7 (talaq), 8 (dissolution other than talaq), 9 (maintenance), 10 (dower).
  - Reflects 2021 amendments (Act XXVIII of 2021, Act XXIX of 2021) adding Fiqah-e-Jafria provisions to sections 4 and 7.
  - "Updated till 10-3-2022" repeats on every page — good test case for the header-removal script.
  - Page 1 is a contents page with section numbers and titles but no bodies.

## sindh_rented.pdf
- URL: https://sja.gos.pk/assets/Updated_Laws/Sindh Rented Premises Ordinance,1979.pdf
- Downloaded: 2026-08-12
- Source: Sindh Judicial Academy (Government of Sindh). Compiled by Nizam-ud-din, Librarian.
- Amendment date printed in document: cover says "Amendment up-to-date". No compilation date stated.
- amended_up_to: 2001-04-17 (latest amendment referenced: Sindh Ordinance No. XIV of 2001)
- Jurisdiction: provincial | Province: sindh
- Pages: 14 | Size: 0.8 MB
- Text layer: yes, clean
- Triage: OK — avg 2,419 chars/page
- Notes:
  - The ONLY provincial document in the corpus. This is what the province filter exists for.
  - Sections 1–27, with 6 and 22 omitted/substituted, plus inserted sections 15-A and 21-A (hyphenated form).
  - Section 15 (grounds for eviction) and section 21 (appeal to District Judge) are the core of the eviction guided flow.
  - Amendments span 1980, 1984, 1986, 2001.
  - Document does not state when it was compiled, only which amendments it incorporates. Recorded honestly rather than assuming currency.

## Triage run — 2026-08-12

Ran `scripts/triage.py` against every PDF in `data/raw/` to confirm text-layer
presence programmatically (5 sampled pages per file, ~10/30/50/70/90% through
the document).

```
File                       Pages  Size(MB)  AvgChars  Images  Verdict
---------------------------------------------------------------------
constitution.pdf             252       1.3      1599      20  OK - has text layer
crpc.pdf                     307      14.8      2641     309  OK - has text layer
mfl.pdf                        7       0.3      2082       9  OK - has text layer
ppc.pdf                      179       1.5      2909     181  OK - has text layer
sindh_rented.pdf              14       0.8      2419      38  OK - has text layer
```

Image counts differ slightly from the earlier manual figures because pdfplumber counts per-page image placements, not unique image objects.

## Extraction run — 2026-08-13

```
File                    Pages  Chars     Empty pages
---------------------------------------------------------------
ppc.raw.txt             179    497,729   0
crpc.raw.txt            307    767,301   0
constitution.raw.txt    252    462,493   12
mfl.raw.txt             7      15,791    0
sindh_rented.raw.txt    14     29,598    1
```

Page counts match the triage run exactly. One known section was spot-checked by eye in each file against the original PDF.

---

# Documents rejected and why

- **archive.org copy of Sindh Rented Premises Ordinance** — CamScanner scan with broken OCR. Extracted text showed damage like "the f air rent of any p remises". Non-official source. Two independent reasons to reject.
- **studocu.com, graana.com, zameen.com** — student note sites and property blogs. Not authoritative; no way to verify what was altered or when. Appeared in search results, not used.
- **PECA 2016 (cybercrime)** — deferred, not rejected. Amended since 2016 and enforcement moved to a different agency. Would need current amended text. Revisit only if week 5 finishes early.
- **CPC, Income Tax Ordinance, general labour codes** — cut from the original nine-document plan. Scope decision, not a quality decision. Four documents done well beats nine done badly and directly improves retrieval scores.

---

# Cleaning decisions

*(Fill in as cleaning runs. Confirmed problems found during triage:)*

1. **Repeating page headers.** MFL has "Updated till 10-3-2022" on every page. Constitution, PPC and CrPC have running act-title headers. Handle with the frequency detector — print candidates, approve by hand, never auto-delete.

2. **Contents / TOC pages at the front of every document.** PPC, CrPC and MFL all open with multi-page lists of section numbers and titles with no bodies. These match any section regex and produce hundreds of empty false chunks. **This is the biggest cleaning problem and it was not in the original plan.** Decision still needed: skip first N pages per act, or detect and strip the TOC.

3. **Footnote markers glued into body text.** Seen in MFL and Sindh Rented: `4[:]`, `2[(1)]`, `3[provided that`, `1[************]`. Occurs mid-sentence and corrupts chunk text if left in.

4. **Footnote bodies at page bottoms.** Every Pakistan Code document has amendment footnotes ("Subs. by A.O., 1964, Art. 2 and Sch...") below a horizontal rule. Useful for amendment history, but not legal text — must not end up inside a section chunk.

5. **Decorative watermark images.** PPC 184, CrPC 312, Constitution 22. Image objects, invisible to text extraction. No action needed — noted so nobody mistakes the file size for a scan.

6. **Constitution has 12 pages with no extractable text:** 1, 3, 5, 21, 25, 103, 111, 163, 171, 173, 207, 251. Verified by opening the original PDF — these are blank separator and title pages, not lost content.

7. **Sindh Rented has 1 empty page (14, the back cover image).** Expected.

8. **Header removal:** "CONSTITUTION OF PAKISTAN" approved as junk, removed from 237 of 252 pages. One instance remains on page 22 as "CONSTITUTION OF PAKISTAN1 1" where a footnote digit is fused to the word with no space. Left in place — a normaliser aggressive enough to catch it would also damage real content.

9. **Page-number rule scoped:** bare-number lines are only removed if they appear in the first 2 or last 2 lines of a page. Before this fix the rule deleted 29 footnote markers from PPC and 62 footnote/table digits from CrPC. No legal text was lost, but the rule was removing things its name did not describe.

10. **4 bare digits remain in CrPC** (pages 129, 215, 261, 281) where a footnote or table digit coincidentally landed at a page edge. Accepted rather than fixed: 4 lines out of 12,928, and any rule precise enough to catch them would risk removing real page numbers or footnote markers elsewhere.

11. **CrPC Second Schedule (pages 196-281, 28% of the document) is EXCLUDED from the corpus.** Decision made 2026-08-30 by Kaneeza after no response on the question raised earlier.
    Reason: the schedule is a table of cognizable/bailable status per offence. It extracts as fragments — columns scattered, rows destroyed, "Ditto .." with nothing to refer to. Chunked, it would produce retrieval hits carrying real section numbers and meaningless text, and the citation verifier would pass them because the section numbers are genuine. A documented gap is safer than silent garbage.
    Cost: we lose cognizable vs non-cognizable, which matters for the FIR flow.
    Revisit in week 7 if there is time to extract it as structured table data.

---

# Pattern decisions

*(Memoona's section. Findings from triage that affect the chunker:)*

- **Two numbering vocabularies:**
  - Constitution → "Article"
  - PPC, CrPC, MFL, Sindh Rented → "Section"
  - Confirms one pattern per act. A single universal regex will not work.

- **Inserted-section suffixes appear in two forms:**
  - CrPC: `22A` (no hyphen) — verified, `22-A` returns zero matches
  - Sindh Rented: `15-A`, `21-A` (hyphenated)
  - Pattern must accept both.

- **First-pass counts, and why they cannot be trusted:**

  | Document | Distinct numbers found | Highest found | Assessment |
  |---|---|---|---|
  | PPC | 516 | 3373 | False match — no section 3373 exists |
  | CrPC | 461 | 11198 | Same problem, worse |
  | Constitution | 284 | 1972 | 1972 is a year, not an article |
  | MFL | 13 | 13 | Correct |
  | Sindh Rented | 25 | 27 | Correct |

  Large documents are matching years, cross-references and TOC entries. Small documents are clean. The count check caught this on day one — the pattern needs real work on PPC and CrPC.

- **Known-answer targets confirmed present in the source PDFs** (must survive cleaning and chunking):
  - PPC 302 — punishment of qatl-i-amd
  - PPC 378 — theft
  - CrPC 154 — information in cognizable cases (FIR)
  - CrPC 22A — powers of Justices of the Peace
  - Constitution Article 25 — equality of citizens

---

# Open problems

1. **Constitution has no amendment date inside the file** — only "27th Amendment" and "2025". Decide whether to also record the NA webpage's date (21 November 2025) and how to label its source.
2. **PPC listed as "Under Review"** on Pakistan Code while carrying a 30-11-2025 date. Unclear what that status means for currency. Question for the legal reviewer.
3. **TOC handling not decided.** Skip by page number (fragile) or detect TOC structure (more work, more robust)?
4. **CrPC is 15.5 MB.** Fine on D:, but watch it if disk gets tight again.
5. **No legal reviewer recruited.** Blocks the guided flows, not the corpus. Flagged to the team.

---

# Environment notes

- Project on `D:\Pak_Law_AI`. C: was critically full (down to 4 MB free) and cannot host the venv, pip cache, or temp files.
- Python 3.14.4 in a venv at `D:\Pak_Law_AI\.venv`. Outside the venv the command is `py`, not `python`.
- `start.bat` sets TMP, TEMP, PIP_CACHE_DIR to D: and activates the venv. Run it at the start of every session.
- pdfplumber 0.11.10, pypdf 6.15.0.
