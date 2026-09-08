import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Eyebrow } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';
import { FLOW_LANG_KEY, FLOW_LANGS, getSavedFlowLang } from '../lib/flowLang';

// The Express backend. Override via a .env file (VITE_API_URL) if it runs
// somewhere other than localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Guided Procedures — a browsable grid of flows by situation.
export default function FlowsScreen() {
  const [flows, setFlows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [lang, setLang] = React.useState(getSavedFlowLang);

  const changeLang = (id) => {
    setLang(id);
    try { localStorage.setItem(FLOW_LANG_KEY, id); } catch { /* best-effort only */ }
  };

  React.useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/flows?lang=${lang}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Flows service returned ${res.status}`);
        setFlows(await res.json());
      })
      .catch((err) => setError(err.message || "Couldn't reach the backend — make sure it's running."))
      .finally(() => setLoading(false));
  }, [lang]);

  const query = search.trim().toLowerCase();
  const visible = query
    ? flows.filter(f => f.title.toLowerCase().includes(query) || f.situation.toLowerCase().includes(query))
    : flows;

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
        {/* Page header */}
        <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b rule-hair">
          <div>
            <Eyebrow>Guided Procedures</Eyebrow>
            <h1 className="mt-2 font-serif text-[30px] sm:text-[42px] leading-[1.05] tracking-[-0.01em]">
              Flows for Pakistani <span className="italic text-[#6B7F5E]">practice.</span>
            </h1>
            <p className="mt-3 text-[16px] text-[#4A5540] max-w-[540px]">
              Each flow walks you through what to do, step by step, in plain language — and shows you exactly which law backs each step.
            </p>
          </div>
          <div className="inline-flex items-center bg-white border border-[#D8D9C8] rounded-md h-9 px-2.5 gap-2 text-[14px] self-start">
            <Icon name="search" size={13} color="#7A7D68" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search flows, statutes…"
              className="bg-transparent focus:outline-none w-40 sm:w-56 placeholder-[#7A7D68]"
            />
          </div>
        </div>

        {/* Body — flow grid */}
        <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8">
          <div className="mb-5">
            <FlowLangToggle lang={lang} setLang={changeLang} />
          </div>

          {loading ? (
            <div className="text-center py-24 text-[16px] text-[#7A7D68]">Loading…</div>
          ) : error ? (
            <ErrorState message={error} />
          ) : visible.length === 0 ? (
            <div className="text-center py-24 text-[16px] text-[#7A7D68]">
              {query ? 'No flows match your search.' : 'No guided flows are available yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {visible.map((f) => (
                <FlowCard key={f.slug} f={f} rtl={lang === 'ur'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlowLangToggle({ lang, setLang }) {
  return (
    <div className="inline-flex items-center bg-white/70 border border-[#D8D9C8] rounded-full p-1 h-9">
      <span className="pl-2 pr-1 text-[#7A7D68]"><Icon name="languages" size={13} /></span>
      {FLOW_LANGS.map(o => (
        <button key={o.id} onClick={() => setLang(o.id)}
                className={`h-7 px-3 rounded-full text-[14px] font-medium transition-colors ${lang === o.id ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'text-[#3A3D2E] hover:text-[#2A2F22]'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 rounded-xl border border-dashed border-[#D8D9C8]">
      <div className="w-16 h-16 rounded-full bg-[#F3DDD5] border border-[#D9A797] flex items-center justify-center">
        <Icon name="alert-triangle" size={26} color="#8A3B24" />
      </div>
      <div className="mt-5 font-serif text-[22px] leading-tight">Couldn't load flows.</div>
      <p className="mt-2 text-[16px] text-[#4A5540] max-w-[360px]">{message}</p>
    </div>
  );
}

function FlowCard({ f, rtl }) {
  return (
    <Link to={`/flows/${f.slug}`} className="block rounded-xl border p-5 relative transition-colors bg-[#F7F6F0] border-[#DFE0CE] hover:border-[#6B7F5E]/40 hover:bg-white">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-[#EDE9D5] border border-[#B9C2A0] flex items-center justify-center shrink-0">
          <Icon name="scroll-text" size={19} color="#4A5540" />
        </div>
        <div className="flex-1 min-w-0" dir={rtl ? 'rtl' : 'ltr'}>
          <div className={`font-serif text-[19px] leading-tight ${rtl ? 'font-nastaliq text-[20px]' : ''}`}>{f.title}</div>
          <div className={`text-[14px] text-[#4A5540] mt-1.5 leading-snug line-clamp-2 ${rtl ? 'font-nastaliq text-[15px]' : ''}`}>{f.situation}</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t rule-hair flex items-center justify-end text-[14px] text-[#4A5540]">
        <span className="inline-flex items-center gap-1 text-[#6B7F5E] font-semibold hover:underline">
          Begin <Icon name="arrow-right" size={12} />
        </span>
      </div>
    </Link>
  );
}
