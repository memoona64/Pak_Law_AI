"""
Query Normalizer for PakLaw AI.
Rewrites Roman Urdu / Urdu script / mixed queries into clean English legal search terms.
Supports Gemini, Groq, and OpenAI API keys from environment variables.
Gracefully degrades to offline dictionary or original query if no API key is set.
"""

import json
import os
import urllib.error
import urllib.request

PROMPT_TEMPLATE = """You are a legal search query normalizer for Pakistani law.
Translate and rewrite the following user question (which may be in Roman Urdu, Urdu script, or mixed language) into concise, clean English legal search terms.
Keep any legal section numbers, act names, or specific legal terms (such as Section 302, CrPC, PPC, Talaq, Khula, FIR) intact.
Output ONLY the rewritten English search query. Do not include explanations, quotes, or markdown.

User Question: {query}
Rewritten Legal Query:"""

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

    if gemini_key:
        try:
            return _call_gemini(clean_query, gemini_key), True
        except Exception:
            pass

    if groq_key:
        try:
            return _call_groq(clean_query, groq_key), True
        except Exception:
            pass

    if openai_key:
        try:
            return _call_openai(clean_query, openai_key), True
        except Exception:
            pass

    # Offline / No API Key Fallback
    lower_q = clean_query.lower()
    for pattern, replacement in FALLBACK_DICT.items():
        if pattern in lower_q:
            return replacement, False

    return clean_query, False


def _call_gemini(query: str, api_key: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": PROMPT_TEMPLATE.format(query=query)}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 60},
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        res = json.loads(response.read().decode("utf-8"))
        text = res["candidates"][0]["content"]["parts"][0]["text"].strip()
        return text if text else query


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
