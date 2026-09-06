import json
import os
import re
from dotenv import load_dotenv
import google.generativeai as genai
from .prompts import CLAUSE_ANALYSIS_PROMPT, DOCUMENT_SUMMARY_PROMPT, SYSTEM_PROMPT

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.6-flash", system_instruction=SYSTEM_PROMPT)
clause_model = genai.GenerativeModel("gemini-3.6-flash", system_instruction=CLAUSE_ANALYSIS_PROMPT)
summary_model = genai.GenerativeModel("gemini-3.6-flash", system_instruction=DOCUMENT_SUMMARY_PROMPT)

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


def analyze_clause(clause_text: str, chunks) -> dict:
    """Ask Gemini to classify one document clause's risk against retrieved law.

    Returns {"risk": "ok"|"warn"|"flag", "note": str, "obligation": dict|None}.
    Falls back to a "warn" result (rather than raising) if the model's
    response isn't valid JSON, so one bad clause doesn't stop the rest.
    """
    context = format_context(chunks) if chunks else "(no matching legal context found)"
    prompt = f"CLAUSE TEXT:\n{clause_text}\n\nRETRIEVED LEGAL CONTEXT:\n{context}"
    response = clause_model.generate_content(prompt)
    raw = _JSON_FENCE.sub("", response.text.strip())

    try:
        parsed = json.loads(raw)
        risk = parsed.get("risk")
        if risk not in VALID_RISK_LEVELS:
            raise ValueError(f"unexpected risk level: {risk!r}")
        return {
            "risk": risk,
            "note": parsed.get("note", ""),
            "obligation": parsed.get("obligation"),
        }
    except (json.JSONDecodeError, ValueError, AttributeError):
        return {
            "risk": "warn",
            "note": "Could not parse the model's analysis for this clause.",
            "obligation": None,
        }


def summarize_document(document_text: str, flagged_notes: list[str]) -> str:
    """Write the plain-language document summary: what it is and what it obligates you to."""
    concerns = "\n".join(f"- {note}" for note in flagged_notes) or "(none flagged)"
    prompt = (
        f"DOCUMENT TEXT:\n{document_text[:MAX_SUMMARY_CHARS]}\n\n"
        f"CLAUSES FLAGGED AS RISKY:\n{concerns}"
    )
    return summary_model.generate_content(prompt).text.strip()