import logging
import os
from dotenv import load_dotenv
import google.generativeai as genai
from .prompts import SYSTEM_PROMPT

load_dotenv()

logger = logging.getLogger("uvicorn.error")

# "gemini-3.6-flash" does not exist as a model name — every call would fail
# with an invalid-model error even with a valid key. Overridable via env in
# case the default needs to move to a newer model later.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Chunks vary a lot in size (some large, some small), so we cap the total
# context we send instead of assuming every chunk is roughly the same length.
MAX_CONTEXT_CHARS = 12000

_model = None


def _get_model():
    """Lazily create the Gemini client (mirrors reranker.py's lazy loading)
    so importing this module never fails just because no key is configured
    yet — only an actual generation attempt notices."""
    global _model
    if _model is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=SYSTEM_PROMPT)
    return _model


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
        response = _get_model().generate_content(prompt)
        return response.text
    except Exception as exc:
        logger.warning("Gemini generation unavailable: %s", exc)
        return (
            "A generated answer isn't available right now — see the matched legal "
            "sources below. This is general legal information, not a substitute for "
            "professional legal advice."
        )