import { Icon } from './primitives';

// Shared "couldn't load" / "nothing here yet" placeholder. History, Flows,
// FlowDetail, and DocumentDetail each used to hand-roll their own near-
// identical version of this — this is the one copy all four now use.
export default function StatusState({ tone = 'error', title, message, icon, action }) {
  const isError = tone === 'error';
  const resolvedIcon = icon || (isError ? 'alert-triangle' : 'messages-square');
  const iconBg = isError ? 'bg-[#F3DDD5] border-[#D9A797]' : 'bg-[#EDE9D5] border-[#B9C2A0]';
  const iconColor = isError ? '#8A3B24' : '#4A5540';

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 rounded-xl border border-dashed border-[#D8D9C8]">
      <div className={`w-16 h-16 rounded-full border flex items-center justify-center ${iconBg}`}>
        <Icon name={resolvedIcon} size={26} color={iconColor} />
      </div>
      <div className="mt-5 font-serif text-[22px] leading-tight">{title}</div>
      {message && <p className="mt-2 text-[16px] text-[#4A5540] max-w-[360px]">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
