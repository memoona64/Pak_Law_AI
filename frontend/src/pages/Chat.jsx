import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Disclaimer } from '../components/primitives';
import { PLSeal } from '../components/seal';
import AppSidebar from '../components/AppSidebar';
import { getToken, clearToken } from '../lib/auth';

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

// --- Safety keyword trigger (basic, Phase 1) --------------------------------
// CONSERVATIVE AND NOT EXHAUSTIVE ON PURPOSE. This only catches obvious,
// explicit phrasings of acute danger — suicide/self-harm intent, an assault
// happening right now, an arrest in progress — in English, Urdu script, and
// Roman Urdu. It is a safety net, not a clinical or legal detector; most real
// crisis messages will not match. That's why Safety.jsx is also always
// reachable from the sidebar ("In danger? Get help" in AppSidebar.jsx)
// regardless of whether any of these match.
const SAFETY_KEYWORDS = [
  // English — suicide / self-harm intent
  /\bkill myself\b/i,
  /\bwant to die\b/i,
  /\bend my life\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(hurt|harm) myself\b/i,
  // English — physical violence happening right now
  /\b(he|she|they)('s| is| are)? (beating|hitting) me\b/i,
  /\bbeing beaten\b/i,
  // English — arrest in progress
  /\bpolice (are|is) arresting me\b/i,
  /\bbeing arrested right now\b/i,
  // Roman Urdu
  /\bkhud\s*kushi\b/i,
  /\bmarna chahta\b/i,
  /\bmujhe marna hai\b/i,
  /\bmujhe maar raha hai\b/i,
  /\bgiraftari ho rahi hai\b/i,
  // Urdu script
  /خودکشی/,
  /میں مرنا چاہتا ہوں/,
  /مجھے مار رہا ہے/,
  /گرفتاری ہو رہی ہے/,
];
const matchesSafetyKeyword = (text) => SAFETY_KEYWORDS.some((re) => re.test(text));

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// A stored conversation has one entry per question/answer pair; the UI
// wants each side as its own bubble.
const expandStoredMessages = (storedMessages) => {
  const expanded = [];
  for (const msg of storedMessages) {
    expanded.push({ id: `${msg.id}-q`, role: 'user', time: formatTime(msg.timestamp), text: msg.question });
    expanded.push({
      id: msg.id,
      role: 'assistant',
      time: formatTime(msg.timestamp),
      text: msg.answer,
      body: <p className="whitespace-pre-wrap">{msg.answer}</p>,
      citations: msg.citations || [],
    });
  }
  return expanded;
};

// Chat interface — the hero. Sidebar + central messages with expandable citation pills.
export default function ChatScreen() {
  const { id: routeConversationId } = useParams();
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState({});
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [loadingConversation, setLoadingConversation] = React.useState(!!routeConversationId);
  const [messages, setMessages] = React.useState([]);
  const [conversationId, setConversationId] = React.useState(routeConversationId || null);
  const messagesEndRef = React.useRef(null);

  // Loads a past conversation's real messages when arriving via /chat/:id
  // (e.g. clicking a row in History). A bare /chat starts empty. `cancelled`
  // stops a late response from setting state after the user has navigated
  // away (e.g. clicked another history row before this one finished loading).
  React.useEffect(() => {
    let cancelled = false;

    if (!routeConversationId) {
      setMessages([]);
      setConversationId(null);
      setLoadingConversation(false);
      return;
    }

    setLoadingConversation(true);
    setConversationId(routeConversationId);
    const token = getToken();
    if (!token) {
      setMessages([{ id: 'note-auth', role: 'note', text: 'Please sign in to view this conversation.' }]);
      setLoadingConversation(false);
      return;
    }

    fetch(`${API_URL}/api/chat/history/${encodeURIComponent(routeConversationId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 404) throw new Error("This conversation wasn't found.");
        if (res.status === 401) {
          clearToken();
          if (!cancelled) navigate('/login');
          throw new Error('Your session expired — please sign in again.');
        }
        if (!res.ok) throw new Error(`Chat service returned ${res.status}`);
        const data = await res.json();
        if (!cancelled) setMessages(expandStoredMessages(data.messages || []));
      })
      .catch((err) => {
        if (!cancelled) {
          setMessages([{ id: 'note-load-error', role: 'note', text: err.message || "Couldn't load this conversation." }]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversation(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeConversationId, navigate]);

  // Keeps the newest message in view instead of leaving it below the fold.
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  // Sends the typed question to the Express backend, which runs retrieval +
  // generation and returns a finished answer with citations.
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Safety check runs before anything is sent to the backend. See
    // SAFETY_KEYWORDS above — this is deliberately conservative.
    if (matchesSafetyKeyword(text)) {
      setInput('');
      navigate('/safety');
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', time, text }]);
    setInput('');
    setSending(true);

    const token = getToken();
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
        // conversationId appends to the open conversation once one exists,
        // instead of starting a new one on every message.
        body: JSON.stringify({ question: text, conversationId: conversationId || undefined }),
      });

      if (res.status === 401) {
        clearToken();
        setMessages(prev => [...prev, {
          id: `note-${Date.now()}`,
          role: 'note',
          text: 'Your session expired — please sign in again.',
        }]);
        navigate('/login');
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
        text: data.answer,
        body: <p className="whitespace-pre-wrap">{data.answer}</p>,
        citations: data.citations || [],
      }]);

      // First message of a new conversation: remember its id so follow-up
      // questions append to it, and reflect it in the URL so History links
      // straight back here.
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        navigate(`/chat/${data.conversationId}`, { replace: true });
      }
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

            {loadingConversation ? (
              <div className="text-center py-16 text-[16px] text-[#7A7D68]">Loading conversation…</div>
            ) : messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="w-14 h-14 rounded-full bg-[#2A2F22] flex items-center justify-center">
                  <PLSeal size={26} ring={false} />
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
                  <div className="w-3.5 h-3.5"><PLSeal size={22} ring={false}/></div>
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
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);
  const [voted, setVoted] = React.useState(null); // null | 'up' | 'down'
  const [voting, setVoting] = React.useState(false);

  // Copies the plain answer text (not the JSX) to the clipboard, and swaps
  // the icon to a checkmark briefly as confirmation — same "icon swap"
  // pattern used elsewhere in this file (e.g. eye / eye-off on Login.jsx).
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(m.text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard permission denied or unavailable — no-op */
    }
  };

  // Records a helpful/not-helpful vote against this message via the backend's
  // feedback endpoint (POST /api/feedback, { messageId, vote }). Once a vote
  // is recorded we lock it in rather than letting someone re-vote back and
  // forth, since the store is append-only.
  const handleVote = async (vote) => {
    if (voting || voted) return;
    const token = getToken();
    if (!token) return;
    setVoting(true);
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId: m.id, vote }),
      });
      if (res.status === 401) {
        clearToken();
        navigate('/login');
        return;
      }
      if (res.ok || res.status === 204) setVoted(vote);
    } catch {
      /* best-effort — feedback isn't critical to the chat working */
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 shrink-0 rounded-full bg-[#2A2F22] flex items-center justify-center">
        <PLSeal size={30} ring={false} />
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
            <IconBtn name={copied ? 'check' : 'copy'} tip={copied ? 'Copied!' : 'Copy'} onClick={handleCopy} />
            <IconBtn name="thumbs-up" tip="Helpful" onClick={() => handleVote('up')} active={voted === 'up'} disabled={voting || voted === 'down'} />
            <IconBtn name="thumbs-down" tip="Not helpful" onClick={() => handleVote('down')} active={voted === 'down'} disabled={voting || voted === 'up'} />
            {voted && <span className="text-[13px] text-[#6B7F5E] ml-1">Thanks for the feedback.</span>}
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

function ComposerIcon({ name, tip, disabled, onClick }) {
  return (
    <button
      type="button"
      title={tip}
      aria-label={tip}
      disabled={disabled}
      onClick={onClick}
      className={`w-8 h-8 rounded-md flex items-center justify-center ${disabled ? 'text-[#A6A896] cursor-not-allowed' : 'text-[#4A5540] hover:bg-[#F0EFE3] hover:text-[#2A2F22]'}`}
    >
      <Icon name={name} size={14} />
    </button>
  );
}

function IconBtn({ name, tip, onClick, active, disabled }) {
  return (
    <button
      type="button"
      title={tip}
      aria-label={tip}
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-md flex items-center justify-center ${active ? 'text-[#6B7F5E] bg-[#ECEBD9]' : 'text-[#83866F]'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F0EFE3] hover:text-[#2A2F22]'}`}
    >
      <Icon name={name} size={13} />
    </button>
  );
}
