// PakLaw P·L monogram seal — used as brand mark across screens.

import React from 'react';

function PLSeal({ size = 56, tone = 'espresso', ring = true }) {
  // tones: espresso (dark bg / cream ink), cream (cream bg / espresso ink), bronze
  const bg = tone === 'cream' ? '#F8F5F0' : tone === 'bronze' ? '#8C6D53' : '#2C221E';
  const ink = tone === 'cream' ? '#2C221E' : '#F8F5F0';
  const accent = tone === 'cream' ? '#8C6D53' : '#D6BFA8';
  const id = React.useId();
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="block">
      <defs>
        <radialGradient id={`g-${id}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={tone === 'espresso' ? '#4A3C34' : bg} />
          <stop offset="100%" stopColor={bg} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#g-${id})`} stroke={ink} strokeOpacity="0.15" />
      {ring && (
        <>
          <circle cx="60" cy="60" r="52" fill="none" stroke={ink} strokeOpacity="0.35" strokeWidth="0.6" />
          <circle cx="60" cy="60" r="49" fill="none" stroke={ink} strokeOpacity="0.18" strokeWidth="0.4" strokeDasharray="1 2" />
        </>
      )}
      {/* Monogram: serif P and L interlaced, with a slender central hairline */}
      <g fontFamily="Playfair Display, Georgia, serif" fontWeight="600">
        <text x="34" y="80" fontSize="70" fill={ink} fontStyle="italic">P</text>
        <text x="63" y="80" fontSize="70" fill={accent} fontStyle="italic">L</text>
      </g>
      {/* Base rule + tiny stars */}
      <g stroke={ink} strokeOpacity="0.55">
        <line x1="40" y1="92" x2="80" y2="92" strokeWidth="0.6" />
      </g>
      <g fill={ink} fillOpacity="0.55">
        <circle cx="36" cy="92" r="0.9" />
        <circle cx="84" cy="92" r="0.9" />
      </g>
      {/* Top tiny crescent nod */}
      <path d="M56 20 a6 6 0 1 0 6 6 a5 5 0 1 1 -6 -6 z" fill={accent} opacity="0.85" />
    </svg>
  );
}

// Wordmark row (seal + serif type)
function PLWordmark({ size = 40, tone = 'espresso', className = '' }) {
  const ink = tone === 'espresso' ? '#F8F5F0' : '#2C221E';
  const sub = tone === 'espresso' ? '#7D7268' : '#8C6D53';
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <PLSeal size={size} tone={tone} />
      <div className="leading-none">
        <div className="font-serif text-[20px] tracking-[0.01em]" style={{ color: ink }}>
          PakLaw <span style={{ color: sub, fontStyle: 'italic', fontWeight: 500 }}>AI</span>
        </div>
        <div className="smallcaps text-[9.5px] mt-1" style={{ color: sub }}>Counsel · Corpus · Clarity</div>
      </div>
    </div>
  );
}

export { PLSeal, PLWordmark };
