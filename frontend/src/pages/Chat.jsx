import React from 'react';
import { Icon, Chip, Btn, Eyebrow } from '../components/primitives';
import { PLSeal } from '../components/seal';

// Chat interface — the hero. Sidebar + central messages with expandable citation pills.
export default function ChatScreen({ density = 'comfortable', sidebar = 'dark' }) {
  const [lang, setLang] = React.useState('en'); // 'en' | 'ur' | 'ru'
  const [expanded, setExpanded] = React.useState({ 'c1': true });
  const [input, setInput] = React.useState('');
  const [recording, setRecording] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const isDense = density === 'compact';

  const chats = [
    { id: 't1', title: 'FIR — Section 302 PPC · Karachi', when: 'Today', pinned: true, active: true },
    { id: 't2', title: 'Rental agreement — Clause 14 review', when: 'Today' },
    { id: 't3', title: 'Khula procedure — Family Court Lhr.', when: 'Yesterday' },
    { id: 't4', title: 'Cheque bounce · NI Act §138 parallel', when: 'Yesterday' },
    { id: 't5', title: 'Contempt petition drafting notes', when: 'Aug 22' },
    { id: 't6', title: 'PECA 2016 · defamation online', when: 'Aug 20' },
    { id: 't7', title: 'Suo Motu — SMBB 184(3) memo', when: 'Aug 18' },
  ];

  // Sample messages — a mix of English, Urdu, Roman Urdu
  const messages = [
    {
      id: 'm1', role: 'user',
      lang: 'ur',
      text: 'اگر کوئی شخص کسی جائیداد پر ناجائز قبضہ کر لے تو مالک کے پاس PPC کی کون سی دفعات کے تحت کارروائی کے اختیارات ہیں؟',
    },
    {
      id: 'a1', role: 'assistant',
      body: (
        <>
          <p>
            Under the <em>Pakistan Penal Code, 1860</em>, the aggrieved owner may proceed on <strong>two parallel tracks</strong>. The primary criminal remedy sits under Chapter XVII — Offences Against Property.
          </p>
          <ol className="mt-3 space-y-1.5 list-decimal pl-5 marker:text-[#8C6D53] marker:font-serif">
            <li><strong>Criminal trespass</strong> — <em>PPC §441</em> and its aggravated form <em>§447</em> (punishable with imprisonment up to three months or fine to five thousand rupees, or both).</li>
            <li><strong>Mischief / dishonest misappropriation</strong> — <em>PPC §425</em> read with <em>§403</em> where the property has been diminished in value.</li>
          </ol>
        </>
      ),
      citations: [
        { id: 'c1', act: 'Pakistan Penal Code, 1860', section: '§441', title: 'Criminal trespass', verbatim: '"Whoever enters into or upon property in the possession of another with intent to commit an offence or to intimidate, insult or annoy any person in possession of such property … is said to commit criminal trespass."', year: '1860', jurisdiction: 'Federal', amendedUpTo: '2016', corpusVersion: 'v3.2' },
          { id: 'c2', act: 'Pakistan Penal Code, 1860', section: '§447', title: 'Punishment for criminal trespass', verbatim: '"Whoever commits criminal trespass shall be punished with imprisonment of either description for a term which may extend to three months, or with fine which may extend to five thousand rupees, or with both."', amendedUpTo: '2016', corpusVersion: 'v3.2' },
      ],
    },
    {
      id: 'm2', role: 'user',
      lang: 'ru',
      text: 'Achha, aur agar qabza karnay wala mukamil ghar par forcefully qabza kar chuka ho — us case mein police FIR register karnay se inkar kar sakti hai?',
    },
    {
      id: 'a2', role: 'assistant',
      body: (
        <>
          <p>
            No — under <em>§154 CrPC</em> the officer in charge is <strong>bound to register</strong> any information disclosing a cognisable offence. Refusal is itself actionable.
          </p>
          <p className="mt-2">
            The complainant's remedies escalate in this order:
          </p>
          <ul className="mt-2 space-y-1 pl-5 list-['—__'] marker:text-[#8C6D53]">
            <li>Written complaint to the SP under <em>§154(3) CrPC</em>.</li>
            <li>Application to the Justice of Peace under <em>§22-A(6) CrPC</em>, Lahore / Karachi jurisdiction.</li>
            <li>Constitutional petition under <em>Art. 199</em> for a writ of mandamus.</li>
          </ul>
        </>
      ),
      citations: [
        { id: 'c5', act: 'Code of Criminal Procedure, 1898', section: '§154', title: 'Information in cognisable cases', verbatim: '"Every information relating to the commission of a cognisable offence, if given orally to an officer in charge of a police-station, shall be reduced to writing …"', amendedUpTo: '2016', corpusVersion: 'v3.2' },
        { id: 'c6', act: 'Code of Criminal Procedure, 1898', section: '§22-A(6)', title: 'Powers of Justice of Peace', verbatim: '"The Justice of Peace shall, on a complaint … issue appropriate directions to the police authorities …"', amendedUpTo: '2016', corpusVersion: 'v3.2' },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F8F5F0] overflow-hidden text-[#2C221E] font-sans">
      {/* SIDEBAR */}
      <ChatSidebar dark={sidebar === 'dark'} chats={chats} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* MAIN CHAT COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-14 border-b rule-hair flex items-center justify-between px-6 bg-[#F8F5F0]/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="w-8 h-8 rounded-md hover:bg-[#EFEAE1] flex items-center justify-center">
              <Icon name="panel-left" size={16} />
            </button>
            <div className="flex items-baseline gap-3">
              <div className="font-serif text-[17px] leading-none">FIR — Section 302 PPC · Karachi</div>
              <Chip tone="taupe" icon="scale">Criminal · Sindh</Chip>
              <Chip tone="bronze" icon="book-open-text">PPC · CrPC · PLD</Chip>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" icon="share-2">Share</Btn>
            <Btn variant="ghost" size="sm" icon="download">Save</Btn>
            <div className="w-px h-6 bg-[#D3C5BD] mx-1" />
            <button className="w-8 h-8 rounded-md hover:bg-[#EFEAE1] flex items-center justify-center"><Icon name="more-horizontal" size={16}/></button>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-auto pl-scroll">
          <div className="max-w-[840px] mx-auto px-8 py-8 space-y-8">
            {/* Matter header */}
            <div className="text-center pb-4 border-b rule-hair">
              <Eyebrow>Matter · Opened 29 Aug 2026</Eyebrow>
              <h1 className="mt-2 font-serif text-[28px] leading-tight tracking-tight">On the register of an FIR for forcible dispossession</h1>
            </div>

            {messages.map(m => (
              m.role === 'user'
                ? <UserMessage key={m.id} m={m} lang={m.lang} />
                : <AssistantMessage key={m.id} m={m} expanded={expanded} setExpanded={setExpanded} />
            ))}

            {/* Assistant is typing indicator */}
            <div className="flex items-center gap-3 text-[14px] text-[#7D7268]">
              <div className="w-8 h-8 rounded-full bg-[#2C221E] flex items-center justify-center">
                <div className="w-3.5 h-3.5"><PLSeal size={22} tone="espresso" ring={false}/></div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6D53] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6D53] animate-pulse" style={{ animationDelay: '150ms' }}/>
                <span className="w-1.5 h-1.5 rounded-full bg-[#8C6D53] animate-pulse" style={{ animationDelay: '300ms' }}/>
                <span className="ml-2 italic">Looking through the law …</span>
              </div>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="border-t rule-hair bg-[#F8F5F0]">
          <div className="max-w-[840px] mx-auto px-8 py-5">
            {/* Language toggle + quick actions */}
            <div className="flex items-center justify-between mb-3">
              <LangToggle lang={lang} setLang={setLang} />
              <div className="flex items-center gap-1.5">
                <QuickChip icon="file-plus-2">Attach document</QuickChip>
                <QuickChip icon="library-big">Corpus filter</QuickChip>
              </div>
            </div>

            <div className="rounded-xl border border-[#D3C5BD] bg-white/70 focus-within:border-[#8C6D53] transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={2}
                placeholder={{
                  en: 'Ask about a statute, judgment, or draft… e.g. "Compare §302 vs §316 PPC for qatl-i-amd."',
                  ur: '…کوئی سوال پوچھیں، مثلاً "302 اور 316 دفعات میں فرق کیا ہے؟"',
                  ru: 'Sawal poochein… e.g. "Section 302 aur 316 PPC mein farq kya hai?"'
                }[lang]}
                className={`w-full resize-none bg-transparent p-4 text-[16px] text-[#2C221E] placeholder-[#7D7268] focus:outline-none ${lang === 'ur' ? 'text-right font-nastaliq text-[17px]' : ''}`}
                dir={lang === 'ur' ? 'rtl' : 'ltr'}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <ComposerIcon name="paperclip" tip="Attach" />
                  <ComposerIcon name="file-text" tip="Insert citation" />
                  <ComposerIcon name="quote" tip="Verbatim mode" />
                  <div className="w-px h-4 bg-[#D3C5BD] mx-1" />
                  <button
                    onClick={() => setRecording(r => !r)}
                    className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[14px] font-medium transition-colors ${recording ? 'bg-[#B8543A] text-white' : 'text-[#4A3C34] hover:bg-[#EFEAE1]'}`}
                  >
                    <Icon name={recording ? 'square' : 'mic'} size={13} stroke={2}/>
                    {recording ? <><span>0:12</span><span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" /></> : 'Voice'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-[#7D7268] font-mono-jb">Ctrl + ↵</span>
                  <Btn variant="primary" size="sm" iconRight="arrow-up">Ask</Btn>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[14px] text-[#7D7268]">
              <div className="flex items-center gap-1.5"><Icon name="shield-check" size={12} color="#8C6D53" />Avoid sharing your CNIC or phone number in questions. Answers cite primary sources.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Sidebar ----
function ChatSidebar({ dark = true, chats = [], open = false, onClose }) {
  const bg = dark ? 'bg-[#2C221E] text-[#F8F5F0]' : 'bg-[#EFEAE1] text-[#2C221E]';
  const rowActive = dark ? 'bg-[#3A2E28] border-[#8C6D53]' : 'bg-white border-[#8C6D53]';
  const rowHover = dark ? 'hover:bg-[#3A2E28]/70' : 'hover:bg-white';
  const sub = dark ? 'text-[#7D7268]' : 'text-[#6E5540]';
  const rule = dark ? 'border-[#F8F5F0]/8' : 'rule-hair';

  return (
    <aside className={`${open ? 'flex' : 'hidden'} md:flex w-72 md:w-[280px] shrink-0 flex-col fixed md:static inset-y-0 left-0 z-40 ${bg}`}>
      {/* Brand */}
      <div className={`h-14 flex items-center gap-2.5 px-4 border-b ${rule}`}>
        <PLSeal size={30} tone={dark ? 'espresso' : 'cream'} />
        <div className="leading-none">
          <div className="font-serif text-[15.5px]">PakLaw <span className={`italic ${dark ? 'text-[#D6BFA8]' : 'text-[#8C6D53]'}`}>AI</span></div>
          <div className={`smallcaps text-[14px] mt-1 ${sub}`}>Digital Chambers</div>
        </div>
        <button onClick={onClose} className={`ml-auto w-7 h-7 rounded-md flex items-center justify-center ${dark ? 'hover:bg-[#3A2E28]' : 'hover:bg-white'}`}>
          <Icon name="chevrons-left" size={14} />
        </button>
      </div>

      {/* New chat */}
      <div className="p-3">
        <button className={`w-full h-10 rounded-md flex items-center justify-center gap-2 text-[14px] font-semibold ${dark ? 'bg-[#8C6D53] text-[#F8F5F0] hover:bg-[#6E5540]' : 'bg-[#2C221E] text-[#F8F5F0] hover:bg-[#3A2E28]'}`}>
          <Icon name="feather" size={14} stroke={2} /> New question
        </button>
      </div>

      {/* Primary nav */}
      <nav className="px-2 pb-2 space-y-0.5">
        {[
          { icon: 'messages-square', label: 'Chats', badge: '128' },
          { icon: 'workflow', label: 'Guided Flows', badge: '6' },
          { icon: 'file-search', label: 'Documents' },
          { icon: 'gauge', label: 'Evaluation' },
          { icon: 'library', label: 'The law' },
        ].map((it, i) => (
          <button key={i} className={`w-full h-9 px-2.5 rounded-md flex items-center gap-2.5 text-[14px] ${rowHover}`}>
            <Icon name={it.icon} size={14} />
            <span className="flex-1 text-left">{it.label}</span>
            {it.badge && <span className={`text-[14px] font-mono-jb ${sub}`}>{it.badge}</span>}
          </button>
        ))}
      </nav>

      <div className={`mx-4 border-t my-2 ${rule}`} />

      {/* Chat history */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <div className={`smallcaps text-[14px] ${sub}`}>Recent Matters</div>
        <button className={`text-[14px] ${sub} hover:underline`}>View all</button>
      </div>
      <div className="flex-1 overflow-auto pl-scroll px-2 space-y-0.5">
        {chats.map(c => (
          <button key={c.id} className={`w-full text-left px-2.5 py-2 rounded-md border ${c.active ? rowActive : 'border-transparent'} ${!c.active ? rowHover : ''}`}>
            <div className="flex items-start gap-2">
              {c.pinned && <Icon name="pin" size={11} color={dark ? '#D6BFA8' : '#8C6D53'} className="mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] leading-tight truncate">{c.title}</div>
                <div className={`text-[14px] mt-0.5 ${sub}`}>{c.when}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* User strip */}
      <div className={`p-3 border-t ${rule} flex items-center gap-2.5`}>
        <div className="w-8 h-8 rounded-full bg-[#8C6D53] flex items-center justify-center font-serif text-[14px] text-[#F8F5F0]">AR</div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-[14px] font-medium truncate">Aisha Rahman</div>
        </div>
        <button className={`w-7 h-7 rounded-md flex items-center justify-center ${dark ? 'hover:bg-[#3A2E28]' : 'hover:bg-white'}`}>
          <Icon name="settings" size={14} />
        </button>
      </div>
    </aside>
  );
}

// ---- Messages ----
function UserMessage({ m, lang }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="flex items-center justify-end gap-2 mb-1.5">
          <Chip tone="outline" className="!text-[14px] !py-0.5">
            {lang === 'ur' ? 'اردو' : lang === 'ru' ? 'Roman Urdu' : 'English'}
          </Chip>
          <span className="text-[14px] text-[#7D7268]">You · 11:04</span>
        </div>
        <div className={`bg-[#2C221E] text-[#F8F5F0] px-5 py-3.5 rounded-2xl rounded-tr-md text-[16px] leading-[1.6] ${lang === 'ur' ? 'font-nastaliq text-[18px] text-right' : ''}`}
             dir={lang === 'ur' ? 'rtl' : 'ltr'}>
          {m.text}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ m, expanded, setExpanded }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 shrink-0 rounded-full bg-[#2C221E] flex items-center justify-center">
        <PLSeal size={30} tone="espresso" ring={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="font-serif text-[14px]">PakLaw Counsel</div>
          <Chip tone="ok" icon="shield-check">Grounded · {m.citations.length} sources</Chip>
          <span className="text-[14px] text-[#7D7268]">11:04 · 1.8s</span>
        </div>

        {/* Answer body — editorial serif quotes, editorial spacing */}
        <div className="bg-[#F8F5F0] border border-[#E4DDD1] rounded-2xl rounded-tl-md px-5 py-4 text-[16px] leading-[1.7] text-[#2C221E]">
          <div className="prose prose-sm max-w-none [&_em]:text-[#6E5540] [&_em]:not-italic [&_em]:font-serif [&_strong]:text-[#2C221E]">
            {m.body}
          </div>

          {/* Citations pill row */}
          <div className="mt-4 pt-4 border-t rule-hair">
            <div className="flex items-center justify-between mb-2.5">
              <Eyebrow>Citations · Verbatim from primary sources</Eyebrow>
              <button className="text-[14px] text-[#8C6D53] font-medium hover:underline flex items-center gap-1">
                <Icon name="external-link" size={11} /> Open all in Corpus
              </button>
            </div>
            <div className="space-y-2">
              {m.citations.map(c => (
                <CitationPill key={c.id} c={c}
                              expanded={!!expanded[c.id]}
                              onToggle={() => setExpanded(e => ({ ...e, [c.id]: !e[c.id] }))} />
              ))}
            </div>
          </div>

          {/* Answer footer actions */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <IconBtn name="copy" tip="Copy" />
              <IconBtn name="thumbs-up" tip="Helpful" />
              <IconBtn name="thumbs-down" tip="Not helpful" />
              <IconBtn name="rotate-cw" tip="Regenerate" />
              <IconBtn name="volume-2" tip="Read aloud" />
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="cream" size="sm" icon="workflow">Turn into flow</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CitationPill({ c, expanded, onToggle }) {
  return (
    <div className={`rounded-lg border transition-colors ${expanded ? 'bg-white border-[#8C6D53]/40' : 'bg-[#F1EBE0]/60 border-[#E4DDD1] hover:border-[#8C6D53]/40'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left">
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center border bg-[#EFE4D2] border-[#D6BFA8] text-[#6E5540]">
          <Icon name="book-marked" size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-[14px] text-[#2C221E]">{c.act}</span>
            <span className="text-[14px] font-mono-jb text-[#8C6D53]">{c.section}</span>
          </div>
          <div className="text-[14px] text-[#6E5540] truncate mt-0.5">{c.title}</div>
        </div>
        <div className="flex items-center gap-3 text-[14px] text-[#7D7268]">
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} />
        </div>
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1">
          <div className="border-l-2 border-[#8C6D53] pl-4 py-1">
            <div className="smallcaps text-[14px] text-[#8C6D53] mb-1">Verbatim excerpt</div>
            <p className="font-serif text-[16px] leading-[1.65] text-[#3A2E28] italic">{c.verbatim}</p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[14px]">
            <div className="flex items-center gap-3 text-[#6E5540]">
              <span className="inline-flex items-center gap-1"><Icon name="landmark" size={11}/> Federal statute</span>
              <span className="inline-flex items-center gap-1"><Icon name="calendar" size={11}/> Last amended {c.amendedUpTo}</span>
              <span className="inline-flex items-center gap-1"><Icon name="file-check-2" size={11}/> Verified corpus {c.corpusVersion}</span>
            </div>
            <div className="flex items-center gap-1">
              <Btn variant="ghost" size="sm" icon="external-link">Open source</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Bits ----
function LangToggle({ lang, setLang }) {
  const opts = [
    { id: 'en', label: 'English', hint: 'EN' },
    { id: 'ur', label: 'اردو', hint: 'UR' },
    { id: 'ru', label: 'Roman Urdu', hint: 'RU' },
  ];
  return (
    <div className="inline-flex items-center bg-white/70 border border-[#D3C5BD] rounded-full p-1 h-9">
      <span className="pl-2 pr-1 text-[#7D7268]"><Icon name="languages" size={13} /></span>
      {opts.map(o => (
        <button key={o.id} onClick={() => setLang(o.id)}
                className={`h-7 px-3 rounded-full text-[14px] font-medium transition-colors ${lang === o.id ? 'bg-[#2C221E] text-[#F8F5F0]' : 'text-[#4A3C34] hover:text-[#2C221E]'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function QuickChip({ icon, children }) {
  return (
    <button className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border border-[#D3C5BD] bg-white/60 text-[14px] text-[#4A3C34] hover:bg-white hover:border-[#8C6D53]/50">
      <Icon name={icon} size={12} /> {children}
    </button>
  );
}

function ComposerIcon({ name, tip }) {
  return (
    <button title={tip} className="w-8 h-8 rounded-md flex items-center justify-center text-[#6E5540] hover:bg-[#EFEAE1] hover:text-[#2C221E]">
      <Icon name={name} size={14} />
    </button>
  );
}

function IconBtn({ name, tip }) {
  return (
    <button title={tip} className="w-7 h-7 rounded-md flex items-center justify-center text-[#8A7A6D] hover:bg-[#EFEAE1] hover:text-[#2C221E]">
      <Icon name={name} size={13} />
    </button>
  );
}
