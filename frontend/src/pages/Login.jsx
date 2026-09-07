import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Field, Icon, Eyebrow } from '../components/primitives';
import { PLSeal, PLWordmark } from '../components/seal';

// Sign in / create account — split brand + form layout. Stacks vertically
// on narrow screens instead of forcing the 55/45 side-by-side split.
export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState('signin'); // 'signin' | 'register'
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [name, setName] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/chat');
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F6F0] flex flex-col lg:flex-row lg:h-screen overflow-y-auto lg:overflow-hidden font-sans text-[#2A2F22]">
      {/* LEFT — brand composition */}
      <div className="relative w-full lg:w-[55%] lg:h-full bg-[#2A2F22] text-[#F7F6F0] overflow-hidden">
        {/* Warm noise + gradient */}
        <div className="absolute inset-0 opacity-90"
             style={{ background: 'radial-gradient(120% 80% at 20% 20%, #3A3D2E 0%, #2A2F22 55%, #1E2118 100%)' }} />
        <div className="absolute inset-0 paper-grain opacity-40 mix-blend-overlay" />

        {/* Concentric guilloché rings */}
        <svg className="absolute -right-40 -top-40 hidden sm:block" width="900" height="900" viewBox="0 0 900 900">
          {Array.from({ length: 26 }).map((_, i) => (
            <circle key={i} cx="450" cy="450" r={80 + i * 14}
                    fill="none" stroke="#B9C2A0" strokeOpacity={0.06 + (i % 3) * 0.03} strokeWidth="0.7"
                    strokeDasharray={i % 4 === 0 ? '1 3' : ''} />
          ))}
        </svg>

        {/* Frame corners */}
        <div className="absolute inset-10 border border-[#B9C2A0]/20 rounded-sm pointer-events-none hidden sm:block" />
        <div className="absolute inset-[46px] border border-[#B9C2A0]/10 rounded-sm pointer-events-none hidden sm:block" />

        {/* Top nav row */}
        <div className="relative flex items-center justify-between px-6 pt-8 lg:px-14 lg:pt-14">
          <PLWordmark tone="espresso" size={40} />
        </div>

        {/* Center composition — abstract seal */}
        <div className="relative mt-8 lg:mt-14 flex flex-col items-center px-6 pb-10 lg:px-14 lg:pb-0">
          <div className="relative">
            <PLSeal size={140} tone="espresso" />
            {/* orbit dots */}
            <svg className="absolute -inset-8" viewBox="0 0 240 240" width="240" height="240">
              <circle cx="120" cy="120" r="110" fill="none" stroke="#B9C2A0" strokeOpacity="0.25" strokeDasharray="1 4" />
              <circle cx="120" cy="10" r="2.5" fill="#B9C2A0" />
              <circle cx="230" cy="120" r="2" fill="#6B7F5E" />
              <circle cx="10" cy="120" r="1.5" fill="#B9C2A0" opacity="0.7" />
            </svg>
          </div>

          <div className="mt-8 lg:mt-10 text-center max-w-[440px]">
            <div className="smallcaps text-[14px] text-[#B9C2A0]/80 mb-3">Legal help for everyone</div>
            <h1 className="font-serif text-[30px] lg:text-[36px] leading-[1.1] tracking-[-0.01em]">
              Know your rights, in your own words.
            </h1>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#E9E6D2]/85 max-w-[380px] mx-auto">
              Ask a question in English, Urdu, or Roman Urdu, and get a plain-language answer backed by the actual law.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="relative w-full lg:w-[45%] lg:h-full bg-[#F7F6F0] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-6 pt-6 lg:px-10 lg:pt-8 text-[14px] text-[#3A3D2E]">
          <button onClick={() => navigate('/chat')} className="text-[#6B7F5E] font-semibold hover:underline underline-offset-2">
            Skip for now — just ask a question →
          </button>
          <span className="hidden sm:inline">
            {mode === 'signin'
              ? <>New here? <button onClick={() => setMode('register')} className="text-[#6B7F5E] font-semibold underline underline-offset-2">Create account</button></>
              : <>Already have an account? <button onClick={() => setMode('signin')} className="text-[#6B7F5E] font-semibold underline underline-offset-2">Sign in</button></>}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-14 lg:py-0">
          <div className="max-w-[420px]">
            <Eyebrow>{mode === 'signin' ? 'Sign in' : 'Create account'}</Eyebrow>
            <h2 className="mt-3 font-serif text-[30px] lg:text-[34px] leading-[1.1] tracking-[-0.01em]">
              {mode === 'signin'
                ? <>Welcome <span className="italic text-[#6B7F5E]">back.</span></>
                : <>Create an <span className="italic text-[#6B7F5E]">account.</span></>}
            </h2>
            <p className="mt-3 text-[16px] text-[#4A5540]">
              {mode === 'signin'
                ? 'Sign in to see your past questions, or skip this and ask something right away.'
                : 'An account just saves your questions for later — you can also skip this and ask something right away.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === 'register' && (
                <Field label="Full name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              )}

              <Field label="Email" icon="mail" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />

              <Field
                label={mode === 'signin' ? 'Password' : 'Create password'}
                icon="lock"
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                right={
                  <button type="button" onClick={() => setShowPw(v => !v)} className="text-[#7A7D68] hover:text-[#3A3D2E]">
                    <Icon name={showPw ? 'eye-off' : 'eye'} size={15} />
                  </button>
                }
              />

              {mode === 'signin' && (
                <div className="flex items-center justify-between text-[14px]">
                  <label className="inline-flex items-center gap-2 text-[#3A3D2E]">
                    <span className="w-4 h-4 rounded-sm border border-[#6B7F5E] bg-[#6B7F5E] inline-flex items-center justify-center">
                      <Icon name="check" size={11} color="#F7F6F0" stroke={3} />
                    </span>
                    Keep me signed in
                  </label>
                  <a className="text-[#6B7F5E] font-semibold hover:underline">Forgot password?</a>
                </div>
              )}

              <Btn type="submit" variant="primary" size="lg" iconRight="arrow-right" className="w-full mt-2">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Btn>

              <div className="sm:hidden text-center text-[14px] pt-1">
                {mode === 'signin'
                  ? <>New here? <button type="button" onClick={() => setMode('register')} className="text-[#6B7F5E] font-semibold underline underline-offset-2">Create account</button></>
                  : <>Already have an account? <button type="button" onClick={() => setMode('signin')} className="text-[#6B7F5E] font-semibold underline underline-offset-2">Sign in</button></>}
              </div>

              {mode === 'signin' && (
                <div className="mt-4 flex items-start gap-2.5 text-[14px] text-[#4A5540] bg-[#F0EFE3] border border-[#DFE0CE] rounded-md p-3">
                  <Icon name="shield-check" size={14} color="#6B7F5E" />
                  <div>Your account is kept private and secure.</div>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="px-6 py-6 lg:px-10 lg:pb-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[14px] text-[#7A7D68]">
          <div>© 2026 PakLaw AI — Karachi · Islamabad</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-[#3A3D2E]">Terms</a>
            <a className="hover:text-[#3A3D2E]">Privacy</a>
            <a className="hover:text-[#3A3D2E]">Corpus</a>
          </div>
        </div>
      </div>
    </div>
  );
}
