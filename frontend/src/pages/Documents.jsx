import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Chip, Btn, Eyebrow, Card, Disclaimer } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';
import { getToken, clearToken } from '../lib/auth';

// The Express backend. Override via a .env file (VITE_API_URL) if it runs
// somewhere other than localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Document analysis — upload a document, or review one already analysed.
// One screen: summary, flagged clauses, obligations, and the masking notice
// all live together here. Asking questions about the document is just chat
// with the document as context, not a separate feature.
export default function Documents() {
  const [view, setView] = React.useState('upload'); // 'upload' | 'analysis'
  const [result, setResult] = React.useState(null);

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
              Upload a contract, notice, or court order (PDF). We run basic masking (CNIC, phone, email) before analysis, flag risky clauses, and check them against the statutes in our corpus.
            </p>
          </div>
          {result && (
            <div className="inline-flex items-center bg-white border border-[#D8D9C8] rounded-md p-1 self-start">
              <button onClick={() => setView('upload')} className={`h-8 px-3 rounded-[5px] text-[14px] font-medium ${view === 'upload' ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'text-[#3A3D2E]'}`}>Upload</button>
              <button onClick={() => setView('analysis')} className={`h-8 px-3 rounded-[5px] text-[14px] font-medium ${view === 'analysis' ? 'bg-[#2A2F22] text-[#F7F6F0]' : 'text-[#3A3D2E]'}`}>Analysis</button>
            </div>
          )}
        </div>

        {view === 'analysis' && result
          ? <AnalysisView data={result} />
          : <UploadView onUploaded={(data) => { setResult(data); setView('analysis'); }} />}
      </div>
    </div>
  );
}

