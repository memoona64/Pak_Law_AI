import React from 'react';
import { Icon, Chip, Btn, Eyebrow, Disclaimer } from '../components/primitives';
import { PLSeal } from '../components/seal';
import AppSidebar from '../components/AppSidebar';

// The Express backend — it calls FastAPI's retrieval + generation pipeline
// internally and returns a finished answer with citations. Override via a
// .env file (VITE_API_URL) if it runs somewhere other than localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Arabic-script Unicode block (covers Urdu). Used only to decide RTL/Nastaliq
// rendering for what someone actually typed — the backend already detects
// language itself for normalization, so there's no manual language picker
// here; this is purely typography, not a language selection.
const URDU_SCRIPT_RE = /[؀-ۿ]/;
const isUrduScript = (text) => URDU_SCRIPT_RE.test(text);

// Chat interface — the hero. Sidebar + central messages with expandable citation pills.
export default function ChatScreen() {
  const [expanded, setExpanded] = React.useState({});
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const messagesEndRef = React.useRef(null);

  // Keeps the newest message in view instead of leaving it below the fold.
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  // Sends the typed question to the Express backend, which runs retrieval +
  // generation and returns a finished answer with citations.
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', time, text }]);
    setInput('');
    setSending(true);

    const token = localStorage.getItem('paklaw_token');
    if (!token) {
      setMessages(prev => [...prev, {
        id: `note-${Date.now()}`,
        role: 'note',
        text: 'Please sign in to ask a question.',
      }]);
      setSending(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // No language field — the backend detects and normalizes the
        // query's language itself (Roman Urdu / Urdu script / English).
        body: JSON.stringify({ question: text }),
      });

      if (res.status === 401) {
        localStorage.removeItem('paklaw_token');
        localStorage.removeItem('paklaw_user');
        setMessages(prev => [...prev, {
          id: `note-${Date.now()}`,
          role: 'note',
          text: 'Your session expired — please sign in again.',
        }]);
        return;
      }
      if (!res.ok) throw new Error(`Chat service returned ${res.status}`);

      const data = await res.json();
      const latencyLabel = data.timings?.total != null ? `${(data.timings.total / 1000).toFixed(1)}s` : null;
      setMessages(prev => [...prev, {
        id: data.messageId || `a-${Date.now()}`,
        role: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyLabel,
        body: <p className="whitespace-pre-wrap">{data.answer}</p>,
        citations: data.citations || [],
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `note-${Date.now()}`,
        role: 'note',
        text: "Couldn't reach the chat service — make sure the backend is running, then try again.",
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
          <div className="font-serif text-[17px] leading-none truncate">Ask a legal question</div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-auto pl-scroll">
          <div className="max-w-[840px] mx-auto px-8 py-8 space-y-8">
            <Disclaimer />

            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="w-14 h-14 rounded-full bg-[#2A2F22] flex items-center justify-center">
                  <PLSeal size={26} tone="espresso" ring={false} />
                </div>
                <div className="mt-5 font-serif text-[22px] leading-tight">Ask your first question.</div>
                <p className="mt-2 text-[16px] text-[#4A5540] max-w-[420px]">
                  In English, Urdu, or Roman Urdu — answers cite the actual law, not a guess.
                </p>
              </div>
            )}

            {messages.map(m => (
              m.role === 'user' ? <UserMessage key={m.id} m={m} />
                : m.role === 'note' ? <SystemNote key={m.id} text={m.text} />
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
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t rule-hair bg-[#F7F6F0]">
          <div className="max-w-[840px] mx-auto px-8 py-5">
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
                placeholder='Ask about a statute, judgment, or draft — in English, Urdu, or Roman Urdu.'
                className={`w-full resize-none bg-transparent p-4 text-[16px] text-[#2A2F22] placeholder-[#7A7D68] focus:outline-none ${isUrduScript(input) ? 'text-right font-nastaliq text-[17px]' : ''}`}
                dir={isUrduScript(input) ? 'rtl' : 'ltr'}
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
// Inline notice for auth/connection problems (not signed in, session expired, backend unreachable).
function SystemNote({ text }) {
  return (
    <div className="flex justify-center">
      <div className="max-w-[520px] text-center text-[14px] text-[#7A7D68] italic bg-[#F0EFE3] border border-[#DFE0CE] rounded-full px-4 py-2">
        {text}
      </div>
    </div>
  );
}

function UserMessage({ m }) {
  const urdu = isUrduScript(m.text);
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="flex items-center justify-end gap-2 mb-1.5">
          <span className="text-[14px] text-[#7A7D68]">You · {m.time}</span>
        </div>
        <div className={`bg-[#2A2F22] text-[#F7F6F0] px-5 py-3.5 rounded-2xl rounded-tr-md text-[16px] leading-[1.6] ${urdu ? 'font-nastaliq text-[18px] text-right' : ''}`}
             dir={urdu ? 'rtl' : 'ltr'}>
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
          <span className="text-[14px] text-[#7A7D68]">{m.time}{m.latencyLabel ? ` · ${m.latencyLabel}` : ''}</span>
        </div>

        {/* Answer body — editorial serif quotes, editorial spacing */}
        <div className="bg-[#F7F6F0] border border-[#DFE0CE] rounded-2xl rounded-tl-md px-5 py-4 text-[16px] leading-[1.7] text-[#2A2F22]">
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
