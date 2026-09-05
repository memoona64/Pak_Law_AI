import { Link } from 'react-router-dom';
import { Icon, Chip, Eyebrow } from '../components/primitives';
import { AnalysisView } from './Documents';

// Analysis result for one document — reuses the exact Analysis view from
// Documents.jsx. The :id param isn't used to select a different document yet;
// this always shows the same sample analysis.
export default function DocumentDetail() {
  return (
    <div className="h-screen w-full bg-[#F8F5F0] text-[#2C221E] font-sans overflow-hidden flex flex-col">
      <div className="px-10 pt-10 pb-6 border-b rule-hair flex items-end justify-between">
        <div>
          <Link to="/documents" className="inline-flex items-center gap-1.5 text-[14px] text-[#8C6D53] font-medium hover:underline mb-3">
            <Icon name="chevron-left" size={14} /> All documents
          </Link>
          <Eyebrow>Document Analysis</Eyebrow>
          <h1 className="mt-2 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">Analysis result</h1>
        </div>
        <Chip tone="flag" icon="alert-triangle">Sample data</Chip>
      </div>

      <AnalysisView />
    </div>
  );
}
