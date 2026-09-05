import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Card } from '../components/primitives';

// Sample data — this is the same flow shown in the Flows.jsx right rail,
// expanded to a full page. Only this one flow has full step detail written;
// the :slug param isn't used to select different content yet.
const FLOW = {
  icon: 'siren',
  cat: 'Criminal',
  title: 'Police Refusing to Register an FIR',
  sub: 'Your rights under §154 & §22-A CrPC',
  mins: '12–18',
};

const STEPS = [
  {
    n: 1, title: 'Confirm jurisdiction & police station', done: true,
    law: { act: 'CrPC §154', text: 'Any officer in charge of a police station must register information disclosing a cognisable offence — jurisdiction is not a valid reason to refuse.' },
    where: 'The police station covering the area where the incident happened.',
    file: 'Nothing yet — just confirm you have the right police station.',
    cost: 'Free',
    time: 'Same day',
  },
  {
    n: 2, title: 'Complainant particulars', done: true,
    law: { act: 'CrPC §154', text: 'Your statement must be reduced to writing and read back to you before you sign it.' },
    where: 'Same police station, at the reporting desk.',
    file: 'Your CNIC and contact details, for the record.',
    cost: 'Free',
    time: '15–30 minutes',
  },
  {
    n: 3, title: 'Occurrence narrative', active: true,
    law: { act: 'CrPC §154', text: 'The substance of your information is entered into a register kept for that purpose at the police station.' },
    where: 'Same police station.',
    file: 'A written or spoken account of what happened, in your own words.',
    cost: 'Free',
    time: '20–40 minutes',
  },
  {
    n: 4, title: 'Identify accused (if known)',
    law: { act: 'CrPC §154', text: 'An FIR can be registered whether or not the accused is named.' },
    where: 'Same police station.',
    file: 'Names or descriptions if you have them — "unknown accused" is acceptable otherwise.',
    cost: 'Free',
    time: '10 minutes',
  },
  {
    n: 5, title: 'Enumerate offences & sections',
    law: { act: 'PPC §441, §447, §452', text: 'The officer in charge maps your account onto the relevant offences under the Pakistan Penal Code.' },
    where: 'Same police station — the officer in charge does this part.',
    file: 'Nothing further from you.',
    cost: 'Free',
    time: 'Done as part of registration',
  },
  {
    n: 6, title: 'Evidence & documents',
    law: { act: 'CrPC', text: 'Supporting evidence strengthens a case but is not required to register an FIR.' },
    where: 'Same police station, or submitted later during investigation.',
    file: 'Photos, a medical certificate, or any earlier complaints you have.',
    cost: 'Free (a medico-legal certificate may carry a small government fee)',
    time: 'Same day, or shortly after',
  },
  {
    n: 7, title: 'Review & lodge',
    law: { act: 'CrPC §154 · §22-A(6)', text: 'The station must lodge the FIR on request. If it refuses, a Justice of Peace can direct the police to register it.' },
    where: 'Same police station to lodge; the Justice of Peace’s court if the police refuse.',
    file: 'Keep your copy of the FIR; if refused, a written application to the Justice of Peace.',
    cost: 'Free at the station; a small court fee if you escalate',
    time: 'Same day at the station; 1–2 weeks if escalated',
  },
];

