import { Link } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

// Guided Procedures — a browsable grid of flows by situation.
export default function FlowsScreen() {
  const flows = [
    { id: 'fir',    icon: 'siren',        cat: 'Criminal',   title: 'Police Refusing to Register an FIR', sub: 'Your rights under §154 & §22-A CrPC', steps: 7, mins: '12–18', pop: 'Most used' },
    { id: 'rent',   icon: 'home',         cat: 'Civil',      title: 'Landlord Eviction or Deposit Dispute (Sindh)', sub: 'Eviction notices, security deposits, and tenant rights', steps: 6, mins: '8–12' },
    { id: 'khula',  icon: 'heart-crack',  cat: 'Family',     title: 'Khula / Divorce Procedure', sub: 'Family Courts Act, 1964', steps: 9, mins: '15–22' },
    { id: 'salary', icon: 'briefcase',    cat: 'Employment', title: 'Unpaid Salary or Wrongful Termination', sub: 'Recovering dues and challenging unlawful dismissal', steps: 6, mins: '10–14' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
        {/* Page header */}
        <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b rule-hair">
          <div>
            <Eyebrow>Guided Procedures</Eyebrow>
            <h1 className="mt-2 font-serif text-[30px] sm:text-[42px] leading-[1.05] tracking-[-0.01em]">
              Flows for Pakistani <span className="italic text-[#6B7F5E]">practice.</span>
            </h1>
            <p className="mt-3 text-[16px] text-[#4A5540] max-w-[540px]">
              Each flow walks you through what to do, step by step, in plain language — and shows you exactly which law backs each step.
            </p>
          </div>
          <div className="inline-flex items-center bg-white border border-[#D8D9C8] rounded-md h-9 px-2.5 gap-2 text-[14px] self-start">
            <Icon name="search" size={13} color="#7A7D68" />
            <input placeholder="Search flows, statutes…" className="bg-transparent focus:outline-none w-40 sm:w-56 placeholder-[#7A7D68]"/>
          </div>
        </div>

        {/* Body — flow grid */}
        <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8">
          {/* Category tabs */}
          <div className="flex items-center gap-1 mb-5 border-b rule-hair pb-3 overflow-x-auto pl-scroll">
            {['All', 'Criminal', 'Civil', 'Family', 'Employment'].map((t, i) => (
              <button key={t} className={`h-8 px-3 rounded-md text-[14px] font-medium shrink-0 ${i === 0 ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'text-[#3A3D2E] hover:bg-[#F0EFE3]'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {flows.map((f) => (
              <FlowCard key={f.id} f={f} />
            ))}
          </div>

          {/* Discovery band */}
          <div className="mt-6 rounded-lg border border-dashed border-[#6B7F5E]/40 bg-[#ECEBD9]/40 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] text-[#4A5540]">Don't see your situation? Describe it in your own words and we'll build a flow.</span>
            <Btn variant="bronze" size="sm" iconRight="arrow-right">Compose flow</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowCard({ f }) {
  return (
    <Link to={`/flows/${f.id}`} className="block rounded-xl border p-5 relative transition-colors bg-[#F7F6F0] border-[#DFE0CE] hover:border-[#6B7F5E]/40 hover:bg-white">
      {f.pop && (
        <div className="absolute -top-2 right-4">
          <Chip tone={f.pop === 'New' ? 'ok' : 'bronze'} icon={f.pop === 'New' ? 'sparkle' : 'flame'}>{f.pop}</Chip>
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-[#EDE9D5] border border-[#B9C2A0] flex items-center justify-center shrink-0">
          <Icon name={f.icon} size={19} color="#4A5540" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="smallcaps text-[14px] text-[#6B7F5E]">{f.cat}</div>
          <div className="font-serif text-[19px] leading-tight mt-1">{f.title}</div>
          <div className="text-[14px] text-[#4A5540] mt-1.5 leading-snug">{f.sub}</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t rule-hair flex items-center justify-between text-[14px] text-[#4A5540]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><Icon name="list-checks" size={12} /> {f.steps} steps</span>
          <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} /> {f.mins} min</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[#6B7F5E] font-semibold hover:underline">
          Begin <Icon name="arrow-right" size={12} />
        </span>
      </div>
    </Link>
  );
}

