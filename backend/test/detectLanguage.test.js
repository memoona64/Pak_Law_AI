const test = require('node:test');
const assert = require('node:assert/strict');
const { detectLanguage } = require('../utils/detectLanguage');

test('detects Urdu script regardless of any Latin characters mixed in', () => {
  assert.equal(detectLanguage('میرا FIR درج نہیں ہو رہا'), 'ur');
});

test('detects Roman Urdu from common function words', () => {
  assert.equal(detectLanguage('police FIR darj nahi kar rahi hai'), 'roman_ur');
});

test('defaults to English for ordinary English text', () => {
  assert.equal(detectLanguage('What does Section 154 CrPC say about FIRs?'), 'en');
});

test('defaults to English for empty or missing input', () => {
  assert.equal(detectLanguage(''), 'en');
  assert.equal(detectLanguage(undefined), 'en');
});

test('a single incidental Roman-Urdu-like word does not flip an English sentence', () => {
  // "ka" alone is common enough to appear by coincidence; the ratio check
  // should keep a mostly-English sentence classified as English.
  assert.equal(detectLanguage('Is there a case called State ka versus someone'), 'en');
});
