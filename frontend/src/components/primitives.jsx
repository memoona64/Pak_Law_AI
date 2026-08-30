// Shared UI primitives, icon helper, mini charts

import { useMemo } from 'react';
import {
  Search, BookMarked, ShieldCheck, Zap, Gauge as GaugeIcon, Check, Mail, Lock, Eye, EyeOff,
  ArrowRight, ArrowUp, Landmark, KeyRound, Filter, Play, Plus, ChevronLeft, ChevronRight,
  ChevronDown, Download, ExternalLink, TrendingUp, CheckCircle2, AlertTriangle, XCircle,
  Sparkles, Sparkle, Flame, ListChecks, Clock, Scale, Siren, Home, HeartCrack, Banknote,
  ScrollText, ShieldAlert, Menu, MoreVertical, Paperclip, Mic, Signal, Wifi, BatteryFull,
  Briefcase, ChevronsLeft, Feather, MessagesSquare, Workflow, FileSearch, Library, Pin,
  Settings, PanelLeft, BookOpenText, Share2, MoreHorizontal, ChevronUp, Calendar,
  FileCheck2, Copy, ThumbsUp, ThumbsDown, RotateCw, Volume2, Languages, FilePlus2,
  LibraryBig, FileText, Quote, FileUp, FolderOpen, Link2, Clipboard, Minus, Printer,
  AlertOctagon,
} from 'lucide-react';

// Design's kebab-case icon names -> lucide-react's PascalCase components.
const ICONS = {
  search: Search,
  'book-marked': BookMarked,
  'shield-check': ShieldCheck,
  zap: Zap,
  gauge: GaugeIcon,
  check: Check,
  mail: Mail,
  lock: Lock,
  eye: Eye,
  'eye-off': EyeOff,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  landmark: Landmark,
  'key-round': KeyRound,
  filter: Filter,
  play: Play,
  plus: Plus,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  download: Download,
  'external-link': ExternalLink,
  'trending-up': TrendingUp,
  'check-circle-2': CheckCircle2,
  'alert-triangle': AlertTriangle,
  'x-circle': XCircle,
  sparkles: Sparkles,
  sparkle: Sparkle,
  flame: Flame,
  'list-checks': ListChecks,
  clock: Clock,
  scale: Scale,
  siren: Siren,
  home: Home,
  'heart-crack': HeartCrack,
  banknote: Banknote,
  'scroll-text': ScrollText,
  'shield-alert': ShieldAlert,
  menu: Menu,
  'more-vertical': MoreVertical,
  paperclip: Paperclip,
  mic: Mic,
  signal: Signal,
  wifi: Wifi,
  'battery-full': BatteryFull,
  briefcase: Briefcase,
  'chevrons-left': ChevronsLeft,
  feather: Feather,
  'messages-square': MessagesSquare,
  workflow: Workflow,
  'file-search': FileSearch,
  library: Library,
  pin: Pin,
  settings: Settings,
  'panel-left': PanelLeft,
  'book-open-text': BookOpenText,
  'share-2': Share2,
  'more-horizontal': MoreHorizontal,
  'chevron-up': ChevronUp,
  calendar: Calendar,
  'file-check-2': FileCheck2,
  copy: Copy,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  'rotate-cw': RotateCw,
  'volume-2': Volume2,
  languages: Languages,
  'file-plus-2': FilePlus2,
  'library-big': LibraryBig,
  'file-text': FileText,
  quote: Quote,
  'file-up': FileUp,
  'folder-open': FolderOpen,
  'link-2': Link2,
  clipboard: Clipboard,
  minus: Minus,
  printer: Printer,
  'alert-octagon': AlertOctagon,
};

// --- Icon helper: renders a lucide icon by name at given size / stroke / color.
function Icon({ name, size = 16, stroke = 1.75, className = '', color = 'currentColor' }) {
  const LucideIcon = ICONS[name];
  if (!LucideIcon) {
    console.warn(`Icon: unknown icon name "${name}"`);
    // In dev, a blank space here is invisible and ships unnoticed (see: 24 missing
    // Chat.jsx icons). A red-outlined box makes a missing mapping impossible to miss.
    if (import.meta.env.DEV) {
      return (
        <span
          title={`Icon: unknown icon name "${name}"`}
          style={{ width: size, height: size, outline: '1px solid red', display: 'inline-block' }}
          className={className}
        />
      );
    }
    return null;
  }
  return <LucideIcon size={size} strokeWidth={stroke} color={color} className={className} />;
}

// --- Section eyebrow (small-caps label above titles)
function Eyebrow({ children, className = '' }) {
  return (
    <div className={`smallcaps text-[10.5px] text-[color:var(--pl-bronze-ink)] ${className}`}>
      {children}
    </div>
  );
}

// --- Little pill / tag component in the warm palette
function Chip({ children, tone = 'taupe', icon, className = '' }) {
  const tones = {
    taupe: 'bg-[#EFEAE1] text-[#4A3C34] border-[#D3C5BD]',
    bronze: 'bg-[#F1E4D6] text-[#6E5540] border-[#C6A88B]',
    espresso: 'bg-[#2C221E] text-[#F8F5F0] border-[#2C221E]',
    flag: 'bg-[#F3DDD5] text-[#8A3B24] border-[#D9A797]',
    ok: 'bg-[#E4EADD] text-[#40573A] border-[#A8B99B]',
    outline: 'bg-transparent text-[#4A3C34] border-[#D3C5BD]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full border text-[11px] font-medium ${tones[tone]} ${className}`}>
      {icon && <Icon name={icon} size={11} stroke={2} />}
      {children}
    </span>
  );
}

