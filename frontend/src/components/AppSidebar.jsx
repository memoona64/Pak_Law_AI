import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './primitives';
import { PLSeal } from './seal';

// Primary nav — wired to real routes. "History" replaces the old "The law"
// entry, which never had a page behind it; every item here does.
const NAV_ITEMS = [
  { icon: 'messages-square', label: 'Chats', to: '/chat', badge: '7' },
  { icon: 'workflow', label: 'Guided Flows', to: '/flows', badge: '6' },
  { icon: 'file-search', label: 'Documents', to: '/documents' },
  { icon: 'gauge', label: 'Evaluation', to: '/dashboard' },
  { icon: 'clock', label: 'History', to: '/history' },
];

// Sample recent-chat list — same shape Chat.jsx used to own locally.
const SAMPLE_CHATS = [
  { id: 't1', title: 'FIR — Section 302 PPC · Karachi', when: 'Today', pinned: true, active: true },
  { id: 't2', title: 'Rental agreement — Clause 14 review', when: 'Today' },
  { id: 't3', title: 'Khula procedure — Family Court Lhr.', when: 'Yesterday' },
  { id: 't4', title: 'Cheque bounce · NI Act §138 parallel', when: 'Yesterday' },
  { id: 't5', title: 'Contempt petition drafting notes', when: 'Aug 22' },
  { id: 't6', title: 'PECA 2016 · defamation online', when: 'Aug 20' },
  { id: 't7', title: 'Suo Motu — SMBB 184(3) memo', when: 'Aug 18' },
];

// Shared app sidebar — extracted from Chat.jsx. Brand, primary nav (active
// route highlighted), and the recent-chat list. Self-contained: owns its own
// mobile open/closed state, so every page just renders <AppSidebar /> with no
// wiring of its own. Not used on /login (its own full-screen layout) or
// /safety (must have nothing to click away to).
export default function AppSidebar({ dark = true, chats = SAMPLE_CHATS }) {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  const bg = dark ? 'bg-[#2C221E] text-[#F8F5F0]' : 'bg-[#EFEAE1] text-[#2C221E]';
  const rowActive = dark ? 'bg-[#3A2E28] border-[#8C6D53]' : 'bg-white border-[#8C6D53]';
  const rowHover = dark ? 'hover:bg-[#3A2E28]/70' : 'hover:bg-white';
  const sub = dark ? 'text-[#7D7268]' : 'text-[#6E5540]';
  const rule = dark ? 'border-[#F8F5F0]/8' : 'rule-hair';

  return (
    <>
      {/* Mobile menu button — the sidebar collapses behind this below md */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-md bg-[#2C221E] text-[#F8F5F0] flex items-center justify-center shadow-lg"
        >
          <Icon name="panel-left" size={16} />
        </button>
      )}

      <aside className={`${open ? 'flex' : 'hidden'} md:flex w-72 md:w-[280px] shrink-0 flex-col fixed md:static inset-y-0 left-0 z-40 ${bg}`}>
        {/* Brand */}
        <div className={`h-14 flex items-center gap-2.5 px-4 border-b ${rule}`}>
          <PLSeal size={30} tone={dark ? 'espresso' : 'cream'} />
          <div className="leading-none">
            <div className="font-serif text-[15.5px]">PakLaw <span className={`italic ${dark ? 'text-[#D6BFA8]' : 'text-[#8C6D53]'}`}>AI</span></div>
            <div className={`smallcaps text-[14px] mt-1 ${sub}`}>Digital Chambers</div>
          </div>
          <button onClick={() => setOpen(false)} className={`ml-auto w-7 h-7 rounded-md flex items-center justify-center md:hidden ${dark ? 'hover:bg-[#3A2E28]' : 'hover:bg-white'}`}>
            <Icon name="chevrons-left" size={14} />
          </button>
        </div>

        {/* New chat */}
        <div className="p-3">
          <Link to="/chat" className={`w-full h-10 rounded-md flex items-center justify-center gap-2 text-[14px] font-semibold ${dark ? 'bg-[#8C6D53] text-[#F8F5F0] hover:bg-[#6E5540]' : 'bg-[#2C221E] text-[#F8F5F0] hover:bg-[#3A2E28]'}`}>
            <Icon name="feather" size={14} stroke={2} /> New question
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="px-2 pb-2 space-y-0.5">
          {NAV_ITEMS.map((it) => {
            const active = location.pathname === it.to || location.pathname.startsWith(it.to + '/');
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`w-full h-9 px-2.5 rounded-md flex items-center gap-2.5 text-[14px] border ${active ? rowActive : 'border-transparent ' + rowHover}`}
              >
                <Icon name={it.icon} size={14} />
                <span className="flex-1 text-left">{it.label}</span>
                {it.badge && <span className={`text-[14px] font-mono-jb ${sub}`}>{it.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`mx-4 border-t my-2 ${rule}`} />

        {/* Chat history */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <div className={`smallcaps text-[14px] ${sub}`}>Recent Matters</div>
          <Link to="/history" className={`text-[14px] ${sub} hover:underline`}>View all</Link>
        </div>
        <div className="flex-1 overflow-auto pl-scroll px-2 space-y-0.5">
          {chats.map(c => (
            <button key={c.id} className={`w-full text-left px-2.5 py-2 rounded-md border ${c.active ? rowActive : 'border-transparent'} ${!c.active ? rowHover : ''}`}>
              <div className="flex items-start gap-2">
                {c.pinned && <Icon name="pin" size={11} color={dark ? '#D6BFA8' : '#8C6D53'} className="mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] leading-tight truncate">{c.title}</div>
                  <div className={`text-[14px] mt-0.5 ${sub}`}>{c.when}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* User strip */}
        <div className={`p-3 border-t ${rule} flex items-center gap-2.5`}>
          <div className="w-8 h-8 rounded-full bg-[#8C6D53] flex items-center justify-center font-serif text-[14px] text-[#F8F5F0]">AR</div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[14px] font-medium truncate">Aisha Rahman</div>
          </div>
          <button className={`w-7 h-7 rounded-md flex items-center justify-center ${dark ? 'hover:bg-[#3A2E28]' : 'hover:bg-white'}`}>
            <Icon name="settings" size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}
