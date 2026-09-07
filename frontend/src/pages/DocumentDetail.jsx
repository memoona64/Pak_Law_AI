import { Link } from 'react-router-dom';
import { Icon, Chip, Eyebrow } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';
import { AnalysisView } from './Documents';

// Analysis result for one document — reuses the exact Analysis view from
// Documents.jsx. The :id param isn't used to select a different document yet;
// this always shows the same sample analysis.
export default function DocumentDetail() {
  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
        <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 border-b rule-hair flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <Link to="/documents" className="inline-flex items-center gap-1.5 text-[14px] text-[#6B7F5E] font-medium hover:underline mb-3">
              <Icon name="chevron-left" size={14} /> All documents
            </Link>
            <Eyebrow>Document Analysis</Eyebrow>
            <h1 className="mt-2 font-serif text-[28px] sm:text-[36px] leading-[1.08] tracking-[-0.01em]">Analysis result</h1>
          </div>
          <Chip tone="flag" icon="alert-triangle" className="self-start">Sample data</Chip>
        </div>

        <AnalysisView />
      </div>
    </div>
  );
}
