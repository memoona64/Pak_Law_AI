import json
import logging
import os
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types
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
_generation_config = types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT)
_clause_config = types.GenerateContentConfig(system_instruction=CLAUSE_ANALYSIS_PROMPT)
_summary_config = types.GenerateContentConfig(system_instruction=DOCUMENT_SUMMARY_PROMPT)


def _get_client():
    """Lazily create the Gemini client (mirrors reranker.py's lazy loading)
    so importing this module never fails just because no key is configured
    yet — only an actual generation attempt notices."""
    global _client
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
    prompt = f"USER QUESTION:\n{query}\n\nRETRIEVED LEGAL CONTEXT:\n{context}"

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
    blocks = []
    for item in items:
        context = (
            format_context(item["chunks"])
            if item["chunks"]
            else "(no matching legal context found)"
        )
        blocks.append(
            f"CLAUSE {item['clause_number']}:\n{item['text']}\n\n"
            f"RETRIEVED LEGAL CONTEXT FOR CLAUSE {item['clause_number']}:\n{context}"
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

    # Match on clause number rather than position: the model can drop or
    # reorder entries, and a silently shifted result would attach one clause's
    # risk to another clause's text.
    by_number = {
        str(entry.get("clause_number")): entry for entry in parsed if isinstance(entry, dict)
    }
    return [_clause_result(by_number.get(str(item["clause_number"]))) for item in items]


def summarize_document(document_text: str, flagged_notes: list[str]) -> str:
    """Write the plain-language document summary: what it is and what it obligates you to."""
    concerns = "\n".join(f"- {note}" for note in flagged_notes) or "(none flagged)"
    prompt = (
        f"DOCUMENT TEXT:\n{document_text[:MAX_SUMMARY_CHARS]}\n\n"
        f"CLAUSES FLAGGED AS RISKY:\n{concerns}"
    )
    return _generate(prompt, _summary_config).strip()
