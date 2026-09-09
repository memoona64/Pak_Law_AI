// PakLaw AI brand mark ΓÇö the real logo (public/logo.png, public/logo-icon.png),
// used across screens. logo-icon.png is a tight crop of just the emblem
// (scales, book, pen, crescent) for small avatar-style uses; logo.png is the
// full lockup with the "PakLaw AI" wordmark baked in, for larger brand spots.
// Both have their own black background by design, which is why every current
// usage sits on a dark surface ΓÇö check that before reusing this on a light one.

function PLSeal({ size = 56, ring = true, className = '' }) {
  return (
    <div
      className={`inline-block shrink-0 rounded-full overflow-hidden ${ring ? 'ring-1 ring-inset ring-white/15' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/logo-icon.png" alt="PakLaw AI" width={size} height={size} className="w-full h-full object-cover" />
    </div>
  );
}

// Wordmark row (icon + real HTML text). logo.png's own baked-in "PakLaw AI"
// text is only legible at large sizes ΓÇö at the small sizes this is normally
// used (e.g. a 28-40px sidebar header), scaling the whole lockup image down
// just turns the text into an illegible smudge, so the icon crop is paired
// with crisp text instead, same as the layout this replaced.
function PLWordmark({ size = 40, tone = 'espresso', className = '' }) {
  const ink = tone === 'espresso' ? '#F7F6F0' : '#2A2F22';
  const sub = tone === 'espresso' ? '#7A7D68' : '#6B7F5E';
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <PLSeal size={size} />
      <div className="leading-none">
        <div className="font-serif tracking-[0.01em]" style={{ color: ink, fontSize: size * 0.5 }}>
          PakLaw <span style={{ color: sub, fontStyle: 'italic', fontWeight: 500 }}>AI</span>
        </div>
      </div>
    </div>
  );
}

export { PLSeal, PLWordmark };
