import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Card } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

// Document analysis — upload a document, or review one already analysed.
// One screen: summary, flagged clauses, obligations, and the masking notice
// all live together here. Asking questions about the document is just chat
// with the document as context, not a separate feature.
export default function Documents() {
  const [view, setView] = React.useState('analysis'); // 'upload' | 'analysis'

  return (
    <div className="flex h-screen w-full bg-[#F8F5F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2C221E] font-sans">
        {/* Page header */}
        <div className="px-10 pt-10 pb-6 flex items-end justify-between border-b rule-hair">
          <div>
            <Eyebrow>Document Analysis</Eyebrow>
            <h1 className="mt-2 font-serif text-[42px] leading-[1.02] tracking-[-0.01em]">
              Read every clause. Miss <span className="italic text-[#8C6D53]">nothing.</span>
            </h1>
            <p className="mt-3 text-[16px] text-[#6E5540] max-w-[560px]">
              Upload contracts, notices, or court orders. We run basic masking (CNIC, phone, email) before analysis, flag risky clauses, and check them against the statutes in our corpus.
            </p>
          </div>
          <div className="inline-flex items-center bg-white border border-[#D3C5BD] rounded-md p-1">
            <button onClick={() => setView('upload')} className={`h-8 px-3 rounded-[5px] text-[14px] font-medium ${view === 'upload' ? 'bg-[#2C221E] text-[#F8F5F0]' : 'text-[#4A3C34]'}`}>Upload</button>
            <button onClick={() => setView('analysis')} className={`h-8 px-3 rounded-[5px] text-[14px] font-medium ${view === 'analysis' ? 'bg-[#2C221E] text-[#F8F5F0]' : 'text-[#4A3C34]'}`}>Analysis</button>
          </div>
        </div>

        {view === 'upload' ? <UploadView /> : <AnalysisView />}
      </div>
    </div>
  );
}

