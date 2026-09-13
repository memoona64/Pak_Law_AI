"""Detects which of English / Urdu script / Roman Urdu a query was written
in, so generation.py can give Gemini an explicit, unambiguous instruction
for which one to answer in — instead of relying on the model to infer it
correctly from a short, possibly ambiguous query on its own, which was
observed to be inconsistent for Roman Urdu (sometimes answered in Urdu
script or English instead).

This is independent from query_normalizer.py, which rewrites a query into
English legal search terms for retrieval matching — a different concern
that happens to also need to tell Roman Urdu apart from English, but never
reports that classification back to anything else.
"""

import re

URDU_SCRIPT_PATTERN = re.compile(r"[؀-ۿ]")

# Common Roman Urdu function words - enough to catch typical phrasing
# without needing a real language-ID model. Mirrors backend/utils/
# detectLanguage.js's word list (kept in sync by hand, not shared code,
# since one is Python and the other Node).
ROMAN_URDU_WORDS = {
    "kya", "hai", "hain", "nahi", "nahin", "kar", "kaise", "mera", "meri",
    "mujhe", "kyun", "raha", "rahi", "rahe", "karna", "chahta", "chahti",
    "diya", "gaya", "wala", "wali", "ka", "ki", "ke", "ko", "se", "main",
    "hoon", "tha", "thi", "the", "aur", "liye", "sakta", "sakti", "kaha",
}

WORD_PATTERN = re.compile(r"[a-z]+")


def detect_language(text: str) -> str:
    """Return "ur" (Urdu script), "roman_ur" (Roman Urdu), or "en" (default)."""
    value = text or ""
    if URDU_SCRIPT_PATTERN.search(value):
        return "ur"

    words = WORD_PATTERN.findall(value.lower())
    if not words:
        return "en"

    roman_urdu_hits = sum(1 for word in words if word in ROMAN_URDU_WORDS)
    if roman_urdu_hits > 0 and roman_urdu_hits / len(words) >= 0.15:
        return "roman_ur"

    return "en"


# One explicit, unambiguous directive per detected language, prepended to
# every generation prompt so the model doesn't have to infer the right
# language/script purely from a short or ambiguous query on its own.
LANGUAGE_DIRECTIVES = {
    "ur": (
        "IMPORTANT: The user's question below is written in Urdu script. "
        "Your entire answer MUST be in Urdu script too. Do not switch to "
        "English or Roman Urdu."
    ),
    "roman_ur": (
        "IMPORTANT: The user's question below is written in Roman Urdu "
        "(Urdu words spelled in Latin/English letters, e.g. 'kya', "
        "'nahi', 'mera'). Your entire answer MUST also be in Roman Urdu, "
        "using the same Latin-letter spelling style. Do not switch to "
        "Urdu script or English."
    ),
    "en": (
        "IMPORTANT: The user's question below is written in English. "
        "Your entire answer MUST be in English."
    ),
}


def language_directive(text: str) -> str:
    """The directive line to prepend for whatever language `text` is in."""
    return LANGUAGE_DIRECTIVES[detect_language(text)]
