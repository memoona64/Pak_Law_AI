"""Generic chunker for uploaded documents (contracts, notices, orders).

Unlike the corpus chunker, which splits the law corpus by Act/Section
structure, an uploaded document has no such structure to rely on. This
splits by numbered clause where the document has one, and falls back to a
sentence window for documents without clause numbering.
"""

import re

CLAUSE_PATTERN = re.compile(r"(?m)^\s*(?:clause\s+)?(\d{1,3})[.)]\s+", re.IGNORECASE)
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")

WINDOW_SENTENCES = 5
WINDOW_OVERLAP = 1
MIN_CLAUSE_MARKERS = 2


def _split_by_clause(text: str) -> list[dict] | None:
    matches = list(CLAUSE_PATTERN.finditer(text))
    if len(matches) < MIN_CLAUSE_MARKERS:
        return None

    chunks = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        clause_text = text[start:end].strip()
        if clause_text:
            chunks.append({"clause_number": match.group(1), "text": clause_text})
    return chunks


def _split_by_sentence_window(text: str) -> list[dict]:
    sentences = [sentence.strip() for sentence in SENTENCE_SPLIT.split(text) if sentence.strip()]
    if not sentences:
        return []

    chunks = []
    step = WINDOW_SENTENCES - WINDOW_OVERLAP
    for start in range(0, len(sentences), step):
        window = sentences[start : start + WINDOW_SENTENCES]
        chunks.append({"clause_number": None, "text": " ".join(window)})
        if start + WINDOW_SENTENCES >= len(sentences):
            break
    return chunks


def chunk_document(text: str) -> list[dict]:
    """Split an uploaded document's text into clause-like chunks.

    Each chunk is {"clause_number": str | None, "text": str}. A clause
    number is set only when the document actually has numbered clauses.
    """
    text = text.strip()
    if not text:
        return []
    return _split_by_clause(text) or _split_by_sentence_window(text)
