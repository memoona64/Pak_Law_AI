import React from 'react';
import { Icon, Chip, Btn, Eyebrow, Disclaimer } from '../components/primitives';
import { PLSeal } from '../components/seal';
import AppSidebar from '../components/AppSidebar';

// The real FastAPI retrieval service (hybrid BM25 + vector search over the
// actual corpus, plus a Gemini-generated answer grounded in the retrieved
// sections). Override via a .env file (VITE_RAG_API_URL) if the service
// runs somewhere other than localhost.
const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://127.0.0.1:8000';

// Chat interface — the hero. Sidebar + central messages with expandable citation pills.
export default function ChatScreen() {
  const [lang, setLang] = React.useState('en'); // 'en' | 'ur' | 'ru'
  const [expanded, setExpanded] = React.useState({ 'c1': true });
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);

  // Sample messages — a mix of English, Urdu, Roman Urdu
  const [messages, setMessages] = React.useState([
    {
      id: 'm1', role: 'user',
      lang: 'ur', time: '11:04',
      text: 'اگر کوئی شخص کسی جائیداد پر ناجائز قبضہ کر لے تو مالک کے پاس PPC کی کون سی دفعات کے تحت کارروائی کے اختیارات ہیں؟',
    },
    {
      id: 'a1', role: 'assistant',
      plain: 'Yes — you can take action. If someone occupies your property without permission, you can file a police report for criminal trespass, and separately ask a court to make them pay for any damage.',
      body: (
        <>
          <p>
            Under the <em>Pakistan Penal Code, 1860</em>, the aggrieved owner may proceed on <strong>two parallel tracks</strong>. The primary criminal remedy sits under Chapter XVII — Offences Against Property.
          </p>
          <ol className="mt-3 space-y-1.5 list-decimal pl-5 marker:text-[#6B7F5E] marker:font-serif">
            <li><strong>Criminal trespass</strong> — <em>PPC §441</em> and its aggravated form <em>§447</em> (punishable with imprisonment up to three months or fine to five thousand rupees, or both).</li>
            <li><strong>Mischief / dishonest misappropriation</strong> — <em>PPC §425</em> read with <em>§403</em> where the property has been diminished in value.</li>
          </ol>
        </>
      ),
      citations: [
        { id: 'c1', act: 'Pakistan Penal Code, 1860', section: '§441', title: 'Criminal trespass', verbatim: '"Whoever enters into or upon property in the possession of another with intent to commit an offence or to intimidate, insult or annoy any person in possession of such property … is said to commit criminal trespass."', year: '1860', jurisdiction: 'Federal', amendedUpTo: '2016', corpusVersion: 'v3.2' },
          { id: 'c2', act: 'Pakistan Penal Code, 1860', section: '§447', title: 'Punishment for criminal trespass', verbatim: '"Whoever commits criminal trespass shall be punished with imprisonment of either description for a term which may extend to three months, or with fine which may extend to five thousand rupees, or with both."', amendedUpTo: '2016', corpusVersion: 'v3.2' },
      ],
    },
    {
      id: 'm2', role: 'user',
      lang: 'ru', time: '11:06',
      text: 'Achha, aur agar qabza karnay wala mukamil ghar par forcefully qabza kar chuka ho — us case mein police FIR register karnay se inkar kar sakti hai?',
    },
    {
      id: 'a2', role: 'assistant',
      plain: 'No, the police cannot legally refuse. They must register your FIR the same day. If they still refuse, you can complain to their senior officer, or go straight to a Justice of Peace, who can order the police to register it.',
      body: (
        <>
          <p>
            No — under <em>§154 CrPC</em> the officer in charge is <strong>bound to register</strong> any information disclosing a cognisable offence. Refusal is itself actionable.
          </p>
          <p className="mt-2">
            The complainant's remedies escalate in this order:
          </p>
          <ul className="mt-2 space-y-1 pl-5 list-['—__'] marker:text-[#6B7F5E]">
            <li>Written complaint to the SP under <em>§154(3) CrPC</em>.</li>
            <li>Application to the Justice of Peace under <em>§22-A(6) CrPC</em>, Lahore / Karachi jurisdiction.</li>
            <li>Constitutional petition under <em>Art. 199</em> for a writ of mandamus.</li>
          </ul>
        </>
      ),
      citations: [
        { id: 'c5', act: 'Code of Criminal Procedure, 1898', section: '§154', title: 'Information in cognisable cases', verbatim: '"Every information relating to the commission of a cognisable offence, if given orally to an officer in charge of a police-station, shall be reduced to writing …"', amendedUpTo: '2016', corpusVersion: 'v3.2' },
        { id: 'c6', act: 'Code of Criminal Procedure, 1898', section: '§22-A(6)', title: 'Powers of Justice of Peace', verbatim: '"The Justice of Peace shall, on a complaint … issue appropriate directions to the police authorities …"', amendedUpTo: '2016', corpusVersion: 'v3.2' },
      ],
    },
  ]);

  // Sends the typed question to the real retrieval service and shows both
  // the generated answer and the matching corpus sections it was grounded
  // in. If generation is unavailable (no API key, quota, network), the
  // service itself returns an honest fallback message instead of an answer.
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const askedLang = lang;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', lang: askedLang, time, text }]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch(`${RAG_API_URL}/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, use_reranker: false, normalize: true }),
      });
      if (!res.ok) throw new Error(`Retrieval service returned ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: `r-${Date.now()}`,
        role: 'retrieval',
        answer: data.answer,
        chunks: data.chunks || [],
        normalizedQuery: data.normalized_query,
        originalQuery: text,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `note-${Date.now()}`,
        role: 'note',
        text: "Couldn't reach the retrieval service — make sure it's running, then try again.",
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden text-[#2A2F22] font-sans">
      {/* SIDEBAR */}
      <AppSidebar />

      {/* MAIN CHAT COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-14 border-b rule-hair flex items-center gap-2 px-4 sm:px-6 bg-[#F7F6F0]/95 backdrop-blur">
          <div className="font-serif text-[17px] leading-none truncate">FIR — Section 302 PPC · Karachi</div>
          <Chip tone="flag" icon="alert-triangle" className="shrink-0">Example</Chip>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-auto pl-scroll">
          <div className="max-w-[840px] mx-auto px-8 py-8 space-y-8">
            <Disclaimer />

            {messages.map(m => (
              m.role === 'user' ? <UserMessage key={m.id} m={m} lang={m.lang} />
                : m.role === 'note' ? <SystemNote key={m.id} text={m.text} />
                : m.role === 'retrieval' ? <RetrievalResult key={m.id} m={m} expanded={expanded} setExpanded={setExpanded} />
                : <AssistantMessage key={m.id} m={m} expanded={expanded} setExpanded={setExpanded} />
            ))}

            {/* Assistant is typing indicator — only while a send is in flight */}
            {sending && (
              <div className="flex items-center gap-3 text-[14px] text-[#7A7D68]">
                <div className="w-8 h-8 rounded-full bg-[#2A2F22] flex items-center justify-center">
                  <div className="w-3.5 h-3.5"><PLSeal size={22} tone="espresso" ring={false}/></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5E] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5E] animate-pulse" style={{ animationDelay: '150ms' }}/>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5E] animate-pulse" style={{ animationDelay: '300ms' }}/>
                  <span className="ml-2 italic">Looking through the law …</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t rule-hair bg-[#F7F6F0]">
          <div className="max-w-[840px] mx-auto px-8 py-5">
            {/* Language toggle */}
            <div className="mb-3">
              <LangToggle lang={lang} setLang={setLang} />
            </div>

            <div className="rounded-xl border border-[#D8D9C8] bg-white/70 focus-within:border-[#6B7F5E] transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                placeholder={{
                  en: 'Ask about a statute, judgment, or draft… e.g. "Compare §302 vs §316 PPC for qatl-i-amd."',
                  ur: '…کوئی سوال پوچھیں، مثلاً "302 اور 316 دفعات میں فرق کیا ہے؟"',
                  ru: 'Sawal poochein… e.g. "Section 302 aur 316 PPC mein farq kya hai?"'
                }[lang]}
                className={`w-full resize-none bg-transparent p-4 text-[16px] text-[#2A2F22] placeholder-[#7A7D68] focus:outline-none ${lang === 'ur' ? 'text-right font-nastaliq text-[17px]' : ''}`}
                dir={lang === 'ur' ? 'rtl' : 'ltr'}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <ComposerIcon name="paperclip" tip="Attach a document — coming soon" disabled />
                  <button
                    disabled
                    title="Voice input — coming soon"
                    className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[14px] font-medium text-[#A6A896] cursor-not-allowed"
                  >
                    <Icon name="mic" size={13} stroke={2}/>
                    Voice
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-[#7A7D68] font-mono-jb">Ctrl + ↵</span>
                  <Btn variant="primary" size="sm" iconRight="arrow-up" onClick={handleSend} disabled={!input.trim() || sending}>Ask</Btn>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[14px] text-[#7A7D68]">
              <div className="flex items-center gap-1.5"><Icon name="shield-check" size={12} color="#6B7F5E" />Avoid sharing your CNIC or phone number in questions. Answers cite primary sources.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Messages ----
// Honest placeholder shown after a send, since there's no live answering service yet.
function SystemNote({ text }) {
  return (
    <div className="flex justify-center">
      <div className="max-w-[520px] text-center text-[14px] text-[#7A7D68] italic bg-[#F0EFE3] border border-[#DFE0CE] rounded-full px-4 py-2">
        {text}
      </div>
    </div>
  );
}

// Real results from the retrieval service — the generated answer (if any)
// plus the matched corpus sections it's grounded in.
function RetrievalResult({ m, expanded, setExpanded }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 shrink-0 rounded-full bg-[#2A2F22] flex items-center justify-center">
        <PLSeal size={30} tone="espresso" ring={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <div className="font-serif text-[14px]">PakLaw AI</div>
          <Chip tone="taupe" icon="search">{m.chunks.length} matching section{m.chunks.length === 1 ? '' : 's'}</Chip>
        </div>
        <div className="bg-[#F7F6F0] border border-[#DFE0CE] rounded-2xl rounded-tl-md px-5 py-4 text-[16px] leading-[1.7] text-[#2A2F22]">
          {m.answer && <p>{m.answer}</p>}
          <p className={`text-[#4A5540] ${m.answer ? 'mt-3 text-[14px]' : 'italic'}`}>
            {m.answer
              ? 'Matching sections this answer is grounded in:'
              : 'Here are the closest matching sections from Pakistani law:'}
          </p>
          {m.normalizedQuery && m.normalizedQuery !== m.originalQuery && (
            <p className="mt-2 text-[14px] text-[#7A7D68]">Searched for: <span className="italic">"{m.normalizedQuery}"</span></p>
          )}
          {m.chunks.length === 0 ? (
            <p className="mt-3 text-[#4A5540]">No matching sections were found for this question.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {m.chunks.map(c => (
                <RetrievedChunk key={c.id} c={c}
                                expanded={!!expanded[c.id]}
                                onToggle={() => setExpanded(e => ({ ...e, [c.id]: !e[c.id] }))} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RetrievedChunk({ c, expanded, onToggle }) {
  const meta = c.metadata || {};
  return (
    <div className={`rounded-lg border transition-colors ${expanded ? 'bg-white border-[#6B7F5E]/40' : 'bg-[#F2F1E6]/60 border-[#DFE0CE] hover:border-[#6B7F5E]/40'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left">
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center border bg-[#EDE9D5] border-[#B9C2A0] text-[#4A5540]">
          <Icon name="book-marked" size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-[14px] text-[#2A2F22]">{meta.act}</span>
            <span className="text-[14px] font-mono-jb text-[#6B7F5E]">§{meta.section}</span>
          </div>
          <div className="text-[14px] text-[#4A5540] truncate mt-0.5">{meta.section_title}</div>
        </div>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#7A7D68" />
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1">
          <div className="border-l-2 border-[#6B7F5E] pl-4 py-1">
            <p className="font-serif text-[16px] leading-[1.65] text-[#363B2C]">{c.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMessage({ m, lang }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="flex items-center justify-end gap-2 mb-1.5">
          <Chip tone="outline" className="!text-[14px] !py-0.5">
            {lang === 'ur' ? 'اردو' : lang === 'ru' ? 'Roman Urdu' : 'English'}
          </Chip>
          <span className="text-[14px] text-[#7A7D68]">You · {m.time}</span>
        </div>
        <div className={`bg-[#2A2F22] text-[#F7F6F0] px-5 py-3.5 rounded-2xl rounded-tr-md text-[16px] leading-[1.6] ${lang === 'ur' ? 'font-nastaliq text-[18px] text-right' : ''}`}
             dir={lang === 'ur' ? 'rtl' : 'ltr'}>
          {m.text}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ m, expanded, setExpanded }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 shrink-0 rounded-full bg-[#2A2F22] flex items-center justify-center">
        <PLSeal size={30} tone="espresso" ring={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <div className="font-serif text-[14px]">PakLaw AI</div>
          <Chip tone="ok" icon="shield-check" title="This answer is backed by real, quoted sources, not made up.">Backed by {m.citations.length} sources</Chip>
          <span className="text-[14px] text-[#7A7D68]">11:04 · 1.8s</span>
        </div>

        {/* Answer body — editorial serif quotes, editorial spacing */}
        <div className="bg-[#F7F6F0] border border-[#DFE0CE] rounded-2xl rounded-tl-md px-5 py-4 text-[16px] leading-[1.7] text-[#2A2F22]">
          {m.plain && (
            <div className="mb-4 pb-4 border-b rule-hair">
              <Eyebrow>In simple words</Eyebrow>
              <p className="mt-1.5 text-[17px] leading-[1.6]">{m.plain}</p>
            </div>
          )}
          {m.plain && <Eyebrow className="mb-1.5">The legal detail</Eyebrow>}
          <div className="prose prose-sm max-w-none [&_em]:text-[#4A5540] [&_em]:not-italic [&_em]:font-serif [&_strong]:text-[#2A2F22]">
            {m.body}
          </div>

          {/* Citations pill row */}
          <div className="mt-4 pt-4 border-t rule-hair">
            <Eyebrow className="mb-2.5">Sources</Eyebrow>
            <div className="space-y-2">
              {m.citations.map(c => (
                <CitationPill key={c.id} c={c}
                              expanded={!!expanded[c.id]}
                              onToggle={() => setExpanded(e => ({ ...e, [c.id]: !e[c.id] }))} />
              ))}
            </div>
          </div>

          {/* Answer footer actions */}
          <div className="mt-4 flex items-center gap-1">
            <IconBtn name="copy" tip="Copy" />
            <IconBtn name="thumbs-up" tip="Helpful" />
            <IconBtn name="thumbs-down" tip="Not helpful" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CitationPill({ c, expanded, onToggle }) {
  return (
    <div className={`rounded-lg border transition-colors ${expanded ? 'bg-white border-[#6B7F5E]/40' : 'bg-[#F2F1E6]/60 border-[#DFE0CE] hover:border-[#6B7F5E]/40'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left">
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center border bg-[#EDE9D5] border-[#B9C2A0] text-[#4A5540]">
          <Icon name="book-marked" size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-[14px] text-[#2A2F22]">{c.act}</span>
            <span className="text-[14px] font-mono-jb text-[#6B7F5E]">{c.section}</span>
          </div>
          <div className="text-[14px] text-[#4A5540] truncate mt-0.5">{c.title}</div>
        </div>
        <div className="flex items-center gap-3 text-[14px] text-[#7A7D68]">
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} />
        </div>
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1">
          <div className="border-l-2 border-[#6B7F5E] pl-4 py-1">
            <div className="smallcaps text-[14px] text-[#6B7F5E] mb-1">Exact wording of the law</div>
            <p className="font-serif text-[16px] leading-[1.65] text-[#363B2C] italic">{c.verbatim}</p>
          </div>
          <div className="mt-3 text-[14px] text-[#4A5540] inline-flex items-center gap-1">
            <Icon name="calendar" size={11}/> Last amended {c.amendedUpTo}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Bits ----
function LangToggle({ lang, setLang }) {
  const opts = [
    { id: 'en', label: 'English', hint: 'EN' },
    { id: 'ur', label: 'اردو', hint: 'UR' },
    { id: 'ru', label: 'Roman Urdu', hint: 'RU' },
  ];
  return (
    <div className="inline-flex items-center bg-white/70 border border-[#D8D9C8] rounded-full p-1 h-9">
      <span className="pl-2 pr-1 text-[#7A7D68]"><Icon name="languages" size={13} /></span>
      {opts.map(o => (
        <button key={o.id} onClick={() => setLang(o.id)}
                className={`h-7 px-3 rounded-full text-[14px] font-medium transition-colors ${lang === o.id ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'text-[#3A3D2E] hover:text-[#2A2F22]'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}


function ComposerIcon({ name, tip, disabled }) {
  return (
    <button
      title={tip}
      disabled={disabled}
      className={`w-8 h-8 rounded-md flex items-center justify-center ${disabled ? 'text-[#A6A896] cursor-not-allowed' : 'text-[#4A5540] hover:bg-[#F0EFE3] hover:text-[#2A2F22]'}`}
    >
      <Icon name={name} size={14} />
    </button>
  );
}

function IconBtn({ name, tip }) {
  return (
    <button title={tip} className="w-7 h-7 rounded-md flex items-center justify-center text-[#83866F] hover:bg-[#F0EFE3] hover:text-[#2A2F22]">
      <Icon name={name} size={13} />
    </button>
  );
}
