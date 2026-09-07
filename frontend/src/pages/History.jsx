import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Card } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

// Sample data — every question here is invented for layout purposes only.
// Full names for the short codes shown in the Acts chips below, so hovering
// an abbreviation like "CrPC" explains what it actually stands for.
const ACT_FULL_NAMES = {
  CrPC: 'Code of Criminal Procedure, 1898',
  PPC: 'Pakistan Penal Code, 1860',
};

const SAMPLE_HISTORY = [
  { id: 'h1', question: 'Can the police refuse to register my FIR?', date: '29 Aug 2026', acts: ['CrPC', 'PPC'] },
  { id: 'h2', question: 'Is a 15% annual rent increase legal in my lease?', date: '28 Aug 2026', acts: ['Sindh Rented Premises Ordinance, 1979'] },
  { id: 'h3', question: "What's the procedure for khula in Pakistan?", date: '27 Aug 2026', acts: ['Family Courts Act, 1964'] },
  { id: 'h4', question: 'Can my landlord re-enter the property without going to court?', date: '24 Aug 2026', acts: ['Transfer of Property Act, 1882'] },
];

// History — every past conversation, with the Acts each answer cited. Opens back into /chat.
export default function History() {
  const [showEmpty, setShowEmpty] = React.useState(false);
  const navigate = useNavigate();
  const items = showEmpty ? [] : SAMPLE_HISTORY;

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
          <div className="flex flex-wrap items-center gap-3">
            <Chip tone="flag" icon="alert-triangle">Sample data</Chip>
            <button onClick={() => setShowEmpty(v => !v)} className="text-[14px] text-[#6B7F5E] font-medium hover:underline">
              {showEmpty ? 'Show sample history' : 'Preview empty state'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8">
          <div className="max-w-[760px] mx-auto">
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <Card padding="p-0">
                <div className="px-5 pt-5 pb-3">
                  <Eyebrow>{items.length} conversation{items.length === 1 ? '' : 's'}</Eyebrow>
                </div>
                <div>
                  {items.map(h => (
                    <HistoryRow key={h.id} h={h} onClick={() => navigate('/chat')} />
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
