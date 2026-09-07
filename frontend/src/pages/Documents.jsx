import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Card, Disclaimer } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

// Document analysis — upload a document, or review one already analysed.
// One screen: summary, flagged clauses, obligations, and the masking notice
// all live together here. Asking questions about the document is just chat
// with the document as context, not a separate feature.
export default function Documents() {
  const [view, setView] = React.useState('upload'); // 'upload' | 'analysis'

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
        {/* Page header */}
        <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b rule-hair">
          <div>
            <Eyebrow>Document Analysis</Eyebrow>
            <h1 className="mt-2 font-serif text-[30px] sm:text-[42px] leading-[1.05] tracking-[-0.01em]">
              Read every clause. Miss <span className="italic text-[#6B7F5E]">nothing.</span>
            </h1>
            <p className="mt-3 text-[16px] text-[#4A5540] max-w-[560px]">
              Upload contracts, notices, or court orders. We run basic masking (CNIC, phone, email) before analysis, flag risky clauses, and check them against the statutes in our corpus.
            </p>
          </div>
          <div className="inline-flex items-center bg-white border border-[#D8D9C8] rounded-md p-1 self-start">
            <button onClick={() => setView('upload')} className={`h-8 px-3 rounded-[5px] text-[14px] font-medium ${view === 'upload' ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'text-[#3A3D2E]'}`}>Upload</button>
            <button onClick={() => setView('analysis')} className={`h-8 px-3 rounded-[5px] text-[14px] font-medium ${view === 'analysis' ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'text-[#3A3D2E]'}`}>Analysis</button>
          </div>
        </div>

        {view === 'upload' ? <UploadView onUploaded={() => setView('analysis')} /> : <AnalysisView />}
      </div>
    </div>
  );
}

