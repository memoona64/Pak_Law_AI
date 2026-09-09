"""Citation verifier and unsupported-claim detector — the hallucination guard.

Plan section 6: after generation and before display, parse every section and
article reference out of an answer and confirm each one is grounded in the law
actually retrieved for that answer. Anything ungrounded is reported so the
caller can refuse the answer rather than show an invented citation.

Grounding is checked against the retrieved chunks, not the whole corpus. An
answer citing a real section that was never retrieved is still unsupported by
the sources it claims to be based on.

Not implemented: section 6 step 3, checking that a quoted excerpt appears
verbatim in the cited section. The system prompt does not currently require
answers to include verbatim excerpts.
"""

import re

# Mirrors the reference grammar used by the retrieval layer's exact-lookup
# shortcut, including the Urdu and Roman Urdu forms.
ARTICLE_RE = re.compile(
    r"\b(?:articles?|art\.?s?|آرٹیکل)\s*(\d+[A-Z]?(?:-[A-Z])?)", re.I | re.UNICODE
)
SECTION_RE = re.compile(
    r"\b(?:sections?|sec\.?s?|dafa|dafah|dhara|dharaa|دفعہ)\s*(\d+[A-Z]?(?:-[A-Z])?)",
    re.I | re.UNICODE,
)
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
WORD_RE = re.compile(r"[A-Za-z؀-ۿ]{4,}")

# Appended to every answer by the system prompt, so it never overlaps with
# retrieved law and would otherwise be flagged on every single answer.
DISCLAIMER_MARKER = "not a substitute for professional legal advice"
MIN_OVERLAP = 0.2


def _references(text: str) -> set[tuple[str, str]]:
    """Return every (type, number) legal reference mentioned in some text."""
    found = {("article", match.group(1).upper()) for match in ARTICLE_RE.finditer(text)}
    found |= {("section", match.group(1).upper()) for match in SECTION_RE.finditer(text)}
    return found


def _grounded_references(chunks: list[dict]) -> set[tuple[str, str]]:
    """Every reference the retrieved chunks support, by metadata or by their text.

    Chunk text matters: legal provisions cross-reference each other, so an
    answer repeating "read with Section 34" from a retrieved chunk's own body
    is grounded even though 34 is not that chunk's section number.
    """
    grounded: set[tuple[str, str]] = set()
    for chunk in chunks:
        metadata = chunk.get("metadata", {}) or {}
        section = metadata.get("section") or metadata.get("section_number") or ""
        article = metadata.get("Article") or metadata.get("Article_number") or ""
        if section:
            grounded.add(("section", str(section).upper()))
        if article:
            grounded.add(("article", str(article).upper()))
        grounded |= _references(chunk.get("text", "") or "")
    return grounded


def verify_citations(answer: str, chunks: list[dict]) -> dict:
    """Check every citation in an answer against the law retrieved for it.

    Returns verified / unverified lists and an all_verified flag. Callers must
    refuse or flag on unverified citations — never display them silently.
    """
    grounded = _grounded_references(chunks)
    verified = []
    unverified = []
    for ref_type, ref_number in sorted(_references(answer)):
        entry = {"type": ref_type, "number": ref_number}
        (verified if (ref_type, ref_number) in grounded else unverified).append(entry)

    return {
        "verified": verified,
        "unverified": unverified,
        "all_verified": not unverified,
    }


def _content_words(text: str) -> set[str]:
    return {word.lower() for word in WORD_RE.findall(text)}


def find_unsupported_claims(answer: str, chunks: list[dict]) -> list[str]:
    """Return answer sentences with little lexical overlap with retrieved context.

    Plan section 8 calls this only partly automatable: low overlap is a signal
    worth flagging for review, not proof that a sentence is wrong.
    """
    context_words = set()
    for chunk in chunks:
        context_words |= _content_words(chunk.get("text", "") or "")
    if not context_words:
        return []

    unsupported = []
    for sentence in SENTENCE_SPLIT.split(answer):
        sentence = sentence.strip()
        if not sentence or DISCLAIMER_MARKER in sentence.lower():
            continue
        words = _content_words(sentence)
        if not words:
            continue
        if len(words & context_words) / len(words) < MIN_OVERLAP:
            unsupported.append(sentence)
    return unsupported
