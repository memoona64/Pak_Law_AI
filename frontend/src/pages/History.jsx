import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Card } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

// The Express backend. Override via a .env file (VITE_API_URL) if it runs
// somewhere other than localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Full names for the short codes the backend returns (uppercased), so
// hovering an abbreviation like "CRPC" explains what it actually stands for.
const ACT_FULL_NAMES = {
  CRPC: 'Code of Criminal Procedure, 1898',
  PPC: 'Pakistan Penal Code',
  MFLO: 'The Muslim Family Laws Ordinance, 1961',
  SRPO: 'The Sind Rented Premises Ordinance, 1979',
  CONSTITUTION: 'The Constitution of the Islamic Republic of Pakistan',
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

// History ΓÇö every past conversation, with the Acts each answer cited. Opens back into /chat.
export default function History() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const token = localStorage.getItem('paklaw_token');
    if (!token) {
      setError('Please sign in to see your history.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/chat/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem('paklaw_token');
          localStorage.removeItem('paklaw_user');
          throw new Error('Your session expired ΓÇö please sign in again.');
        }
        if (!res.ok) throw new Error(`History service returned ${res.status}`);
        const data = await res.json();
        setItems((data.conversations || []).map((c) => ({
          id: c.id,
          question: c.question,
          date: formatDate(c.date),
          acts: c.acts || [],
        })));
      })
      .catch((err) => setError(err.message || "Couldn't reach the backend ΓÇö make sure it's running."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
        {/* Page header */}
        <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b rule-hair">
          <div>
            <Eyebrow>History</Eyebrow>
            <h1 className="mt-2 font-serif text-[30px] sm:text-[42px] leading-[1.05] tracking-[-0.01em]">
              Every question, <span className="italic text-[#6B7F5E]">saved.</span>
            </h1>
            <p className="mt-3 text-[16px] text-[#4A5540] max-w-[560px]">
              Every conversation you've had, and which Acts each answer cited. Pick one up where you left off.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8">
          <div className="max-w-[760px] mx-auto">
            {loading ? (
              <div className="text-center py-24 text-[16px] text-[#7A7D68]">LoadingΓÇª</div>
            ) : error ? (
              <ErrorState message={error} />
            ) : items.length === 0 ? (
              <EmptyState />
            ) : (
              <Card padding="p-0">
                <div className="px-5 pt-5 pb-3">
                  <Eyebrow>{items.length} conversation{items.length === 1 ? '' : 's'}</Eyebrow>
                </div>
                <div>
                  {items.map(h => (
                    <HistoryRow key={h.id} h={h} onClick={() => navigate(`/chat/${h.id}`)} />
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 rounded-xl border border-dashed border-[#D8D9C8]">
      <div className="w-16 h-16 rounded-full bg-[#F3DDD5] border border-[#D9A797] flex items-center justify-center">
        <Icon name="alert-triangle" size={26} color="#8A3B24" />
      </div>
      <div className="mt-5 font-serif text-[22px] leading-tight">Couldn't load your history.</div>
      <p className="mt-2 text-[16px] text-[#4A5540] max-w-[360px]">{message}</p>
    </div>
  );
}

function HistoryRow({ h, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left px-5 py-4 border-t rule-hair hover:bg-[#ECEBD9]/40 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-[#EDE9D5] border border-[#B9C2A0] flex items-center justify-center shrink-0">
        <Icon name="messages-square" size={15} color="#4A5540" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-[16px] leading-tight truncate">{h.question}</div>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          {h.acts.map(a => <Chip key={a} tone="taupe" icon="book-open-text" title={ACT_FULL_NAMES[a]}>{a}</Chip>)}
        </div>
      </div>
      <div className="text-[14px] text-[#7A7D68] font-mono-jb shrink-0 whitespace-nowrap hidden sm:block">{h.date}</div>
      <Icon name="chevron-right" size={14} color="#7A7D68" />
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 rounded-xl border border-dashed border-[#D8D9C8]">
      <div className="w-16 h-16 rounded-full bg-[#EDE9D5] border border-[#B9C2A0] flex items-center justify-center">
        <Icon name="messages-square" size={26} color="#4A5540" />
      </div>
      <div className="mt-5 font-serif text-[22px] leading-tight">No conversations yet.</div>
      <p className="mt-2 text-[16px] text-[#4A5540] max-w-[360px]">Ask your first question and it will show up here.</p>
      <Link to="/chat" className="mt-5 inline-block">
        <Btn variant="primary" iconRight="arrow-right">Ask a question</Btn>
      </Link>
    </div>
  );
}
