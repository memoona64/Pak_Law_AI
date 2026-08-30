import React from 'react';
import { Btn, Field, Icon, Eyebrow } from '../components/primitives';
import { PLSeal, PLWordmark } from '../components/seal';

// Sign in / create account — split brand + form layout.
export default function Login() {
  const [mode, setMode] = React.useState('signin'); // 'signin' | 'register'
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [name, setName] = React.useState('');

  return (
    <div className="h-screen w-full bg-[#F8F5F0] flex overflow-hidden font-sans text-[#2C221E]">
      {/* LEFT — brand composition */}
      <div className="relative w-[55%] h-full bg-[#2C221E] text-[#F8F5F0] overflow-hidden">
        {/* Warm noise + gradient */}
        <div className="absolute inset-0 opacity-90"
             style={{ background: 'radial-gradient(120% 80% at 20% 20%, #4A3C34 0%, #2C221E 55%, #1B1310 100%)' }} />
        <div className="absolute inset-0 paper-grain opacity-40 mix-blend-overlay" />

        {/* Concentric guilloché rings */}
        <svg className="absolute -right-40 -top-40" width="900" height="900" viewBox="0 0 900 900">
          {Array.from({ length: 26 }).map((_, i) => (
            <circle key={i} cx="450" cy="450" r={80 + i * 14}
                    fill="none" stroke="#D6BFA8" strokeOpacity={0.06 + (i % 3) * 0.03} strokeWidth="0.7"
                    strokeDasharray={i % 4 === 0 ? '1 3' : ''} />
          ))}
        </svg>

        {/* Frame corners */}
        <div className="absolute inset-10 border border-[#D6BFA8]/20 rounded-sm pointer-events-none" />
        <div className="absolute inset-[46px] border border-[#D6BFA8]/10 rounded-sm pointer-events-none" />

        {/* Top nav row */}
        <div className="relative flex items-center justify-between px-14 pt-14">
          <PLWordmark tone="espresso" size={44} />
          <div className="smallcaps text-[14px] text-[#D6BFA8]/80">Est. Karachi · MMXXV</div>
        </div>

        {/* Center composition — abstract seal */}
        <div className="relative mt-14 flex flex-col items-center px-14">
          <div className="relative">
            <PLSeal size={180} tone="espresso" />
            {/* orbit dots */}
            <svg className="absolute -inset-8" viewBox="0 0 240 240" width="240" height="240">
              <circle cx="120" cy="120" r="110" fill="none" stroke="#D6BFA8" strokeOpacity="0.25" strokeDasharray="1 4" />
              <circle cx="120" cy="10" r="2.5" fill="#D6BFA8" />
              <circle cx="230" cy="120" r="2" fill="#8C6D53" />
              <circle cx="10" cy="120" r="1.5" fill="#D6BFA8" opacity="0.7" />
            </svg>
          </div>

          <div className="mt-10 text-center max-w-[440px]">
            <div className="smallcaps text-[14px] text-[#D6BFA8]/80 mb-3">Volume I · The Digital Chambers</div>
            <h1 className="font-serif text-[38px] leading-[1.08] tracking-[-0.01em]">
              <span className="italic">“Counsel,</span> at the <br /> speed of thought.<span className="italic">”</span>
            </h1>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#E8DDCE]/85 max-w-[380px] mx-auto">
              A companion that helps ordinary people understand their legal rights, in English, Urdu, or Roman Urdu.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="relative w-[45%] h-full bg-[#F8F5F0] flex flex-col">
        <div className="flex justify-end px-10 pt-8 text-[14px] text-[#4A3C34]">
          {mode === 'signin'
            ? <span>New to PakLaw? <button onClick={() => setMode('register')} className="text-[#8C6D53] font-semibold underline underline-offset-2">Create account</button></span>
            : <span>Already a member? <button onClick={() => setMode('signin')} className="text-[#8C6D53] font-semibold underline underline-offset-2">Sign in</button></span>}
        </div>

        <div className="flex-1 flex flex-col justify-center px-14">
          <div className="max-w-[420px]">
            <Eyebrow>{mode === 'signin' ? 'Sign in' : 'Create account'}</Eyebrow>
            <h2 className="mt-3 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">
              {mode === 'signin'
                ? <>Welcome <span className="italic text-[#8C6D53]">back.</span></>
                : <>Create an <span className="italic text-[#8C6D53]">account.</span></>}
            </h2>
            <p className="mt-3 text-[16px] text-[#6E5540]">
              {mode === 'signin'
                ? 'Sign in to see your past questions and saved answers.'
                : 'Create an account to save your questions and continue where you left off.'}
            </p>

            <div className="mt-8 space-y-4">
              {mode === 'register' && (
                <Field label="Full name" placeholder="Aisha Rahman" value={name} onChange={e => setName(e.target.value)} />
              )}

              <Field label="Email" icon="mail" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />

              <Field
                label={mode === 'signin' ? 'Password' : 'Create password'}
                icon="lock"
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                right={
                  <button onClick={() => setShowPw(v => !v)} className="text-[#7D7268] hover:text-[#4A3C34]">
                    <Icon name={showPw ? 'eye-off' : 'eye'} size={15} />
                  </button>
                }
              />

              {mode === 'signin' && (
                <div className="flex items-center justify-between text-[14px]">
                  <label className="inline-flex items-center gap-2 text-[#4A3C34]">
                    <span className="w-4 h-4 rounded-sm border border-[#8C6D53] bg-[#8C6D53] inline-flex items-center justify-center">
                      <Icon name="check" size={11} color="#F8F5F0" stroke={3} />
                    </span>
                    Keep me signed in
                  </label>
                  <a className="text-[#8C6D53] font-semibold hover:underline">Forgot password?</a>
                </div>
              )}

              <Btn variant="primary" size="lg" iconRight="arrow-right" className="w-full mt-2">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Btn>

              {mode === 'signin' && (
                <div className="mt-4 flex items-start gap-2.5 text-[14px] text-[#6E5540] bg-[#EFEAE1] border border-[#E4DDD1] rounded-md p-3">
                  <Icon name="shield-check" size={14} color="#8C6D53" />
                  <div>Sessions encrypted end-to-end.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-10 pb-6 flex items-center justify-between text-[14px] text-[#7D7268]">
          <div>© 2026 PakLaw AI (Pvt.) Ltd. — Karachi · Islamabad</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-[#4A3C34]">Terms</a>
            <a className="hover:text-[#4A3C34]">Privacy</a>
            <a className="hover:text-[#4A3C34]">Corpus</a>
          </div>
        </div>
      </div>
    </div>
  );
}