// ---- UPLOAD ZONE ----
function UploadView({ onUploaded }) {
  const navigate = useNavigate();
  const [drag, setDrag] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState('');
  const fileInputRef = React.useRef(null);

  const upload = async (file) => {
    setError('');
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted right now.');
      return;
    }
    const token = getToken();
    if (!token) {
      setError('Please sign in to upload a document.');
      return;
    }

    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.status === 401) {
        clearToken();
        navigate('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status}).`);
      onUploaded(data);
    } catch (err) {
      setError(err.message || "Couldn't reach the backend — make sure it's running.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-10 py-6 sm:py-10 overflow-y-auto pl-scroll">
      <div className="lg:col-span-2">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files[0]); }}
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
            accept="application/pdf"
            aria-label="Upload a PDF document for analysis"
            className="hidden"
            onChange={e => { if (e.target.files.length) upload(e.target.files[0]); }}
          />

          <div className="w-20 h-20 rounded-full bg-[#EDE9D5] border border-[#B9C2A0] flex items-center justify-center">
            <Icon name={analyzing ? 'file-check-2' : 'file-up'} size={30} color="#4A5540" />
          </div>
          <div className="mt-6 font-serif text-[26px] leading-tight">
            {analyzing ? 'Reading your document…' : 'Drop a document to begin.'}
          </div>
          <p className="mt-2 text-[16px] text-[#4A5540] max-w-[420px]">
            {analyzing
              ? 'Masking and analysis run before anything is shown to you. This can take a minute or two.'
              : 'PDF only, up to 10 MB. Basic masking (CNIC, phone, email) runs before analysis.'}
          </p>
          {error && (
            <div className="mt-4 max-w-[420px] flex items-start gap-2.5 text-[14px] text-[#8A3B24] bg-[#F3DDD5] border border-[#D9A797] rounded-md p-3">
              <Icon name="alert-triangle" size={14} color="#8A3B24" />
              <div>{error}</div>
            </div>
          )}
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
// Exported so DocumentDetail.jsx can reuse this exact view for a past upload.
export function AnalysisView({ data }) {
  if (!data) return null;
  const clauses = data.clauses || [];
  const obligations = data.obligations || [];
  const masking = data.masking || { cnic: 0, phone: 0, email: 0 };
  const flagged = clauses.filter(c => c.status === 'flag').length;
  const warnings = clauses.filter(c => c.status === 'warn').length;

  return (
    <div className="flex-1 overflow-y-auto pl-scroll">
      <div className="px-4 sm:px-8 pt-6"><Disclaimer /></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 sm:px-8 py-6">
        {/* LEFT — Document info, masking, obligations */}
        <div className="lg:col-span-5 space-y-5">
          <Card padding="p-0" className="overflow-hidden">
            <div className="h-11 px-4 flex items-center gap-3 border-b rule-hair bg-[#F7F6F0]">
              <div className="w-6 h-8 rounded-sm bg-[#ECEBD9] border border-[#B9C2A0] flex items-center justify-center shrink-0"><Icon name="file-text" size={11} color="#4A5540" /></div>
              <div className="text-[14px] font-medium truncate">{data.filename}</div>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-lg border border-[#6B7F5E]/40 bg-[#ECEBD9]/70 p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#6B7F5E] text-[#F7F6F0] flex items-center justify-center shrink-0"><Icon name="eye-off" size={14}/></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-[14px]">Basic masking</span>
                    <Chip tone="bronze" icon="shield-check">Applied before analysis</Chip>
                  </div>
                  <div className="text-[14px] text-[#4A5540] mt-1">
                    Masked automatically: {masking.cnic} CNIC number{masking.cnic === 1 ? '' : 's'}, {masking.phone} phone number{masking.phone === 1 ? '' : 's'}, {masking.email} email address{masking.email === 1 ? '' : 'es'}. <strong>Not masked: names and addresses.</strong> Review before sharing this document further.
                  </div>
                </div>
              </div>
              {data.truncated && (
                <div className="text-[14px] text-[#7A7D68] flex items-center gap-1.5"><Icon name="info" size={12}/> Only the first part of this document was analyzed.</div>
              )}
            </div>
          </Card>

          {obligations.length > 0 && (
            <Card padding="p-0">
              <div className="px-5 pt-5"><Eyebrow>Important dates</Eyebrow></div>
              <div className="mt-3">
                {obligations.map((o, i) => (
                  <div key={i} className="px-5 py-3 border-t rule-hair flex items-start gap-3">
                    <Icon name="calendar" size={14} color="#6B7F5E" className="mt-0.5 shrink-0"/>
                    <div>
                      <div className="text-[14px] font-medium">{o.date}</div>
                      <div className="text-[14px] text-[#4A5540]">{o.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT — Summary + clauses */}
        <div className="lg:col-span-7 space-y-5">
          <Card tone="cream" padding="p-0" className="overflow-hidden">
            <div className="bg-[#2A2F22] text-[#F7F6F0] p-5">
              <div className="smallcaps text-[14px] text-[#B9C2A0]">Summary</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <SumStat n={clauses.length} label="Clauses" tone="cream"/>
                <SumStat n={flagged} label="Flagged" tone="flag"/>
                <SumStat n={warnings} label="Warnings" tone="warn"/>
              </div>
            </div>
            <div className="p-5 text-[16px] leading-[1.65] text-[#3A3D2E] whitespace-pre-wrap">
              {data.summary}
            </div>
          </Card>

          <Card padding="p-0">
            <div className="px-5 pt-5">
              <Eyebrow>Clauses &amp; Obligations</Eyebrow>
            </div>
            <div className="mt-3">
              {clauses.length === 0 ? (
                <div className="px-5 pb-5 text-[14px] text-[#7A7D68]">No clauses were flagged in this document.</div>
              ) : (
                clauses.map((c, i) => <ClauseRow key={i} c={c} />)
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---- bits ----
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
  const [open, setOpen] = React.useState(false);
  const risk = c.status === 'flag' ? { color: '#B8543A', label: 'Risky', icon: 'alert-octagon' }
             : c.status === 'warn' ? { color: '#C08A2E', label: 'Worth a look', icon: 'alert-triangle' }
             : { color: '#5C8A52', label: 'Fine', icon: 'check-circle-2' };
  return (
    <div className="border-t rule-hair">
      <button onClick={() => setOpen(o => !o)} className="w-full px-5 py-3 flex items-start gap-3 text-left">
        <div className="w-9 shrink-0 text-center">
          <div className="smallcaps text-[14px] text-[#6B7F5E]">Cl.</div>
          <div className="font-serif text-[16px] leading-none mt-0.5">{c.clauseNumber}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[14px] font-medium px-1.5 py-0.5 rounded-full border" style={{ color: risk.color, borderColor: risk.color + '55', background: risk.color + '11' }}>
              <Icon name={risk.icon} size={10} color={risk.color} />{risk.label}
            </span>
            {c.citationsVerified && <Chip tone="ok" icon="shield-check">Citation verified</Chip>}
          </div>
          <div className="text-[16px] text-[#4A5540] mt-1 leading-snug">{c.note}</div>
        </div>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} color="#7A7D68" className="mt-1"/>
      </button>
      {open && (
        <div className="px-5 pb-4 pl-[52px]">
          <p className="font-serif text-[15px] leading-[1.6] text-[#363B2C] italic border-l-2 border-[#6B7F5E] pl-3">{c.text}</p>
        </div>
      )}
    </div>
  );
}