// ---- UPLOAD ZONE ----
function UploadView({ onUploaded }) {
  const [drag, setDrag] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const startAnalyzing = () => {
    setAnalyzing(true);
    setTimeout(onUploaded, 900);
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-10 py-6 sm:py-10 overflow-y-auto lg:overflow-hidden">
      <div className="lg:col-span-2">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) startAnalyzing(); }}
          className={`relative min-h-[380px] lg:h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-6 transition-colors ${drag ? 'border-[#6B7F5E] bg-[#ECEBD9]/60' : 'border-[#D8D9C8] bg-white/40'}`}
        >
          <div className="absolute inset-6 rounded-xl border rule-hair pointer-events-none" />
          {/* corner marks */}
          {['top-6 left-6', 'top-6 right-6', 'bottom-6 left-6', 'bottom-6 right-6'].map((p, i) => (
            <div key={i} className={`absolute w-3 h-3 border-[#6B7F5E]/70 ${p} ${
              i === 0 ? 'border-l border-t' : i === 1 ? 'border-r border-t' : i === 2 ? 'border-l border-b' : 'border-r border-b'
            }`} />
          ))}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => { if (e.target.files.length) startAnalyzing(); }}
          />

          <div className="w-20 h-20 rounded-full bg-[#EDE9D5] border border-[#B9C2A0] flex items-center justify-center">
            <Icon name={analyzing ? 'file-check-2' : 'file-up'} size={30} color="#4A5540" />
          </div>
          <div className="mt-6 font-serif text-[26px] leading-tight">
            {analyzing ? 'Reading your document…' : 'Drop a document to begin.'}
          </div>
          <p className="mt-2 text-[16px] text-[#4A5540] max-w-[420px]">
            {analyzing
              ? 'Masking and analysis run before anything is shown to you.'
              : 'PDF, DOCX, JPG, or scanned pages. Up to 40 MB. Basic masking (CNIC, phone, email) runs before analysis.'}
          </p>
          {!analyzing && (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Btn variant="primary" icon="folder-open" onClick={() => fileInputRef.current?.click()}>Browse files</Btn>
                <Btn variant="outline" icon="link-2" disabled title="Coming soon">Paste from URL</Btn>
                <Btn variant="outline" icon="clipboard" disabled title="Coming soon">Paste text</Btn>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] text-[#7A7D68]">
                <span className="inline-flex items-center gap-1.5"><Icon name="shield-check" size={12} color="#6B7F5E" /> Your CNIC, phone number, and email are hidden before we read it</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="lock" size={12} color="#6B7F5E" /> Sent securely</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="eye-off" size={12} color="#6B7F5E" /> Never used to train AI models</span>
              </div>
            </>
          )}
        </div>
      </div>

      <aside className="col-span-1 space-y-5">
        <Card>
          <Eyebrow>Recent uploads</Eyebrow>
          <div className="mt-3 space-y-2">
            {[
              { id: 'doc-1', name: 'Sale-Deed_Bahadurabad.pdf', when: '2 h ago', size: '1.2 MB' },
              { id: 'doc-2', name: 'Eviction_Notice_Draft.docx', when: 'Yesterday', size: '48 KB' },
              { id: 'doc-3', name: 'Family-Court_Order_July.pdf', when: 'Aug 22', size: '3.4 MB' },
            ].map((f) => (
              <Link key={f.id} to={`/documents/${f.id}`} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-[#F0EFE3]">
                <div className="w-8 h-10 rounded-sm bg-[#ECEBD9] border border-[#B9C2A0] flex items-center justify-center"><Icon name="file-text" size={13} color="#4A5540" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] truncate">{f.name}</div>
                  <div className="text-[14px] text-[#7A7D68]">{f.when} · {f.size}</div>
                </div>
                <Icon name="chevron-right" size={13} color="#7A7D68" />
              </Link>
            ))}
          </div>
        </Card>

        <Card tone="subtle">
          <Eyebrow>What this can do</Eyebrow>
          <ul className="mt-3 space-y-2 text-[14px] text-[#3A3D2E]">
            <li className="flex gap-2"><Icon name="check" size={13} color="#5C8A52"/>Finds the obligations in each clause</li>
            <li className="flex gap-2"><Icon name="check" size={13} color="#5C8A52"/>Flags risky, unclear, or unusual clauses</li>
            <li className="flex gap-2"><Icon name="check" size={13} color="#5C8A52"/>Checks clauses against the statutes in our corpus</li>
            <li className="flex gap-2"><Icon name="check" size={13} color="#5C8A52"/>Lists important dates and deadlines</li>
          </ul>
        </Card>
      </aside>
    </div>
  );
}

