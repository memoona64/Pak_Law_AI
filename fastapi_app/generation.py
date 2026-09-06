import json
import os
import re
from dotenv import load_dotenv
import google.generativeai as genai
from .prompts import CLAUSE_ANALYSIS_PROMPT, DOCUMENT_SUMMARY_PROMPT, SYSTEM_PROMPT

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# The free tier caps requests per day per model, so switching models is the
# quickest way to recover from an exhausted quota. Set GEMINI_MODEL in .env.
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

model = genai.GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PROMPT)
clause_model = genai.GenerativeModel(MODEL_NAME, system_instruction=CLAUSE_ANALYSIS_PROMPT)
summary_model = genai.GenerativeModel(MODEL_NAME, system_instruction=DOCUMENT_SUMMARY_PROMPT)

VALID_RISK_LEVELS = {"ok", "warn", "flag"}
MAX_SUMMARY_CHARS = 8000
_JSON_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)

# Chunks vary a lot in size (some large, some small), so we cap the total
# context we send instead of assuming every chunk is roughly the same length.
MAX_CONTEXT_CHARS = 12000


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
    """Take the user's question + retrieved chunks, ask Gemini for a grounded answer."""
    if not chunks:
        return (
            "I couldn't find relevant Pakistani legal sources for this question in the database. "
            "You may want to rephrase your question or consult a qualified legal professional. "
            "This is general legal information, not a substitute for professional legal advice."
        )

    context = format_context(chunks)
    prompt = f"USER QUESTION:\n{query}\n\nRETRIEVED LEGAL CONTEXT:\n{context}"
    response = model.generate_content(prompt)
    return response.text


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
    """Classify several clauses against their retrieved law in ONE Gemini call.

    Each item is {"clause_number": str, "text": str, "chunks": list}. Returns
    one result per item, in the same order. Batching matters: a call per
    clause exhausts the free API tier quickly on a real document.
    """
    blocks = []
    for item in items:
        context = format_context(item["chunks"]) if item["chunks"] else "(no matching legal context found)"
        blocks.append(
            f"CLAUSE {item['clause_number']}:\n{item['text']}\n\n"
            f"RETRIEVED LEGAL CONTEXT FOR CLAUSE {item['clause_number']}:\n{context}"
        )

    response = clause_model.generate_content("\n\n---\n\n".join(blocks))
    raw = _JSON_FENCE.sub("", response.text.strip())

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            raise ValueError("expected a JSON array of clause results")
    except (json.JSONDecodeError, ValueError, AttributeError):
        return [_unparsed_clause("Could not parse the model's analysis for this clause.") for _ in items]

    # Match on clause number rather than position: the model can drop or
    # reorder entries, and a silently shifted result would attach one clause's
    # risk to another clause's text.
    by_number = {
        str(entry.get("clause_number")): entry for entry in parsed if isinstance(entry, dict)
    }
    return [
        _clause_result(by_number.get(str(item["clause_number"])))
        for item in items
    ]


def summarize_document(document_text: str, flagged_notes: list[str]) -> str:
    """Write the plain-language document summary: what it is and what it obligates you to."""
    concerns = "\n".join(f"- {note}" for note in flagged_notes) or "(none flagged)"
    prompt = (
        f"DOCUMENT TEXT:\n{document_text[:MAX_SUMMARY_CHARS]}\n\n"
        f"CLAUSES FLAGGED AS RISKY:\n{concerns}"
    )
    return summary_model.generate_content(prompt).text.strip()