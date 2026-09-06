"""Basic PII masking: CNIC, phone, and email — pattern matching only.

This is not exhaustive PII protection. It does not catch names, addresses,
or PII in formats outside these three patterns — label it "basic masking"
in any UI copy, not "PII protection".
"""

import re
from dataclasses import dataclass, field

CATEGORIES = ("cnic", "phone", "email")

# CNIC: 42101-1234567-1 (5-7-1) or the same 13 digits with no dashes.
CNIC_PATTERN = re.compile(r"\b\d{5}-\d{7}-\d\b|\b\d{13}\b")
# Pakistani mobile: 0300-1234567 / 03001234567 or +92 300 1234567.
PHONE_PATTERN = re.compile(r"\+92[-\s]?3\d{2}[-\s]?\d{7}\b|\b03\d{2}[-\s]?\d{7}\b")
EMAIL_PATTERN = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")


@dataclass
class MaskResult:
    text: str
    counts: dict = field(default_factory=lambda: {category: 0 for category in CATEGORIES})


def _mask_cnic(match: re.Match) -> str:
    digits = re.sub(r"\D", "", match.group(0))
    return f"CNIC-****-*****{digits[-2:]}"


def _mask_phone(match: re.Match) -> str:
    digits = re.sub(r"\D", "", match.group(0))
    return f"PH-***-*****{digits[-2:]}"


def _mask_email(match: re.Match) -> str:
    local, _, domain = match.group(0).partition("@")
    return f"{local[0]}***@{domain}"


def mask_text(text: str) -> MaskResult:
    """Mask CNIC numbers, phone numbers, and email addresses in text.

    Returns the masked text plus a count per category, so callers can show
    exact figures (e.g. "2 CNIC numbers and 1 phone number masked").
    """
    counts = {category: 0 for category in CATEGORIES}

    def _replace(pattern: re.Pattern, category: str, sub) -> None:
        nonlocal text

        def _sub(match: re.Match) -> str:
            counts[category] += 1
            return sub(match)

        text = pattern.sub(_sub, text)

    # Email first: CNIC/phone digit patterns don't occur inside email local
    # parts often, but masking email first avoids any accidental re-matching
    # of digits already replaced by the other two patterns.
    _replace(EMAIL_PATTERN, "email", _mask_email)
    _replace(CNIC_PATTERN, "cnic", _mask_cnic)
    _replace(PHONE_PATTERN, "phone", _mask_phone)

    return MaskResult(text=text, counts=counts)