// ---- ANALYSIS VIEW ----
// Exported so DocumentDetail.jsx can reuse this exact view for a single document.
export function AnalysisView() {
  const clauses = [
    { n: 4,  title: 'Rent & escalation',         risk: 'flag', note: 'Escalation of 15% p.a. exceeds Sindh Rented Premises Ordinance ceiling of 10%.' },
    { n: 11, title: 'Termination on default',    risk: 'warn', note: 'No cure period. Consider 15-day cure per §17 SRPO 1979.' },
    { n: 14, title: 'Forfeiture & re-entry',     risk: 'flag', note: 'Landlord’s self-help re-entry — void under Transfer of Property Act §111(g).', active: true },
    { n: 21, title: 'Governing law & jurisdiction', risk: 'ok', note: 'Karachi courts — appropriate for premises situated in Sindh.' },
  ];
  const flagged = clauses.filter(c => c.risk === 'flag').length;
  const warnings = clauses.filter(c => c.risk === 'warn').length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden">
      <div className="px-4 sm:px-8 pt-6 shrink-0"><Disclaimer /></div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 sm:px-8 py-6 overflow-y-auto lg:overflow-hidden">
      {/* LEFT — Document preview */}
      <div className="lg:col-span-7 flex flex-col rounded-xl border rule-hair bg-white overflow-hidden h-[70vh] lg:h-auto">
        <div className="h-11 px-4 flex items-center justify-between gap-2 border-b rule-hair bg-[#F7F6F0] overflow-x-auto">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-6 h-8 rounded-sm bg-[#ECEBD9] border border-[#B9C2A0] flex items-center justify-center shrink-0"><Icon name="file-text" size={11} color="#4A5540" /></div>
            <div className="text-[14px] font-medium truncate">Tenancy_Agreement_Bahadurabad_2026.pdf</div>
            <Chip tone="taupe" className="hidden sm:inline-flex">28 pages · {clauses.length} clauses</Chip>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Chip tone="flag" icon="alert-triangle" className="hidden sm:inline-flex">Sample</Chip>
            <IconTop name="download" />
          </div>
        </div>

        {/* Masking notice */}
        <div className="mx-4 mt-4 rounded-lg border border-[#6B7F5E]/40 bg-[#ECEBD9]/70 p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6B7F5E] text-[#F7F6F0] flex items-center justify-center shrink-0"><Icon name="eye-off" size={14}/></div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[14px]">Basic masking</span>
              <Chip tone="bronze" icon="shield-check">Applied before analysis</Chip>
            </div>
            <div className="text-[14px] text-[#4A5540] mt-1">
              Masked automatically: CNIC numbers, phone numbers, and email addresses. This document had 2 CNIC numbers and 1 phone number masked. <strong>Not masked: names and addresses.</strong> Review before sharing this document further.
            </div>
          </div>
        </div>

        {/* Page canvas */}
        <div className="flex-1 overflow-auto pl-scroll p-6 bg-[#F0EFE3]">
          <div className="mx-auto max-w-[560px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.03),0_20px_50px_-30px_rgba(42,47,34,0.35)] rounded-sm">
            <div className="p-10 font-serif text-[16px] leading-[1.7] text-[#2A2F22]">
              <div className="text-center smallcaps text-[14px] text-[#6B7F5E] mb-4">Tenancy Agreement — Bahadurabad, Karachi</div>
              <div className="text-center font-serif text-[20px] mb-6">Deed of Tenancy</div>
              <p><strong>THIS AGREEMENT</strong> is made at Karachi on this 14<sup>th</sup> day of August, 2026 <strong>BETWEEN</strong> Mr. Tariq Mehmood son of Abdul Mehmood, CNIC No. <MaskTok mono>CNIC-••••-•••••32-1</MaskTok>, resident of Bahadurabad, Karachi (hereinafter “the LANDLORD”)…</p>
              <p className="mt-3">…<strong>AND</strong> Mrs. Sana Raza daughter of Iqbal Raza, CNIC No. <MaskTok mono>CNIC-••••-•••••97-2</MaskTok>, mobile <MaskTok mono>PH-03••-•••••42</MaskTok> (hereinafter “the TENANT”), of the OTHER PART.</p>

              <div className="mt-6 smallcaps text-[14px] text-[#6B7F5E]">Clause 4 · Rent &amp; Escalation</div>
              <p className="mt-1">The Tenant shall pay a monthly rent of Rupees One Hundred and Twenty-Five Thousand (Rs. 125,000/–) payable in advance on or before the fifth day of each calendar month. <span className="bg-[#F3DDD5] border-b-2 border-[#B8543A] px-0.5">The rent shall stand enhanced by fifteen per centum (15%) per annum on each renewal.</span></p>

              <div className="mt-5 smallcaps text-[14px] text-[#6B7F5E]">Clause 14 · Forfeiture &amp; Re-entry <span className="text-[#B8543A]">— flagged</span></div>
              <p className="mt-1">On any default in payment beyond seven (7) days, or breach of any covenant herein, <span className="bg-[#F3DDD5] border-b-2 border-[#B8543A] px-0.5">the Landlord shall, without notice or recourse to any court, be entitled to re-enter the premises and take possession thereof</span>, and all fixtures shall stand forfeited to the Landlord.</p>

              <div className="mt-5 smallcaps text-[14px] text-[#6B7F5E]">Clause 21 · Governing Law</div>
              <p className="mt-1">This Agreement shall be governed by the laws of the Islamic Republic of Pakistan and the parties submit to the exclusive jurisdiction of the courts at Karachi.</p>
            </div>
          </div>

          <div className="mx-auto max-w-[560px] mt-4 flex items-center justify-between text-[14px] text-[#7A7D68] font-mono-jb">
            <span>Page 4 of 28</span>
            <span>{flagged} flags · {warnings} warnings in this document</span>
          </div>
        </div>
      </div>

      {/* RIGHT — Analysis panel */}
      <div className="lg:col-span-5 overflow-auto pl-scroll space-y-5">
        {/* Summary card */}
        <Card tone="cream" padding="p-0" className="overflow-hidden">
          <div className="bg-[#2A2F22] text-[#F7F6F0] p-5">
            <div className="smallcaps text-[14px] text-[#B9C2A0]">Summary</div>
            <div className="font-serif text-[22px] leading-tight mt-1">Standard Karachi tenancy — <span className="italic">{flagged} clause{flagged === 1 ? '' : 's'} worth a closer look.</span></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <SumStat n={clauses.length} label="Clauses" tone="cream"/>
              <SumStat n={flagged}  label="Flagged" tone="flag"/>
              <SumStat n={warnings} label="Warnings" tone="warn"/>
            </div>
          </div>
          <div className="p-5 text-[16px] leading-[1.65] text-[#3A3D2E]">
            Two clauses are worth raising with the landlord before you sign: <strong>Clause 4</strong>'s rent increase is higher than the cap allowed under the Sindh Rented Premises Ordinance, 1979, and <strong>Clause 14</strong> lets the landlord retake the property without going to court, which may not hold up under the Transfer of Property Act, 1882.
          </div>
        </Card>

        {/* Clause list */}
        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Eyebrow>Clauses &amp; Obligations</Eyebrow>
          </div>
          <div className="mt-3">
            {clauses.map(c => <ClauseRow key={c.n} c={c} />)}
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}

// ---- bits ----
function MaskTok({ children, mono }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0 rounded bg-[#EDE9D5] border border-[#B9C2A0] text-[14px] align-baseline ${mono ? 'font-mono-jb' : ''} text-[#4A5540]`}>
      <Icon name="eye-off" size={9} /> {children}
    </span>
  );
}
function IconTop({ name }) {
  return <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F0EFE3] text-[#3A3D2E]"><Icon name={name} size={13}/></button>;
}
function SumStat({ n, label, tone }) {
  const c = tone === 'flag' ? 'text-[#F3DDD5]' : tone === 'warn' ? 'text-[#ECEBD9]' : 'text-[#F7F6F0]';
  return (
    <div className="rounded-md bg-[#F7F6F0]/8 border border-[#F7F6F0]/10 py-2.5">
      <div className={`font-serif text-[22px] leading-none ${c}`}>{n}</div>
      <div className="smallcaps text-[14px] text-[#B9C2A0] mt-1">{label}</div>
    </div>
  );
}
function ClauseRow({ c }) {
  const risk = c.risk === 'flag' ? { color: '#B8543A', label: 'Risky', icon: 'alert-octagon' }
             : c.risk === 'warn' ? { color: '#C08A2E', label: 'Worth a look', icon: 'alert-triangle' }
             : { color: '#5C8A52', label: 'Fine', icon: 'check-circle-2' };
  return (
    <div className={`px-5 py-3 border-t rule-hair flex items-start gap-3 ${c.active ? 'bg-[#ECEBD9]/60' : ''}`}>
      <div className="w-9 shrink-0 text-center">
        <div className="smallcaps text-[14px] text-[#6B7F5E]">Cl.</div>
        <div className="font-serif text-[16px] leading-none mt-0.5">{c.n}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-serif text-[14px]">{c.title}</div>
          <span className="inline-flex items-center gap-1 text-[14px] font-medium px-1.5 py-0.5 rounded-full border" style={{ color: risk.color, borderColor: risk.color + '55', background: risk.color + '11' }}>
            <Icon name={risk.icon} size={10} color={risk.color} />{risk.label}
          </span>
        </div>
        <div className="text-[16px] text-[#4A5540] mt-1 leading-snug">{c.note}</div>
      </div>
      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#7A7D68] hover:bg-[#F0EFE3] hover:text-[#2A2F22]">
        <Icon name="chevron-right" size={13}/>
      </button>
    </div>
  );
}
