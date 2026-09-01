import os
from dotenv import load_dotenv
import google.generativeai as genai
from .prompts import SYSTEM_PROMPT

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.6-flash", system_instruction=SYSTEM_PROMPT)

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
    context = format_context(chunks)
    prompt = f"USER QUESTION:\n{query}\n\nRETRIEVED LEGAL CONTEXT:\n{context}"
    response = model.generate_content(prompt)
    return response.text