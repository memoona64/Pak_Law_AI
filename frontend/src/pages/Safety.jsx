import { Link } from 'react-router-dom';

// Shown instead of a legal answer when someone describes an arrest in progress,
// domestic violence, a live threat, self-harm, or a child at risk. Deliberately
// looks nothing like the rest of the app, so the mode change is unmistakable.
//
// This page can be reached via Roman Urdu / Urdu-script crisis phrases (see
// the keyword list in Chat.jsx), so the fixed text here is shown in all three
// languages at once rather than depending on a language toggle that doesn't
// exist elsewhere in the app — in an actual emergency, nothing should depend
// on the visitor first finding a language switch.
//
// DO NOT INVENT PHONE NUMBERS OR ORGANISATION NAMES. Every entry below is the
// literal placeholder "VERIFY BEFORE SHIPPING" on purpose - a human must look
// up and confirm each one against an official source before this screen ever
// reaches a real user. A wrong or dead number shown to someone in crisis is
// worse than showing nothing.
const HELPLINES = [
  { en: 'Free legal aid', ur: 'مفت قانونی امداد', roman: 'Muft qanooni imdad' },
  {
    en: 'Bar association legal aid committee',
    ur: 'بار ایسوسی ایشن قانونی امداد کمیٹی',
    roman: 'Bar association qanooni imdad committee',
  },
  { en: 'Government legal helpline', ur: 'سرکاری قانونی ہیلپ لائن', roman: 'Sarkari qanooni helpline' },
  {
    en: "Women's crisis helpline",
    ur: 'خواتین کے لیے ہنگامی ہیلپ لائن',
    roman: 'Khawateen ke liye emergency helpline',
  },
  { en: 'Child protection', ur: 'بچوں کا تحفظ', roman: 'Bachon ka tahafuz' },
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
        <h1 dir="rtl" className="mt-2 text-[26px] sm:text-[30px] font-bold leading-[1.4]" style={{ color: '#B8543A' }}>
          یہ اب قانونی سوال نہیں رہا۔
        </h1>
        <h1 className="mt-2 text-[20px] sm:text-[22px] font-bold leading-[1.4]" style={{ color: '#B8543A' }}>
          Yeh ab qanooni sawal nahi raha.
        </h1>

        <p className="mt-5 text-[20px] leading-[1.6]">
          You described something that sounds like an emergency — this app only answers legal questions and cannot help you right now. Please contact one of the numbers below.
        </p>
        <p dir="rtl" className="mt-3 text-[18px] leading-[1.8]">
          آپ نے کچھ ایسا بیان کیا ہے جو ایک ہنگامی صورتحال لگتی ہے — یہ ایپ صرف قانونی سوالات کے جواب دیتی ہے اور اس وقت آپ کی مدد نہیں کر سکتی۔ براہ کرم نیچے دیے گئے نمبروں میں سے کسی ایک پر رابطہ کریں۔
        </p>
        <p className="mt-3 text-[16px] leading-[1.6] text-gray-700">
          Aap ne kuch aisa bataya hai jo ek emergency lagta hai — yeh app sirf qanooni sawalon ke jawab deti hai aur is waqt aapki madad nahi kar sakti. Baraye meherbani neeche diye gaye numbers mein se kisi ek par rabta karein.
        </p>

        <div className="mt-10 flex flex-col gap-6">
          {HELPLINES.map((h) => (
            <div key={h.en} className="border-2 pb-6" style={{ borderColor: '#B8543A' }}>
              <div className="text-[18px] font-semibold">{h.en}</div>
              <div dir="rtl" className="text-[16px] font-semibold mt-1">{h.ur}</div>
              <div className="text-[15px] text-gray-600 mt-0.5">{h.roman}</div>
              <div className="mt-1 text-[16px] text-gray-600">{PLACEHOLDER}</div>
              {/* Deliberately NOT a tel: link: the number is a placeholder,
                  not a real one. A dead/wrong "Call" button on the one
                  screen that must not break is worse than no button at
                  all — this stays inert until a real number replaces
                  PLACEHOLDER above. */}
              <div
                aria-label={`${h.en}: phone number not yet available`}
                className="mt-3 block w-full py-5 text-center text-[16px] font-semibold text-white opacity-70 cursor-not-allowed"
                style={{ backgroundColor: '#B8543A' }}
              >
                Number pending verification — not yet available
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center space-y-1">
          <Link to="/chat" className="block text-[14px] text-gray-500 underline">
            Back to chat
          </Link>
          <Link to="/chat" dir="rtl" className="block text-[14px] text-gray-500 underline">
            چیٹ پر واپس جائیں
          </Link>
          <Link to="/chat" className="block text-[14px] text-gray-500 underline">
            Chat par wapas jayein
          </Link>
        </div>
      </div>
    </div>
  );
}
