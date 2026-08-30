import React from 'react';
import { Icon, Chip, Btn, Eyebrow, Card } from '../components/primitives';

// Guided Procedures — a grid of flows plus an active-flow stepper for the current matter.
export default function FlowsScreen() {
  const flows = [
    { id: 'fir',    icon: 'siren',        cat: 'Criminal',   title: 'Police Refusing to Register an FIR', sub: 'Your rights under §154 & §22-A CrPC', steps: 7, mins: '12–18', pop: 'Most used' },
    { id: 'rent',   icon: 'home',         cat: 'Civil',      title: 'Landlord Eviction or Deposit Dispute (Sindh)', sub: 'Eviction notices, security deposits, and tenant rights', steps: 6, mins: '8–12' },
    { id: 'khula',  icon: 'heart-crack',  cat: 'Family',     title: 'Khula / Divorce Procedure', sub: 'Family Courts Act, 1964', steps: 9, mins: '15–22' },
    { id: 'salary', icon: 'briefcase',    cat: 'Employment', title: 'Unpaid Salary or Wrongful Termination', sub: 'Recovering dues and challenging unlawful dismissal', steps: 6, mins: '10–14' },
    { id: 'cyber',  icon: 'shield-alert', cat: 'Cyber',      title: 'Online Blackmail or Harassment', sub: 'Reporting to the FIA cybercrime wing', steps: 6, mins: '10–14', pop: 'New' },
    { id: 'arrest', icon: 'lock',         cat: 'Criminal',   title: 'Family Member Arrested — First 24 Hours', sub: 'What to do immediately after an arrest', steps: 5, mins: '8–12' },
  ];

  const active = flows[0];
  const stepList = [
    { n: 1, title: 'Confirm jurisdiction & police station', body: 'Auto-detected: Karachi South · Boat Basin PS. Cognisable offence check passed.', done: true },
    { n: 2, title: 'Complainant particulars', body: 'Name, CNIC (masked ••••-•••••32-1), contact, address. Guardian if minor.', done: true },
    { n: 3, title: 'Occurrence narrative', body: 'Date, time, place, sequence of events, witnesses, injuries or losses.', active: true },
    { n: 4, title: 'Identify accused (if known)', body: 'Names, aliases, distinguishing features. Otherwise "unknown accused".' },
    { n: 5, title: 'Enumerate offences & sections', body: 'Auto-mapped: §441, §447, §452 PPC based on narrative.' },
    { n: 6, title: 'Evidence & documents', body: 'Photos, medico-legal certificate, prior complaints.' },
    { n: 7, title: 'Review & lodge', body: 'Verify FIR draft. Submit to SHO or file §22-A CrPC petition on refusal.' },
  ];

  return (
    <div className="h-screen w-full bg-[#F8F5F0] text-[#2C221E] font-sans overflow-hidden flex flex-col">
      {/* Page header */}
      <div className="px-10 pt-10 pb-6 flex items-end justify-between border-b rule-hair">
        <div>
          <Eyebrow>Guided Procedures</Eyebrow>
          <h1 className="mt-2 font-serif text-[42px] leading-[1.02] tracking-[-0.01em]">
            Flows for Pakistani <span className="italic text-[#8C6D53]">practice.</span>
          </h1>
          <p className="mt-3 text-[16px] text-[#6E5540] max-w-[540px]">
            Each flow walks you through what to do, step by step, in plain language — and shows you exactly which law backs each step.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-white border border-[#D3C5BD] rounded-md h-9 px-2.5 gap-2 text-[14px]">
            <Icon name="search" size={13} color="#7D7268" />
            <input placeholder="Search flows, statutes…" className="bg-transparent focus:outline-none w-56 placeholder-[#7D7268]"/>
            <span className="text-[14px] font-mono-jb text-[#7D7268] px-1.5 py-0.5 rounded bg-[#EFEAE1]">⌘K</span>
          </div>
          <Btn variant="outline" icon="filter">Filter · All</Btn>
          <Btn variant="primary" icon="plus">Custom flow</Btn>
        </div>
      </div>

      {/* Body — grid + right rail with active stepper */}
      <div className="flex-1 grid grid-cols-12 gap-8 px-10 py-8 overflow-hidden">
        {/* LEFT: Grid of flows */}
        <div className="col-span-8 overflow-auto pl-scroll pr-1">
          {/* Category tabs */}
          <div className="flex items-center gap-1 mb-5 border-b rule-hair pb-3">
            {['All', 'Criminal', 'Civil', 'Family', 'Employment', 'Cyber'].map((t, i) => (
              <button key={t} className={`h-8 px-3 rounded-md text-[14px] font-medium ${i === 0 ? 'bg-[#2C221E] text-[#F8F5F0]' : 'text-[#4A3C34] hover:bg-[#EFEAE1]'}`}>
                {t}
              </button>
            ))}
            <div className="ml-auto text-[14px] text-[#7D7268]">6 flows · updated Aug 2026</div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {flows.map((f, i) => (
              <FlowCard key={f.id} f={f} active={i === 0} />
            ))}
          </div>

          {/* Discovery band */}
          <div className="mt-8 rounded-xl border border-dashed border-[#8C6D53]/40 bg-[#F1E4D6]/40 p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-[#8C6D53] text-[#F8F5F0] flex items-center justify-center shrink-0">
              <Icon name="sparkles" size={20} />
            </div>
            <div className="flex-1">
              <div className="font-serif text-[18px] leading-tight">Describe your situation · we'll build a flow</div>
              <p className="text-[16px] text-[#6E5540] mt-1 max-w-[540px]">Type what's happening in English, Urdu, or Roman Urdu — PakLaw puts together a step-by-step procedure for your situation, with the right forms and the law behind it.</p>
            </div>
            <Btn variant="bronze" iconRight="arrow-right">Compose flow</Btn>
          </div>
        </div>

        {/* RIGHT: Active stepper */}
        <aside className="col-span-4 overflow-auto pl-scroll">
          <Card tone="cream" padding="p-0" className="overflow-hidden">
            <div className="bg-[#2C221E] text-[#F8F5F0] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="smallcaps text-[14px] text-[#D6BFA8]">In progress · {active.cat}</div>
                  <div className="mt-2 font-serif text-[22px] leading-tight">{active.title}</div>
                  <div className="text-[14px] text-[#D6BFA8]/85 mt-1">{active.sub}</div>
                </div>
                <div className="w-11 h-11 rounded-lg bg-[#F8F5F0]/10 flex items-center justify-center">
                  <Icon name={active.icon} size={20} color="#F1E4D6" />
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-[14px] text-[#D6BFA8]/85 mb-1.5">
                  <span>Step 3 of 7</span>
                  <span className="font-mono-jb">≈ 9 min remaining</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#F8F5F0]/12">
                  <div className="h-full rounded-full bg-[#8C6D53]" style={{ width: '38%' }} />
                </div>
              </div>
            </div>

            <div className="p-5 space-y-0">
              {stepList.map((s, i) => <Step key={s.n} s={s} last={i === stepList.length - 1} />)}
            </div>

            <div className="p-5 pt-0 flex items-center justify-between">
              <Btn variant="ghost" size="sm" icon="chevron-left">Previous</Btn>
              <Btn variant="primary" size="sm" iconRight="arrow-right">Continue step 3</Btn>
            </div>
          </Card>

          <Card tone="subtle" className="mt-5">
            <div className="flex items-start gap-3">
              <Icon name="scale" size={16} color="#8C6D53" />
              <div>
                <div className="font-serif text-[14px]">Cited authorities in this flow</div>
                <ul className="mt-2 space-y-1 text-[14px] text-[#4A3C34]">
                  <li><span className="font-mono-jb text-[#8C6D53]">CrPC §154</span> — Cognisable information</li>
                  <li><span className="font-mono-jb text-[#8C6D53]">CrPC §22-A(6)</span> — Justice of Peace</li>
                  <li><span className="font-mono-jb text-[#8C6D53]">PPC §441, §447, §452</span> — Trespass ladder</li>
                </ul>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function FlowCard({ f, active }) {
  return (
    <div className={`rounded-xl border p-5 relative transition-colors ${active ? 'bg-white border-[#8C6D53]/50 shadow-[0_1px_0_rgba(44,34,30,0.03),0_20px_40px_-24px_rgba(44,34,30,0.25)]' : 'bg-[#F8F5F0] border-[#E4DDD1] hover:border-[#8C6D53]/40'}`}>
      {f.pop && (
        <div className="absolute -top-2 right-4">
          <Chip tone={f.pop === 'New' ? 'ok' : 'bronze'} icon={f.pop === 'New' ? 'sparkle' : 'flame'}>{f.pop}</Chip>
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-[#EFE4D2] border border-[#D6BFA8] flex items-center justify-center shrink-0">
          <Icon name={f.icon} size={19} color="#6E5540" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="smallcaps text-[14px] text-[#8C6D53]">{f.cat}</div>
          <div className="font-serif text-[19px] leading-tight mt-1">{f.title}</div>
          <div className="text-[14px] text-[#6E5540] mt-1.5 leading-snug">{f.sub}</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t rule-hair flex items-center justify-between text-[14px] text-[#6E5540]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><Icon name="list-checks" size={12} /> {f.steps} steps</span>
          <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} /> {f.mins} min</span>
        </div>
        <button className="inline-flex items-center gap-1 text-[#8C6D53] font-semibold hover:underline">
          {active ? 'Resume' : 'Begin'} <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}

function Step({ s, last }) {
  const state = s.done ? 'done' : s.active ? 'active' : 'idle';
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-[14px] border ${
          state === 'done' ? 'bg-[#5A7A4E]/15 border-[#5A7A4E] text-[#40573A]'
          : state === 'active' ? 'bg-[#8C6D53] border-[#8C6D53] text-[#F8F5F0]'
          : 'bg-white border-[#D3C5BD] text-[#7D7268]'
        }`}>
          {state === 'done' ? <Icon name="check" size={13} stroke={2.5} /> : s.n}
        </div>
        {!last && <div className={`w-px flex-1 mt-1 mb-1 ${state === 'done' ? 'bg-[#5A7A4E]/40' : 'bg-[#D3C5BD]'}`} />}
      </div>
      <div className={`pb-5 flex-1 ${state === 'idle' ? 'opacity-70' : ''}`}>
        <div className={`font-serif text-[14px] leading-tight ${state === 'active' ? 'text-[#2C221E]' : ''}`}>
          {s.title}
        </div>
        <div className="text-[16px] text-[#6E5540] mt-1 leading-snug">{s.body}</div>
        {state === 'active' && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-mono-jb text-[#8C6D53]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8C6D53] animate-pulse" /> Awaiting your input
          </div>
        )}
      </div>
    </div>
  );
}
