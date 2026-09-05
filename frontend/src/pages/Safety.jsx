import { Link } from 'react-router-dom';

// Shown instead of a legal answer when someone describes an arrest in progress,
// domestic violence, a live threat, self-harm, or a child at risk. Deliberately
// looks nothing like the rest of the app, so the mode change is unmistakable.
//
// DO NOT INVENT PHONE NUMBERS OR ORGANISATION NAMES. Every entry below is the
// literal placeholder "VERIFY BEFORE SHIPPING" on purpose - a human must look
// up and confirm each one against an official source before this screen ever
// reaches a real user. A wrong or dead number shown to someone in crisis is
// worse than showing nothing.
const HELPLINES = [
  { category: 'Free legal aid' },
  { category: "Bar association legal aid committee" },
  { category: 'Government legal helpline' },
  { category: "Women's crisis helpline" },
  { category: 'Child protection' },
];

const PLACEHOLDER = 'VERIFY BEFORE SHIPPING';

export default function Safety() {
  return (
    <div
      className="min-h-screen w-full bg-white text-black px-6 py-12 sm:px-10"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif' }}
    >
      <div className="mx-auto max-w-[680px]">
        <h1 className="text-[34px] sm:text-[40px] font-bold leading-[1.15]" style={{ color: '#B8543A' }}>
          This isn't a legal question anymore.
        </h1>

        <p className="mt-5 text-[20px] leading-[1.6]">
          You described something that sounds like an emergency — this app only answers legal questions and cannot help you right now. Please contact one of the numbers below.
        </p>

        <div className="mt-10 flex flex-col gap-6">
          {HELPLINES.map((h) => (
            <div key={h.category} className="border-2 pb-6" style={{ borderColor: '#B8543A' }}>
              <div className="text-[18px] font-semibold">{h.category}</div>
              <div className="mt-1 text-[16px] text-gray-600">{PLACEHOLDER}</div>
              <a
                href={`tel:${PLACEHOLDER}`}
                className="mt-3 block w-full py-5 text-center text-[26px] sm:text-[28px] font-bold text-white"
                style={{ backgroundColor: '#B8543A' }}
              >
                {PLACEHOLDER}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link to="/chat" className="text-[14px] text-gray-500 underline">
            Back to chat
          </Link>
        </div>
      </div>
    </div>
  );
}
