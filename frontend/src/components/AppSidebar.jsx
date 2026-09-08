import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './primitives';
import { PLWordmark } from './seal';

// Primary nav — wired to real routes. "History" replaces the old "The law"
// entry, which never had a page behind it; every item here does.
const NAV_ITEMS = [
  { icon: 'messages-square', label: 'Chats', to: '/chat' },
  { icon: 'workflow', label: 'Guided Flows', to: '/flows' },
  { icon: 'file-search', label: 'Documents', to: '/documents' },
  { icon: 'gauge', label: 'Evaluation', to: '/dashboard' },
  { icon: 'clock', label: 'History', to: '/history' },
];

// Shared app sidebar — extracted from Chat.jsx. Brand and primary nav (active
// route highlighted; "History" is where past questions live, so they aren't
// duplicated here). Self-contained: owns its own mobile open/closed state, so
// every page just renders <AppSidebar /> with no wiring of its own. Not used
// on /login (its own full-screen layout) or /safety (must have nothing to
// click away to).
// Reads the logged-in user's name from the same localStorage entry Login.jsx
// writes on sign-in. No fallback name is invented — a signed-out visitor
// just sees "Guest" rather than someone else's identity.
function useCurrentUser() {
  const [user] = React.useState(() => {
    try {
      const raw = localStorage.getItem('paklaw_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  return user;
}

const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

export default function AppSidebar({ dark = true }) {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const user = useCurrentUser();

  const bg = dark ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'bg-[#F0EFE3] text-[#2A2F22]';
  const rowActive = dark ? 'bg-[#363B2C] border-[#6B7F5E]' : 'bg-white border-[#6B7F5E]';
  const rowHover = dark ? 'hover:bg-[#363B2C]/70' : 'hover:bg-white';
  const rule = dark ? 'border-[#F7F6F0]/8' : 'rule-hair';

  return (
    <>
      {/* Mobile menu button — the sidebar collapses behind this below md */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-md bg-[#2A2F22] text-[#F7F6F0] flex items-center justify-center shadow-lg"
        >
          <Icon name="panel-left" size={16} />
        </button>
      )}

      <aside className={`${open ? 'flex' : 'hidden'} md:flex w-72 md:w-[280px] shrink-0 flex-col fixed md:static inset-y-0 left-0 z-40 ${bg}`}>
        {/* Brand */}
        <div className={`h-14 flex items-center gap-2.5 px-4 border-b ${rule}`}>
          <PLWordmark size={28} />
          <button onClick={() => setOpen(false)} className={`ml-auto w-7 h-7 rounded-md flex items-center justify-center md:hidden ${dark ? 'hover:bg-[#363B2C]' : 'hover:bg-white'}`}>
            <Icon name="chevrons-left" size={14} />
          </button>
        </div>

        {/* New chat */}
        <div className="p-3">
          <Link to="/chat" className={`w-full h-10 rounded-md flex items-center justify-center gap-2 text-[14px] font-semibold ${dark ? 'bg-[#6B7F5E] text-[#F7F6F0] hover:bg-[#4A5540]' : 'bg-[#2A2F22] text-[#F7F6F0] hover:bg-[#363B2C]'}`}>
            <Icon name="feather" size={14} stroke={2} /> New question
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-2 pb-2 space-y-0.5">
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
              </Link>
            );
          })}
        </nav>

        {/* User strip */}
        <div className={`p-3 border-t ${rule} flex items-center gap-2.5`}>
          <div className="w-8 h-8 rounded-full bg-[#6B7F5E] flex items-center justify-center font-serif text-[14px] text-[#F7F6F0]">{initials(user?.name)}</div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[14px] font-medium truncate">{user?.name || 'Guest'}</div>
          </div>
          <button disabled title="Settings — coming soon" className="w-7 h-7 rounded-md flex items-center justify-center opacity-40 cursor-not-allowed">
            <Icon name="settings" size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}
