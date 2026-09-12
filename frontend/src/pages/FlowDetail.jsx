import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon, Btn, Eyebrow, Card, Disclaimer } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';
import { getSavedFlowLang } from '../lib/flowLang';

// The Express backend. Override via a .env file (VITE_API_URL) if it runs
// somewhere other than localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FlowDetail() {
  const { slug } = useParams();
  const [flow, setFlow] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  // Opens in whichever language was last picked on the Flows list.
  const lang = getSavedFlowLang();
  const rtl = lang === 'ur';

  // currentStep is the index of the step you're actively working on;
  // everything before it counts as done, everything after as not-yet-reached.
  const [currentStep, setCurrentStep] = React.useState(0);
  const [expanded, setExpanded] = React.useState({});

  React.useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/flows/${encodeURIComponent(slug)}?lang=${lang}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("This flow doesn't exist.");
        if (!res.ok) throw new Error(`Flows service returned ${res.status}`);
        const data = await res.json();
        setFlow(data);
        setCurrentStep(0);
        setExpanded({ 0: true });
      })
      .catch((err) => setError(err.message || "Couldn't reach the backend — make sure it's running."))
      .finally(() => setLoading(false));
  }, [slug, lang]);

  const steps = flow?.steps || [];

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, index));
    setCurrentStep(clamped);
    setExpanded(e => ({ ...e, [clamped]: true }));
  };

  const toggle = (i) => setExpanded(e => ({ ...e, [i]: !e[i] }));
  const progressPct = steps.length > 1 ? Math.round((currentStep / (steps.length - 1)) * 100) : 0;

  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
      {/* Page header */}
      <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 border-b rule-hair">
        <Link to="/flows" className="inline-flex items-center gap-1.5 text-[14px] text-[#6B7F5E] font-medium hover:underline mb-4">
          <Icon name="chevron-left" size={14} /> All flows
        </Link>
        {flow && (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div dir={rtl ? 'rtl' : 'ltr'} className="max-w-[640px]">
              <Eyebrow>Guided procedure</Eyebrow>
              {/* tracking-[-0.01em] is a negative letter-spacing tuned for the
                  Latin serif face; applied to Nastaliq it visually crowds the
                  joined Arabic-script letterforms together, so it's dropped
                  for the rtl case instead of just adding the Nastaliq font. */}
              <h1 className={`mt-2 font-serif text-[28px] sm:text-[36px] leading-[1.08] ${rtl ? 'font-nastaliq' : 'tracking-[-0.01em]'}`}>{flow.title}</h1>
              <p className={`mt-2 text-[16px] text-[#4A5540] ${rtl ? 'font-nastaliq text-[17px]' : ''}`}>{flow.situation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8">
        <div className="max-w-[760px] mx-auto space-y-5">
          <Disclaimer />

          {loading ? (
            <div className="text-center py-24 text-[16px] text-[#7A7D68]">Loading…</div>
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <Card tone="cream" padding="p-0" className="overflow-hidden">
              <div className="bg-[#2A2F22] text-[#F7F6F0] p-6">
                <div className="flex items-start justify-between">
                  <div dir={rtl ? 'rtl' : 'ltr'}>
                    <div className="smallcaps text-[14px] text-[#B9C2A0]">In progress</div>
                    <div className={`mt-2 font-serif text-[26px] leading-tight ${rtl ? 'font-nastaliq' : ''}`}>{flow.title}</div>
                    <div className={`text-[14px] text-[#B9C2A0]/85 mt-1 ${rtl ? 'font-nastaliq text-[15px]' : ''}`}>{flow.situation}</div>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-[#F7F6F0]/10 flex items-center justify-center shrink-0">
                    <Icon name="scroll-text" size={22} color="#ECEBD9" />
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-[14px] text-[#B9C2A0]/85 mb-1.5">
                    <span>Step {currentStep + 1} of {steps.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F7F6F0]/12">
                    <div className="h-full rounded-full bg-[#6B7F5E] transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                {steps.map((s, i) => (
                  <StepDetail
                    key={i}
                    n={i + 1}
                    step={s}
                    state={i < currentStep ? 'done' : i === currentStep ? 'active' : 'idle'}
                    isOpen={!!expanded[i]}
                    onToggle={() => toggle(i)}
                    rtl={rtl}
                  />
                ))}
              </div>

              <div className="p-6 pt-0 flex items-center justify-between">
                <Btn variant="ghost" icon="chevron-left" onClick={() => goTo(currentStep - 1)} disabled={currentStep === 0}>Previous</Btn>
                {currentStep < steps.length - 1 ? (
                  <Btn variant="primary" iconRight="arrow-right" onClick={() => goTo(currentStep + 1)}>Continue to step {currentStep + 2}</Btn>
                ) : (
                  <Btn variant="primary" icon="check" disabled>All steps complete</Btn>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 rounded-xl border border-dashed border-[#D8D9C8]">
      <div className="w-16 h-16 rounded-full bg-[#F3DDD5] border border-[#D9A797] flex items-center justify-center">
        <Icon name="alert-triangle" size={26} color="#8A3B24" />
      </div>
      <div className="mt-5 font-serif text-[22px] leading-tight">Couldn't load this flow.</div>
      <p className="mt-2 text-[16px] text-[#4A5540] max-w-[360px]">{message}</p>
    </div>
  );
}

function StepDetail({ n, step, state, isOpen, onToggle, rtl }) {
  return (
    <div className={`rounded-lg border transition-colors ${isOpen ? 'bg-white border-[#6B7F5E]/40' : 'bg-[#F2F1E6]/60 border-[#DFE0CE] hover:border-[#6B7F5E]/40'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-[14px] border shrink-0 ${
          state === 'done' ? 'bg-[#5C8A52]/15 border-[#5C8A52] text-[#3E5236]'
          : state === 'active' ? 'bg-[#6B7F5E] border-[#6B7F5E] text-[#F7F6F0]'
          : 'bg-white border-[#D8D9C8] text-[#7A7D68]'
        }`}>
          {state === 'done' ? <Icon name="check" size={13} stroke={2.5} /> : n}
        </div>
        <div className="flex-1 min-w-0" dir={rtl ? 'rtl' : 'ltr'}>
          <div className={`font-serif text-[16px] leading-tight ${rtl ? 'font-nastaliq text-[17px]' : ''}`}>{step.label}</div>
          {state === 'active' && !isOpen && <div className="text-[14px] text-[#6B7F5E] mt-0.5">Current step</div>}
        </div>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#7A7D68" />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          <div className="border-l-2 border-[#6B7F5E] pl-4 py-1" dir={rtl ? 'rtl' : 'ltr'}>
            <p className={`font-serif text-[16px] leading-[1.65] text-[#363B2C] ${rtl ? 'font-nastaliq text-[17px]' : ''}`}>{step.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}