// --- Button
function Btn({ children, variant = 'primary', icon, iconRight, size = 'md', className = '', ...rest }) {
  const sz = size === 'sm'
    ? 'h-8 px-3 text-[12px]'
    : size === 'lg'
      ? 'h-11 px-5 text-[14px]'
      : 'h-9 px-4 text-[13px]';
  const v = {
    primary: 'bg-[#2C221E] text-[#F8F5F0] hover:bg-[#3A2E28] border border-[#2C221E]',
    bronze:  'bg-[#8C6D53] text-[#F8F5F0] hover:bg-[#6E5540] border border-[#8C6D53]',
    ghost:   'bg-transparent text-[#2C221E] hover:bg-[#EFEAE1] border border-transparent',
    outline: 'bg-transparent text-[#2C221E] hover:bg-[#EFEAE1] border border-[#2C221E]/25',
    cream:   'bg-[#F8F5F0] text-[#2C221E] hover:bg-white border border-[#D3C5BD]',
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[0.01em] transition-colors focus-bronze ${sz} ${v} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 16 : 14} stroke={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 16 : 14} stroke={2} />}
    </button>
  );
}

// --- Text input
function Field({ label, hint, icon, type = 'text', placeholder, value, onChange, right, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-[12px] font-medium text-[#4A3C34] mb-1.5">{label}</div>}
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-[#7D7268]"><Icon name={icon} size={15} /></span>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-10 rounded-md bg-white/70 border border-[#D3C5BD] text-[13px] text-[#2C221E] placeholder-[#7D7268] focus-bronze focus:bg-white transition-colors ${icon ? 'pl-9' : 'pl-3'} ${right ? 'pr-10' : 'pr-3'}`}
        />
        {right && <span className="absolute right-3">{right}</span>}
      </div>
      {hint && <div className="text-[11px] text-[#7D7268] mt-1">{hint}</div>}
    </label>
  );
}

// --- Card wrapper (cream + hair rule)
function Card({ children, className = '', tone = 'cream', padding = 'p-5' }) {
  const tones = {
    cream: 'bg-[#F8F5F0] border-[#E4DDD1]',
    white: 'bg-white border-[#E4DDD1]',
    espresso: 'bg-[#2C221E] border-[#2C221E] text-[#F8F5F0]',
    subtle: 'bg-[#EFEAE1] border-[#D3C5BD]/60',
  };
  return (
    <div className={`rounded-lg border ${tones[tone]} ${padding} ${className}`}>
      {children}
    </div>
  );
}

// --- KPI stat block
function Stat({ eyebrow, value, delta, deltaTone = 'ok', suffix, hint }) {
  const tone = { ok: 'text-[#5A7A4E]', flag: 'text-[#B8543A]', taupe: 'text-[#7D7268]' }[deltaTone];
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-serif text-[38px] leading-none text-[#2C221E]">{value}</div>
        {suffix && <div className="text-[12px] text-[#7D7268] font-medium">{suffix}</div>}
      </div>
      {(delta || hint) && (
        <div className="mt-1 flex items-center gap-2 text-[11.5px]">
          {delta && <span className={`${tone} font-medium`}>{delta}</span>}
          {hint && <span className="text-[#7D7268]">{hint}</span>}
        </div>
      )}
    </div>
  );
}

// --- Sparkline (SVG, tiny)
function Sparkline({ data = [], width = 140, height = 36, color = '#8C6D53', fill = 'rgba(140,109,83,0.14)' }) {
  const { d, area } = useMemo(() => {
    if (!data.length) return { d: '', area: '' };
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${d} L${width},${height} L0,${height} Z`;
    return { d, area };
  }, [data, width, height]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={area} fill={fill} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- Bar chart (simple)
function BarChart({ data, labels, width = 480, height = 180, color = '#8C6D53' }) {
  const max = Math.max(...data);
  const bw = width / data.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {[0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1="0" x2={width} y1={height - height * t + 4} y2={height - height * t + 4} stroke="rgba(44,34,30,0.08)" strokeDasharray="2 3" />
      ))}
      {data.map((v, i) => {
        const h = (v / max) * (height - 20);
        return (
          <g key={i}>
            <rect x={i * bw + 6} y={height - h - 18} width={bw - 12} height={h} rx="2" fill={color} opacity={0.85} />
            <text x={i * bw + bw / 2} y={height - 4} textAnchor="middle" fontSize="10" fill="#7D7268" fontFamily="Inter">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// --- Line chart with two series
function LineChart({ series, width = 520, height = 200, xLabels = [] }) {
  const all = series.flatMap(s => s.data);
  const max = Math.max(...all) * 1.1;
  const min = Math.min(...all) * 0.85;
  const range = max - min || 1;
  const n = series[0].data.length;
  const step = width / (n - 1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1="0" x2={width} y1={height - height * t} y2={height - height * t} stroke="rgba(44,34,30,0.06)" />
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 20) - 10]);
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        return (
          <g key={si}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={i === n - 1 ? 3 : 0} fill={s.color} />
            ))}
          </g>
        );
      })}
      {xLabels.map((lb, i) => (
        <text key={i} x={i * step} y={height - 2} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="9.5" fill="#7D7268" fontFamily="Inter">{lb}</text>
      ))}
    </svg>
  );
}

// --- Donut / gauge
function Gauge({ value = 0.72, size = 120, color = '#8C6D53', label = '', sub = '' }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * value;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(44,34,30,0.10)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
                strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="absolute text-center">
        <div className="font-serif text-[22px] leading-none text-[#2C221E]">{label}</div>
        {sub && <div className="text-[10px] text-[#7D7268] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export { Icon, Eyebrow, Chip, Btn, Field, Card, Stat, Sparkline, BarChart, LineChart, Gauge };
