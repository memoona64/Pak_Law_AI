import json
import logging
import os
import re
import threading
from dotenv import load_dotenv
from google import genai
from google.genai import types
from .language import language_directive
from .prompts import CLAUSE_ANALYSIS_PROMPT, DOCUMENT_SUMMARY_PROMPT, SYSTEM_PROMPT

load_dotenv()

logger = logging.getLogger("uvicorn.error")

# The free tier caps requests per day per model, so an exhausted quota is
# recovered fastest by pointing this at another model rather than editing code.
# Verified working: gemini-3.1-flash-lite, gemini-flash-latest. Note that
# gemini-2.5-flash returns 404 "no longer available to new users" on newer keys.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

# Chunks vary a lot in size (some large, some small), so we cap the total
# context we send instead of assuming every chunk is roughly the same length.
MAX_CONTEXT_CHARS = 12000
MAX_SUMMARY_CHARS = 8000

VALID_RISK_LEVELS = {"ok", "warn", "flag"}
_JSON_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)

# google.generativeai (the old SDK) is fully deprecated — Google has stopped
# shipping updates or bug fixes for it. This uses its replacement, google-genai.
_client = None
# Guards first-load so two concurrent first requests can't both start
# creating the client at once (mirrors search_service.py's _index_lock).
_client_lock = threading.Lock()
_generation_config = types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT)
_clause_config = types.GenerateContentConfig(system_instruction=CLAUSE_ANALYSIS_PROMPT)
_summary_config = types.GenerateContentConfig(system_instruction=DOCUMENT_SUMMARY_PROMPT)


def _get_client():
    """Lazily create the Gemini client (mirrors reranker.py's lazy loading)
    so importing this module never fails just because no key is configured
    yet — only an actual generation attempt notices."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                api_key = os.getenv("GEMINI_API_KEY")
                if not api_key:
                    raise RuntimeError("GEMINI_API_KEY is not set")
                _client = genai.Client(api_key=api_key)
    return _client


def _generate(prompt: str, config: types.GenerateContentConfig) -> str:
    """The single point every Gemini call goes through, so changing provider
    or model stays a one-place change (plan section 3)."""
    response = _get_client().models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
    )
    return response.text


def format_context(chunks) -> str:
    """Turn the top-5 retrieved chunks into one text block for the prompt,
    respecting a character budget so we don't overflow the model's context."""
    parts = []
    used = 0
    for i, chunk in enumerate(chunks, start=1):
        meta = (chunk.get("metadata") if isinstance(chunk, dict) else chunk.metadata) or {}
        text = chunk.get("text") if isinstance(chunk, dict) else chunk.text
        header = (
            f"[Source {i}]\n"
            f"Act: {meta.get('act', 'Unknown')}\n"
            f"Section: {meta.get('section', 'Unknown')}\n"
            f"Province: {meta.get('province', 'Federal')}\n"
        )
        remaining = MAX_CONTEXT_CHARS - used
        if remaining <= 0:
            break  # budget used up, stop adding more chunks
        if len(text) > remaining:
            text = text[:remaining] + "... [truncated]"
        block = header + f"Text: {text}\n"
        parts.append(block)
        used += len(block)
    return "\n".join(parts)


def generate_answer(query: str, chunks) -> str:
    """Take the user's question + retrieved chunks, ask Gemini for a grounded answer.

    Degrades gracefully instead of raising when generation is unavailable (no
    API key, quota exhausted, network error, etc.) — retrieval results are the
    core value here, so a generation failure shouldn't take down the whole
    /rag/query response along with it.
    """
    if not chunks:
        return (
            "I couldn't find relevant Pakistani legal sources for this question in the database. "
            "You may want to rephrase your question or consult a qualified legal professional. "
            "This is general legal information, not a substitute for professional legal advice."
        )

    context = format_context(chunks)
    # The system prompt's general "answer in the same language" rule wasn't
    # reliable on its own for Roman Urdu specifically (the model would
    # sometimes switch to Urdu script or English instead) — detecting the
    # language here and stating it explicitly per-request removes that
    # ambiguity instead of leaving it to the model's own judgment of a
    # possibly short/ambiguous query.
    directive = language_directive(query)
    prompt = f"{directive}\n\nUSER QUESTION:\n{query}\n\nRETRIEVED LEGAL CONTEXT:\n{context}"

    try:
        return _generate(prompt, _generation_config)
    except Exception as exc:
        logger.warning("Gemini generation unavailable: %s", exc)
        return (
            "A generated answer isn't available right now — see the matched legal "
            "sources below. This is general legal information, not a substitute for "
            "professional legal advice."
        )


def _unparsed_clause(note: str) -> dict:
    return {"risk": "warn", "note": note, "obligation": None}


def _clause_result(entry) -> dict:
    """Validate one clause object from the model's array."""
    if not isinstance(entry, dict):
        return _unparsed_clause("Could not parse the model's analysis for this clause.")
    risk = entry.get("risk")
    if risk not in VALID_RISK_LEVELS:
        return _unparsed_clause("The model returned an unrecognised risk level for this clause.")
    return {
        "risk": risk,
        "note": entry.get("note", ""),
        "obligation": entry.get("obligation"),
    }


def analyze_clauses(items: list[dict]) -> list[dict]:
    """Classify several document clauses against their retrieved law in ONE call.

    Each item is {"clause_number": str, "text": str, "chunks": list}. Returns
    one result per item, in the same order. Batching matters: the free tier
    allows only 20 requests per day, so one call per clause cannot analyze a
    realistic contract at all.
    """
    # Label each clause by its position in THIS batch (1-based), not by the
    # document's own clause_number: real documents can restart numbering
    # (e.g. a Schedule or Annexure re-using "1.", "2." ...), and matching on
    # that label would let a same-batch collision silently attach one
    # clause's risk verdict to a different clause with the same number.
    # Position within a batch of at most CLAUSE_BATCH_SIZE items is always
    # unique, so this can't happen.
    blocks = []
    for position, item in enumerate(items, start=1):
        context = (
            format_context(item["chunks"])
            if item["chunks"]
            else "(no matching legal context found)"
        )
        blocks.append(
            f"CLAUSE {position}:\n{item['text']}\n\n"
            f"RETRIEVED LEGAL CONTEXT FOR CLAUSE {position}:\n{context}"
        )

    raw = _JSON_FENCE.sub("", _generate("\n\n---\n\n".join(blocks), _clause_config).strip())

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            raise ValueError("expected a JSON array of clause results")
    except (json.JSONDecodeError, ValueError, AttributeError):
        return [
            _unparsed_clause("Could not parse the model's analysis for this clause.")
            for _ in items
        ]

    # The model echoes back "clause_number" holding the CLAUSE {position}
    # label from the prompt above (not the document's own numbering) - the
    # model can still drop or reorder entries, so match on that label rather
    # than assuming positional order in the response.
    by_position = {
        str(entry.get("clause_number")): entry for entry in parsed if isinstance(entry, dict)
    }
    return [
        _clause_result(by_position.get(str(position)))
        for position in range(1, len(items) + 1)
    ]


def summarize_document(document_text: str, flagged_notes: list[str]) -> str:
    """Write the plain-language document summary: what it is and what it obligates you to."""
    concerns = "\n".join(f"- {note}" for note in flagged_notes) or "(none flagged)"
    prompt = (
        f"DOCUMENT TEXT:\n{document_text[:MAX_SUMMARY_CHARS]}\n\n"
        f"CLAUSES FLAGGED AS RISKY:\n{concerns}"
    )
    return _generate(prompt, _summary_config).strip()