// ---- UPLOAD ZONE ----
function UploadView() {
  const [drag, setDrag] = React.useState(false);
  return (
    <div className="flex-1 grid grid-cols-3 gap-8 px-10 py-10 overflow-hidden">
      <div className="col-span-2">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); }}
          className={`relative h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${drag ? 'border-[#8C6D53] bg-[#F1E4D6]/60' : 'border-[#D3C5BD] bg-white/40'}`}
        >
          <div className="absolute inset-6 rounded-xl border rule-hair pointer-events-none" />
          {/* corner marks */}
          {['top-6 left-6', 'top-6 right-6', 'bottom-6 left-6', 'bottom-6 right-6'].map((p, i) => (
            <div key={i} className={`absolute w-3 h-3 border-[#8C6D53]/70 ${p} ${
              i === 0 ? 'border-l border-t' : i === 1 ? 'border-r border-t' : i === 2 ? 'border-l border-b' : 'border-r border-b'
            }`} />
          ))}

          <div className="w-20 h-20 rounded-full bg-[#EFE4D2] border border-[#D6BFA8] flex items-center justify-center">
            <Icon name="file-up" size={30} color="#6E5540" />
          </div>
          <div className="mt-6 font-serif text-[26px] leading-tight">Drop a document to begin.</div>
          <p className="mt-2 text-[16px] text-[#6E5540] max-w-[420px]">PDF, DOCX, JPG, or scanned pages. Up to 40 MB. Basic masking (CNIC, phone, email) runs before analysis.</p>
          <div className="mt-6 flex items-center gap-3">
            <Btn variant="primary" icon="folder-open">Browse files</Btn>
            <Btn variant="outline" icon="link-2">Paste from URL</Btn>
            <Btn variant="outline" icon="clipboard">Paste text</Btn>
          </div>
          <div className="mt-8 flex items-center gap-6 text-[14px] text-[#7D7268]">
            <span className="inline-flex items-center gap-1.5"><Icon name="shield-check" size={12} color="#8C6D53" /> Basic masking: CNIC, phone, email</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="lock" size={12} color="#8C6D53" /> Encrypted in transit</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="eye-off" size={12} color="#8C6D53" /> Never trained on</span>
          </div>
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
              <Link key={f.id} to={`/documents/${f.id}`} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-[#EFEAE1]">
                <div className="w-8 h-10 rounded-sm bg-[#F1E4D6] border border-[#D6BFA8] flex items-center justify-center"><Icon name="file-text" size={13} color="#6E5540" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] truncate">{f.name}</div>
                  <div className="text-[14px] text-[#7D7268]">{f.when} · {f.size}</div>
                </div>
                <Icon name="chevron-right" size={13} color="#7D7268" />
              </Link>
            ))}
          </div>
        </Card>

        <Card tone="subtle">
          <Eyebrow>What this can do</Eyebrow>
          <ul className="mt-3 space-y-2 text-[14px] text-[#4A3C34]">
            <li className="flex gap-2"><Icon name="check" size={13} color="#5A7A4E"/>Finds the obligations in each clause</li>
            <li className="flex gap-2"><Icon name="check" size={13} color="#5A7A4E"/>Flags risky, unclear, or unusual clauses</li>
            <li className="flex gap-2"><Icon name="check" size={13} color="#5A7A4E"/>Checks clauses against the statutes in our corpus</li>
            <li className="flex gap-2"><Icon name="check" size={13} color="#5A7A4E"/>Lists important dates and deadlines</li>
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
    { n: 1,  title: 'Parties & recitals',        risk: 'ok',   note: 'Both parties identified. CNIC digits masked.' },
    { n: 4,  title: 'Rent & escalation',         risk: 'flag', note: 'Escalation of 15% p.a. exceeds Sindh Rented Premises Ordinance ceiling of 10%.' },
    { n: 7,  title: 'Security deposit',          risk: 'ok',   note: 'Two months — within customary range.' },
    { n: 11, title: 'Termination on default',    risk: 'warn', note: 'No cure period. Consider 15-day cure per §17 SRPO 1979.' },
    { n: 14, title: 'Forfeiture & re-entry',     risk: 'flag', note: 'Landlord’s self-help re-entry — void under Transfer of Property Act §111(g).', active: true },
    { n: 18, title: 'Indemnity',                 risk: 'warn', note: 'Uncapped indemnity by tenant. Recommend cap at 12 months’ rent.' },
    { n: 21, title: 'Governing law & jurisdiction', risk: 'ok', note: 'Karachi courts — appropriate for premises situated in Sindh.' },
    { n: 24, title: 'Force majeure',             risk: 'ok',   note: 'Includes pandemic + civil disturbance. Standard scope.' },
  ];
  const flagged = clauses.filter(c => c.risk === 'flag').length;
  const warnings = clauses.filter(c => c.risk === 'warn').length;

  return (
    <div className="flex-1 grid grid-cols-12 gap-6 px-8 py-6 overflow-hidden">
      {/* LEFT — Document preview */}
      <div className="col-span-7 flex flex-col rounded-xl border rule-hair bg-white overflow-hidden">
        <div className="h-11 px-4 flex items-center justify-between border-b rule-hair bg-[#F8F5F0]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-8 rounded-sm bg-[#F1E4D6] border border-[#D6BFA8] flex items-center justify-center"><Icon name="file-text" size={11} color="#6E5540" /></div>
            <div className="text-[14px] font-medium">Tenancy_Agreement_Bahadurabad_2026.pdf</div>
            <Chip tone="taupe">28 pages · {clauses.length} clauses</Chip>
          </div>
          <div className="flex items-center gap-1">
            <IconTop name="minus" /> <span className="text-[14px] font-mono-jb w-10 text-center">92%</span> <IconTop name="plus" />
            <div className="w-px h-5 bg-[#D3C5BD] mx-1" />
            <IconTop name="rotate-cw" /><IconTop name="download" /><IconTop name="printer" />
          </div>
        </div>

        {/* Masking notice */}
        <div className="mx-4 mt-4 rounded-lg border border-[#8C6D53]/40 bg-[#F1E4D6]/70 p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8C6D53] text-[#F8F5F0] flex items-center justify-center shrink-0"><Icon name="eye-off" size={14}/></div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[14px]">Basic masking</span>
              <Chip tone="bronze" icon="shield-check">Applied before analysis</Chip>
            </div>
            <div className="text-[14px] text-[#6E5540] mt-1">
              Masked: CNIC numbers, phone numbers, and email addresses, found using pattern matching. This document had 2 CNIC numbers and 1 phone number masked. <strong>Not masked: names and addresses.</strong> Review before sharing this document further.
            </div>
          </div>
        </div>

        {/* Page canvas */}
        <div className="flex-1 overflow-auto pl-scroll p-6 bg-[#EFEAE1]">
          <div className="mx-auto max-w-[560px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.03),0_20px_50px_-30px_rgba(44,34,30,0.35)] rounded-sm">
            <div className="p-10 font-serif text-[16px] leading-[1.7] text-[#2C221E]">
              <div className="text-center smallcaps text-[14px] text-[#8C6D53] mb-4">Tenancy Agreement — Bahadurabad, Karachi</div>
              <div className="text-center font-serif text-[20px] mb-6">Deed of Tenancy</div>
              <p><strong>THIS AGREEMENT</strong> is made at Karachi on this 14<sup>th</sup> day of August, 2026 <strong>BETWEEN</strong> Mr. Tariq Mehmood son of Abdul Mehmood, CNIC No. <MaskTok mono>CNIC-••••-•••••32-1</MaskTok>, resident of Bahadurabad, Karachi (hereinafter “the LANDLORD”)…</p>
              <p className="mt-3">…<strong>AND</strong> Mrs. Sana Raza daughter of Iqbal Raza, CNIC No. <MaskTok mono>CNIC-••••-•••••97-2</MaskTok>, mobile <MaskTok mono>PH-03••-•••••42</MaskTok> (hereinafter “the TENANT”), of the OTHER PART.</p>

              <div className="mt-6 smallcaps text-[14px] text-[#8C6D53]">Clause 4 · Rent &amp; Escalation</div>
              <p className="mt-1">The Tenant shall pay a monthly rent of Rupees One Hundred and Twenty-Five Thousand (Rs. 125,000/–) payable in advance on or before the fifth day of each calendar month. <span className="bg-[#F3DDD5] border-b-2 border-[#B8543A] px-0.5">The rent shall stand enhanced by fifteen per centum (15%) per annum on each renewal.</span></p>

              <div className="mt-5 smallcaps text-[14px] text-[#8C6D53]">Clause 14 · Forfeiture &amp; Re-entry <span className="text-[#B8543A]">— flagged</span></div>
              <p className="mt-1">On any default in payment beyond seven (7) days, or breach of any covenant herein, <span className="bg-[#F3DDD5] border-b-2 border-[#B8543A] px-0.5">the Landlord shall, without notice or recourse to any court, be entitled to re-enter the premises and take possession thereof</span>, and all fixtures shall stand forfeited to the Landlord.</p>

              <div className="mt-5 smallcaps text-[14px] text-[#8C6D53]">Clause 21 · Governing Law</div>
              <p className="mt-1">This Agreement shall be governed by the laws of the Islamic Republic of Pakistan and the parties submit to the exclusive jurisdiction of the courts at Karachi.</p>
            </div>
          </div>

          <div className="mx-auto max-w-[560px] mt-4 flex items-center justify-between text-[14px] text-[#7D7268] font-mono-jb">
            <span>Page 4 of 28</span>
            <span>{flagged} flags · {warnings} warnings in this document</span>
          </div>
        </div>
      </div>

      {/* RIGHT — Analysis panel */}
      <div className="col-span-5 overflow-auto pl-scroll space-y-5">
        {/* Summary card */}
        <Card tone="cream" padding="p-0" className="overflow-hidden">
          <div className="bg-[#2C221E] text-[#F8F5F0] p-5">
            <div className="smallcaps text-[14px] text-[#D6BFA8]">Summary</div>
            <div className="font-serif text-[22px] leading-tight mt-1">Standard Karachi tenancy — <span className="italic">{flagged} clause{flagged === 1 ? '' : 's'} worth a closer look.</span></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <SumStat n={clauses.length} label="Clauses" tone="cream"/>
              <SumStat n={flagged}  label="Flagged" tone="flag"/>
              <SumStat n={warnings} label="Warnings" tone="warn"/>
            </div>
          </div>
          <div className="p-5 text-[16px] leading-[1.65] text-[#4A3C34]">
            Two clauses are worth raising with the landlord before you sign: <strong>Clause 4</strong>'s rent increase is higher than the cap allowed under the Sindh Rented Premises Ordinance, 1979, and <strong>Clause 14</strong> lets the landlord retake the property without going to court, which may not hold up under the Transfer of Property Act, 1882.
          </div>
        </Card>

        {/* Clause list */}
        <Card padding="p-0">
          <div className="px-5 pt-5 flex items-center justify-between">
            <div>
              <Eyebrow>Clauses &amp; Obligations</Eyebrow>
              <div className="font-serif text-[16px] mt-1">By risk · descending</div>
            </div>
            <div className="flex items-center gap-1 text-[14px]">
              <FilterPill dot="#B8543A">Flag</FilterPill>
              <FilterPill dot="#C08A2E">Warn</FilterPill>
              <FilterPill dot="#5A7A4E">OK</FilterPill>
            </div>
          </div>
          <div className="mt-3">
            {clauses.map(c => <ClauseRow key={c.n} c={c} />)}
          </div>
        </Card>

        <Card tone="subtle">
          <Eyebrow>Obligations timeline</Eyebrow>
          <div className="mt-4 space-y-3">
            {[
              { d: '05 Sep 2026', t: 'First rent payable',       tone: 'ok' },
              { d: '14 Aug 2027', t: 'Renewal notice window opens (60 d)', tone: 'warn' },
              { d: '14 Aug 2029', t: 'Term expiry — 3-year lease',         tone: 'ok' },
            ].map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${o.tone === 'warn' ? 'bg-[#C08A2E]' : 'bg-[#5A7A4E]'}`} />
                <div className="text-[14px] flex-1">{o.t}</div>
                <div className="font-mono-jb text-[14px] text-[#6E5540]">{o.d}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---- bits ----
function MaskTok({ children, mono }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0 rounded bg-[#EFE4D2] border border-[#D6BFA8] text-[14px] align-baseline ${mono ? 'font-mono-jb' : ''} text-[#6E5540]`}>
      <Icon name="eye-off" size={9} /> {children}
    </span>
  );
}
function IconTop({ name }) {
  return <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#EFEAE1] text-[#4A3C34]"><Icon name={name} size={13}/></button>;
}
function SumStat({ n, label, tone }) {
  const c = tone === 'flag' ? 'text-[#F3DDD5]' : tone === 'warn' ? 'text-[#F1E4D6]' : 'text-[#F8F5F0]';
  return (
    <div className="rounded-md bg-[#F8F5F0]/8 border border-[#F8F5F0]/10 py-2.5">
      <div className={`font-serif text-[22px] leading-none ${c}`}>{n}</div>
      <div className="smallcaps text-[14px] text-[#D6BFA8] mt-1">{label}</div>
    </div>
  );
}
function FilterPill({ children, dot }) {
  return (
    <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[#D3C5BD] text-[#4A3C34] hover:bg-[#EFEAE1]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />{children}
    </button>
  );
}
function ClauseRow({ c }) {
  const risk = c.risk === 'flag' ? { color: '#B8543A', label: 'Flag', icon: 'alert-octagon' }
             : c.risk === 'warn' ? { color: '#C08A2E', label: 'Warn', icon: 'alert-triangle' }
             : { color: '#5A7A4E', label: 'OK', icon: 'check-circle-2' };
  return (
    <div className={`px-5 py-3 border-t rule-hair flex items-start gap-3 ${c.active ? 'bg-[#F1E4D6]/60' : ''}`}>
      <div className="w-9 shrink-0 text-center">
        <div className="smallcaps text-[14px] text-[#8C6D53]">Cl.</div>
        <div className="font-serif text-[16px] leading-none mt-0.5">{c.n}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-serif text-[14px]">{c.title}</div>
          <span className="inline-flex items-center gap-1 text-[14px] font-medium px-1.5 py-0.5 rounded-full border" style={{ color: risk.color, borderColor: risk.color + '55', background: risk.color + '11' }}>
            <Icon name={risk.icon} size={10} color={risk.color} />{risk.label}
          </span>
        </div>
        <div className="text-[16px] text-[#6E5540] mt-1 leading-snug">{c.note}</div>
      </div>
      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#7D7268] hover:bg-[#EFEAE1] hover:text-[#2C221E]">
        <Icon name="chevron-right" size={13}/>
      </button>
    </div>
  );
}
