"""Minimal citation verifier: confirms every section/article an LLM's
explanation cites actually matches a chunk that was retrieved for it.

This only checks that the cited reference exists among the retrieved
chunks — it does not check whether the explanation's claim about what that
section says is itself accurate (that would need a semantic/entailment
check, which is out of scope for now). Catching a citation to a section
that was never retrieved is the specific failure mode this exists to catch.
"""

import re

from .search_service import _extract_section_ref

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _extract_citations(text: str) -> list[tuple[str, str]]:
    """Return (ref_type, ref_number) pairs cited in free text.

    _extract_section_ref only returns the first match in its input, so this
    runs it per-sentence to catch every citation in a multi-sentence
    explanation, not just the first.
    """
    citations = []
    for sentence in SENTENCE_SPLIT.split(text):
        reference = _extract_section_ref(sentence)
        if reference:
            ref_type, ref_number, _ = reference
            citations.append((ref_type, ref_number))
    return citations


def _chunk_matches(chunk: dict, ref_type: str, ref_number: str) -> bool:
    metadata = chunk.get("metadata", {})
    key = "section" if ref_type == "section" else "Article"
    fallback = "section_number" if ref_type == "section" else "Article_number"
    value = metadata.get(key) or metadata.get(fallback) or ""
    return str(value).upper() == ref_number


def verify_citations(explanation: str, chunks: list[dict]) -> dict:
    """Check each section/article the explanation cites against the chunks
    retrieved for it. Callers should flag unverified citations, not drop them.
    """
    verified = []
    unverified = []
    seen = set()
    for ref_type, ref_number in _extract_citations(explanation):
        key = (ref_type, ref_number)
        if key in seen:
            continue
        seen.add(key)
        target = verified if any(_chunk_matches(chunk, ref_type, ref_number) for chunk in chunks) else unverified
        target.append({"type": ref_type, "number": ref_number})

    return {
        "verified": verified,
        "unverified": unverified,
        "all_verified": not unverified,
    }