export default function FlowDetail() {
  const [expanded, setExpanded] = React.useState(() => {
    const active = STEPS.find(s => s.active);
    return active ? { [active.n]: true } : {};
  });

  const currentIndex = Math.max(0, STEPS.findIndex(s => s.active));
  const doneCount = STEPS.filter(s => s.done).length;
  const progressPct = Math.round((doneCount / STEPS.length) * 100);
  const avgMins = STEPS.length; // fallback if range can't be parsed
  const [lo, hi] = FLOW.mins.split('–').map(n => parseInt(n, 10));
  const totalMins = Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : avgMins;
  const remainingMins = Math.max(1, Math.round(totalMins * (STEPS.length - doneCount) / STEPS.length));

  const toggle = (n) => setExpanded(e => ({ ...e, [n]: !e[n] }));

  return (
    <div className="h-screen w-full bg-[#F8F5F0] text-[#2C221E] font-sans overflow-hidden flex flex-col">
      {/* Page header */}
      <div className="px-10 pt-10 pb-6 border-b rule-hair">
        <Link to="/flows" className="inline-flex items-center gap-1.5 text-[14px] text-[#8C6D53] font-medium hover:underline mb-4">
          <Icon name="chevron-left" size={14} /> All flows
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow>{FLOW.cat} · Guided procedure</Eyebrow>
            <h1 className="mt-2 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">{FLOW.title}</h1>
            <p className="mt-2 text-[16px] text-[#6E5540] max-w-[640px]">{FLOW.sub}</p>
          </div>
          <Chip tone="flag" icon="alert-triangle">Sample data</Chip>
        </div>
      </div>

      <div className="flex-1 overflow-auto pl-scroll px-10 py-8">
        <div className="max-w-[760px] mx-auto">
          <Card tone="cream" padding="p-0" className="overflow-hidden">
            <div className="bg-[#2C221E] text-[#F8F5F0] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="smallcaps text-[14px] text-[#D6BFA8]">In progress · {FLOW.cat}</div>
                  <div className="mt-2 font-serif text-[26px] leading-tight">{FLOW.title}</div>
                  <div className="text-[14px] text-[#D6BFA8]/85 mt-1">{FLOW.sub}</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#F8F5F0]/10 flex items-center justify-center shrink-0">
                  <Icon name={FLOW.icon} size={22} color="#F1E4D6" />
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-[14px] text-[#D6BFA8]/85 mb-1.5">
                  <span>Step {currentIndex + 1} of {STEPS.length}</span>
                  <span className="font-mono-jb">≈ {remainingMins} min remaining</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#F8F5F0]/12">
                  <div className="h-full rounded-full bg-[#8C6D53]" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {STEPS.map(s => (
                <StepDetail key={s.n} s={s} isOpen={!!expanded[s.n]} onToggle={() => toggle(s.n)} />
              ))}
            </div>

            <div className="p-6 pt-0 flex items-center justify-between">
              <Btn variant="ghost" icon="chevron-left">Previous</Btn>
              <Btn variant="primary" iconRight="arrow-right">Continue step {currentIndex + 1}</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepDetail({ s, isOpen, onToggle }) {
  const state = s.done ? 'done' : s.active ? 'active' : 'idle';
  return (
    <div className={`rounded-lg border transition-colors ${isOpen ? 'bg-white border-[#8C6D53]/40' : 'bg-[#F1EBE0]/60 border-[#E4DDD1] hover:border-[#8C6D53]/40'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-[14px] border shrink-0 ${
          state === 'done' ? 'bg-[#5A7A4E]/15 border-[#5A7A4E] text-[#40573A]'
          : state === 'active' ? 'bg-[#8C6D53] border-[#8C6D53] text-[#F8F5F0]'
          : 'bg-white border-[#D3C5BD] text-[#7D7268]'
        }`}>
          {state === 'done' ? <Icon name="check" size={13} stroke={2.5} /> : s.n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[16px] leading-tight">{s.title}</div>
          {state === 'active' && !isOpen && <div className="text-[14px] text-[#8C6D53] mt-0.5">Current step</div>}
        </div>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#7D7268" />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          <div className="border-l-2 border-[#8C6D53] pl-4 py-1">
            <div className="smallcaps text-[14px] text-[#8C6D53] mb-1">What the law says</div>
            <p className="font-serif text-[16px] leading-[1.65] text-[#3A2E28] italic">{s.law.text}</p>
            <div className="mt-1.5 text-[14px] font-mono-jb text-[#8C6D53]">{s.law.act}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetaField icon="landmark" label="Where to go" value={s.where} />
            <MetaField icon="file-text" label="What to file" value={s.file} />
            <MetaField icon="banknote" label="What it costs" value={s.cost} />
            <MetaField icon="clock" label="How long it takes" value={s.time} />
          </div>
        </div>
      )}
    </div>
  );
}

function MetaField({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} size={14} color="#8C6D53" className="mt-0.5 shrink-0" />
      <div>
        <div className="smallcaps text-[14px] text-[#8C6D53]">{label}</div>
        <div className="text-[14px] text-[#4A3C34] mt-0.5 leading-snug">{value}</div>
      </div>
    </div>
  );
}
