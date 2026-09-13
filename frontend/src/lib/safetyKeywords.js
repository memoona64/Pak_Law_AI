// Safety keyword trigger (basic, Phase 1) -----------------------------------
// CONSERVATIVE AND NOT EXHAUSTIVE ON PURPOSE. This only catches obvious,
// explicit phrasings of acute danger — suicide/self-harm intent, an assault
// happening right now, an arrest in progress — in English, Urdu script, and
// Roman Urdu. It is a safety net, not a clinical or legal detector; most real
// crisis messages will not match. That's why Safety.jsx is also always
// reachable from the sidebar ("In danger? Get help" in AppSidebar.jsx)
// regardless of whether any of these match.
//
// Pulled into its own module (instead of living inline in Chat.jsx) so it
// has real test coverage — "my husband is killing me" went untested and
// unmatched for a while before being caught, because the violence-verb list
// only had "beating"/"hitting", not "killing". Any change here should come
// with a test using the exact phrase that prompted it.
export const SAFETY_KEYWORDS = [
  // English — suicide / self-harm intent
  /\bkill myself\b/i,
  /\bwant to die\b/i,
  /\bend my life\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(hurt|harm) myself\b/i,
  // English — violence happening right now. Deliberately not anchored to a
  // specific subject (he/she/they/my husband/my wife/...) or tense — just
  // the verb + "me", so it catches "my husband is beating me", "trying to
  // kill me", "he will kill me", etc. regardless of how the sentence around
  // it is phrased.
  /\b(beating|hitting|killing|strangling|choking|stabbing) me\b/i,
  /\b(kill|murder(ing)?) me\b/i,
  /\bbeing beaten\b/i,
  // English — arrest in progress
  /\bpolice (are|is) arresting me\b/i,
  /\bbeing arrested right now\b/i,
  // Roman Urdu
  /\bkhud\s*kushi\b/i,
  /\bmarna chahta\b/i,
  /\bmujhe marna hai\b/i,
  /\bmujhe maar raha hai\b/i,
  /\bmujhe maar dega\b/i,
  // "giraftari"/"giriftari" are both common spellings of the same word —
  // Roman Urdu has no standard orthography.
  /\bgir(a|i)ftari ho rahi hai\b/i,
  // Urdu script
  /خودکشی/,
  /میں مرنا چاہتا ہوں/,
  /مجھے مار رہا ہے/,
  /گرفتاری ہو رہی ہے/,
];

export const matchesSafetyKeyword = (text) => SAFETY_KEYWORDS.some((re) => re.test(text));
