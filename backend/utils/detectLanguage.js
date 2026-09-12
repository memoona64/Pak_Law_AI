// A rough guess at what language a query was typed in, used only to label
// entries on the live-usage dashboard. Nothing in retrieval or generation
// depends on this — FastAPI's own query_normalizer.js does the real,
// authoritative language handling, but it never reports back a language
// label, so this exists purely so the dashboard has something to group by.
// Not authoritative: a short or ambiguous query can easily guess wrong.

const URDU_SCRIPT_PATTERN = /[؀-ۿ]/;

// Common Roman Urdu function words - enough to catch typical phrasing
// without needing a real language-ID model.
const ROMAN_URDU_WORDS = [
  'kya', 'hai', 'hain', 'nahi', 'nahin', 'kar', 'kaise', 'mera', 'meri',
  'mujhe', 'kyun', 'raha', 'rahi', 'rahe', 'karna', 'chahta', 'chahti',
  'diya', 'gaya', 'wala', 'wali', 'ka', 'ki', 'ke', 'ko', 'se', 'main',
];

// Guesses "ur" (Urdu script), "roman_ur" (Roman Urdu), or "en" (default)
// from raw query text.
function detectLanguage(text) {
  const value = String(text || '');
  if (URDU_SCRIPT_PATTERN.test(value)) {
    return 'ur';
  }
  const words = value.toLowerCase().match(/[a-z]+/g) || [];
  const romanUrduHits = words.filter((word) => ROMAN_URDU_WORDS.includes(word)).length;
  if (romanUrduHits > 0 && romanUrduHits / Math.max(words.length, 1) >= 0.15) {
    return 'roman_ur';
  }
  return 'en';
}

module.exports = { detectLanguage };
