// Shared between Flows.jsx and FlowDetail.jsx. Each flow in
// backend/data/flows.json carries real English, Urdu, and Roman Urdu text
// (not machine-translated), so this choice actually changes what /api/flows
// returns. Persisted so FlowDetail opens in the same language a flow was
// browsed in.
export const FLOW_LANG_KEY = 'paklaw_flow_lang';

export const FLOW_LANGS = [
  { id: 'en', label: 'English' },
  { id: 'ur', label: 'اردو' },
  { id: 'roman_ur', label: 'Roman Urdu' },
];

export const getSavedFlowLang = () => {
  try {
    const saved = localStorage.getItem(FLOW_LANG_KEY);
    return FLOW_LANGS.some(l => l.id === saved) ? saved : 'en';
  } catch {
    return 'en';
  }
};
