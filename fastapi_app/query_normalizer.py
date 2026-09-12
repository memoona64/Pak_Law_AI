"""
Query Normalizer for PakLaw AI.
Rewrites Roman Urdu / Urdu script / mixed queries into clean English legal search terms.
Supports Gemini, Groq, and OpenAI API keys from environment variables.
Gracefully degrades to offline dictionary or original query if no API key is set.
"""

import json
import logging
import os
import re
import time
import urllib.error
import urllib.request

PROMPT_TEMPLATE = """You are a legal search query normalizer for Pakistani law.
Translate and rewrite the following user question (which may be in Roman Urdu, Urdu script, or mixed language) into concise, clean English legal search terms.
Keep any legal section numbers, act names, or specific legal terms (such as Section 302, CrPC, PPC, Talaq, Khula, FIR) intact.
Output ONLY the rewritten English search query. Do not include explanations, quotes, or markdown.

User Question: {query}
Rewritten Legal Query:"""

logger = logging.getLogger("uvicorn.error")

# Offline fallback dictionary for common Roman Urdu / Urdu legal terms
FALLBACK_DICT = {
    "police fir darj nahi kar rahi": "police refusal to register FIR section 154 CrPC",
    "fir darj nahi kar rahe": "police refusal to register FIR section 154 CrPC",
    "talaq ka procedure": "divorce procedure Muslim Family Laws Ordinance talaq",
    "talaq ka tarika": "divorce procedure Muslim Family Laws Ordinance talaq",
    "khula ka procedure": "khula dissolution of marriage family law",
    "landlord ghar se nikal raha hai": "illegal eviction tenant landlord Sindh Rented Premises",
    "makan malik nikal raha hai": "illegal eviction tenant landlord Sindh Rented Premises",
    "chori ki saza": "punishment for theft section 378 379 PPC",
    "murder ki saza": "punishment for murder section 302 PPC",
    "qatl ki saza": "punishment for murder section 302 PPC",
    "zaminaat": "bail Section 496 497 CrPC",
}

# Terms a user might reasonably ask about that the corpus itself never uses
# verbatim, so translating/rewriting the query alone doesn't help retrieval -
# "khula" is a real, correct legal term (kept intact by PROMPT_TEMPLATE on
# purpose, since the user-facing answer should still say "khula"), but MFLO's
# actual text just says "dissolve the marriage otherwise than by talaq" and
# never uses the word "khula" anywhere, so BM25/vector search has nothing to
# match it against. Appended (not substituted) to whatever the query
# normalizes to, on every path (LLM success, offline fallback, or neither),
# so the corpus's real wording rides along regardless of how the rest of the
# query got normalized.
KEYWORD_BRIDGES = {
    "khula": "wife delegated right to divorce dissolve marriage otherwise than by talaq Muslim Family Laws Ordinance section 8",
}


def _bridge_known_corpus_gaps(original_query: str, normalized_query: str) -> str:
    lower_original = original_query.lower()
    extras = [
        bridge
        for term, bridge in KEYWORD_BRIDGES.items()
        if re.search(rf"\b{re.escape(term)}\b", lower_original)
    ]
    if not extras:
        return normalized_query
    return f"{normalized_query} {' '.join(extras)}"


def normalize_query(query: str) -> tuple[str, bool]:
    """
    Normalizes a query into English legal search terms.
    Returns (normalized_query, were_llm_used).
    """
    clean_query = query.strip()
    if not clean_query:
        return clean_query, False

    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    # Failures are logged, never silent. A silently failing normalizer looks
    # identical to poor retrieval, which is how a dead model name went
    # unnoticed while every Roman Urdu query quietly degraded.
    if gemini_key:
        try:
            normalized = _call_gemini(clean_query, gemini_key)
            return _bridge_known_corpus_gaps(clean_query, normalized), True
        except Exception as exc:
            logger.warning("Query normalization via Gemini failed: %s", exc)

    if groq_key:
        try:
            normalized = _call_groq(clean_query, groq_key)
            return _bridge_known_corpus_gaps(clean_query, normalized), True
        except Exception as exc:
            logger.warning("Query normalization via Groq failed: %s", exc)

    if openai_key:
        try:
            normalized = _call_openai(clean_query, openai_key)
            return _bridge_known_corpus_gaps(clean_query, normalized), True
        except Exception as exc:
            logger.warning("Query normalization via OpenAI failed: %s", exc)

    # Offline / No API Key Fallback
    lower_q = clean_query.lower()
    for pattern, replacement in FALLBACK_DICT.items():
        if pattern in lower_q:
            return _bridge_known_corpus_gaps(clean_query, replacement), False

    return _bridge_known_corpus_gaps(clean_query, clean_query), False


def _call_gemini(query: str, api_key: str) -> str:
    # Must stay in step with generation.py's GEMINI_MODEL. This was pinned to
    # gemini-2.5-flash, which now returns 404 "no longer available to new
    # users" — so normalization silently failed and every Roman Urdu query was
    # searched as raw Roman Urdu against English legal text.
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": PROMPT_TEMPLATE.format(query=query)}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 60},
    }
    data = json.dumps(payload).encode("utf-8")

    # One retry for transient failures. Gemini returns 503 when overloaded, and
    # a single 503 otherwise silently degrades a Roman Urdu query into an
    # untranslated search against English law. Quota errors (429) are NOT
    # retried — retrying only burns more of a limit that is already exhausted.
    last_error: Exception | None = None
    for attempt in (1, 2):
        req = urllib.request.Request(
            url, data=data, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode("utf-8"))
                text = res["candidates"][0]["content"]["parts"][0]["text"].strip()
                return text if text else query
        except urllib.error.HTTPError as exc:
            if exc.code == 429 or attempt == 2:
                raise
            last_error = exc
            logger.warning("Normalization attempt %s failed (%s), retrying", attempt, exc)
            time.sleep(1)
        except Exception as exc:
            if attempt == 2:
                raise
            last_error = exc
            logger.warning("Normalization attempt %s failed (%s), retrying", attempt, exc)
            time.sleep(1)

    raise last_error or RuntimeError("Gemini normalization failed after retries")


def _call_groq(query: str, api_key: str) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": PROMPT_TEMPLATE.format(query=query)}],
        "temperature": 0.1,
        "max_tokens": 60,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        res = json.loads(response.read().decode("utf-8"))
        text = res["choices"][0]["message"]["content"].strip()
        return text if text else query


def _call_openai(query: str, api_key: str) -> str:
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": PROMPT_TEMPLATE.format(query=query)}],
        "temperature": 0.1,
        "max_tokens": 60,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        res = json.loads(response.read().decode("utf-8"))
        text = res["choices"][0]["message"]["content"].strip()
        return text if text else query