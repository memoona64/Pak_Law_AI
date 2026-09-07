import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Card, Disclaimer } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

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
    n: 1, title: 'Find the right police station',
    law: { act: 'CrPC §154', text: 'Any officer in charge of a police station must register information disclosing a cognisable offence — jurisdiction is not a valid reason to refuse.' },
    where: 'The police station covering the area where the incident happened.',
    file: 'Nothing yet — just confirm you have the right police station.',
    cost: 'Free',
    time: 'Same day',
  },
  {
    n: 2, title: 'Your details',
    law: { act: 'CrPC §154', text: 'Your statement must be reduced to writing and read back to you before you sign it.' },
    where: 'Same police station, at the reporting desk.',
    file: 'Your CNIC and contact details, for the record.',
    cost: 'Free',
    time: '15–30 minutes',
  },
  {
    n: 3, title: 'What happened',
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
    n: 5, title: 'Matching it to the law',
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
    n: 7, title: 'Review & submit',
    law: { act: 'CrPC §154 · §22-A(6)', text: 'The station must lodge the FIR on request. If it refuses, a Justice of Peace can direct the police to register it.' },
    where: 'Same police station to lodge; the Justice of Peace’s court if the police refuse.',
    file: 'Keep your copy of the FIR; if refused, a written application to the Justice of Peace.',
    cost: 'Free at the station; a small court fee if you escalate',
    time: 'Same day at the station; 1–2 weeks if escalated',
  },
];

export default function FlowDetail() {
  // currentStep is the index of the step you're actively working on;
  // everything before it counts as done, everything after as not-yet-reached.
  const [currentStep, setCurrentStep] = React.useState(2);
  const [expanded, setExpanded] = React.useState({ [STEPS[2].n]: true });

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
    setCurrentStep(clamped);
    setExpanded(e => ({ ...e, [STEPS[clamped].n]: true }));
  };

  const progressPct = Math.round((currentStep / (STEPS.length - 1)) * 100);
  const avgMins = STEPS.length; // fallback if range can't be parsed
  const [lo, hi] = FLOW.mins.split('–').map(n => parseInt(n, 10));
  const totalMins = Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : avgMins;
  const remainingMins = Math.max(1, Math.round(totalMins * (STEPS.length - 1 - currentStep) / STEPS.length));

  const toggle = (n) => setExpanded(e => ({ ...e, [n]: !e[n] }));

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
      {/* Page header */}
      <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 border-b rule-hair">
        <Link to="/flows" className="inline-flex items-center gap-1.5 text-[14px] text-[#6B7F5E] font-medium hover:underline mb-4">
          <Icon name="chevron-left" size={14} /> All flows
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <Eyebrow>{FLOW.cat} · Guided procedure</Eyebrow>
            <h1 className="mt-2 font-serif text-[28px] sm:text-[36px] leading-[1.08] tracking-[-0.01em]">{FLOW.title}</h1>
            <p className="mt-2 text-[16px] text-[#4A5540] max-w-[640px]">{FLOW.sub}</p>
          </div>
          <Chip tone="flag" icon="alert-triangle" className="self-start">Sample data</Chip>
        </div>
      </div>

      <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8">
        <div className="max-w-[760px] mx-auto space-y-5">
          <Disclaimer />
          <Card tone="cream" padding="p-0" className="overflow-hidden">
            <div className="bg-[#2A2F22] text-[#F7F6F0] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="smallcaps text-[14px] text-[#B9C2A0]">In progress · {FLOW.cat}</div>
                  <div className="mt-2 font-serif text-[26px] leading-tight">{FLOW.title}</div>
                  <div className="text-[14px] text-[#B9C2A0]/85 mt-1">{FLOW.sub}</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-[#F7F6F0]/10 flex items-center justify-center shrink-0">
                  <Icon name={FLOW.icon} size={22} color="#ECEBD9" />
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-[14px] text-[#B9C2A0]/85 mb-1.5">
                  <span>Step {currentStep + 1} of {STEPS.length}</span>
                  {currentStep < STEPS.length - 1 && <span className="font-mono-jb">≈ {remainingMins} min remaining</span>}
                </div>
                <div className="h-1.5 rounded-full bg-[#F7F6F0]/12">
                  <div className="h-full rounded-full bg-[#6B7F5E] transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {STEPS.map((s, i) => (
                <StepDetail
                  key={s.n}
                  s={s}
                  state={i < currentStep ? 'done' : i === currentStep ? 'active' : 'idle'}
                  isOpen={!!expanded[s.n]}
                  onToggle={() => toggle(s.n)}
                />
              ))}
            </div>

            <div className="p-6 pt-0 flex items-center justify-between">
              <Btn variant="ghost" icon="chevron-left" onClick={() => goTo(currentStep - 1)} disabled={currentStep === 0}>Previous</Btn>
              {currentStep < STEPS.length - 1 ? (
                <Btn variant="primary" iconRight="arrow-right" onClick={() => goTo(currentStep + 1)}>Continue to step {currentStep + 2}</Btn>
              ) : (
                <Btn variant="primary" icon="check" disabled>All steps complete</Btn>
              )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}

function StepDetail({ s, state, isOpen, onToggle }) {
  return (
    <div className={`rounded-lg border transition-colors ${isOpen ? 'bg-white border-[#6B7F5E]/40' : 'bg-[#F2F1E6]/60 border-[#DFE0CE] hover:border-[#6B7F5E]/40'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-[14px] border shrink-0 ${
          state === 'done' ? 'bg-[#5C8A52]/15 border-[#5C8A52] text-[#3E5236]'
          : state === 'active' ? 'bg-[#6B7F5E] border-[#6B7F5E] text-[#F7F6F0]'
          : 'bg-white border-[#D8D9C8] text-[#7A7D68]'
        }`}>
          {state === 'done' ? <Icon name="check" size={13} stroke={2.5} /> : s.n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[16px] leading-tight">{s.title}</div>
          {state === 'active' && !isOpen && <div className="text-[14px] text-[#6B7F5E] mt-0.5">Current step</div>}
        </div>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#7A7D68" />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          <div className="border-l-2 border-[#6B7F5E] pl-4 py-1">
            <div className="smallcaps text-[14px] text-[#6B7F5E] mb-1">What the law says</div>
            <p className="font-serif text-[16px] leading-[1.65] text-[#363B2C] italic">{s.law.text}</p>
            <div className="mt-1.5 text-[14px] font-mono-jb text-[#6B7F5E]">{s.law.act}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <Icon name={icon} size={14} color="#6B7F5E" className="mt-0.5 shrink-0" />
      <div>
        <div className="smallcaps text-[14px] text-[#6B7F5E]">{label}</div>
        <div className="text-[14px] text-[#3A3D2E] mt-0.5 leading-snug">{value}</div>
      </div>
    </div>
  );
}
