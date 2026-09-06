import React from 'react';
import { Icon, Chip, Btn, Eyebrow, Card, BarChart, Gauge } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

// Evaluation dashboard — plain-language metric names first (technical terms
// as small secondary tags), with obvious placeholder values until a real
// evaluation run exists.
export default function Dashboard() {
  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
      {/* Header */}
      <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b rule-hair">
        <div>
          <Eyebrow>Evaluation</Eyebrow>
          <h1 className="mt-2 font-serif text-[30px] sm:text-[42px] leading-[1.05] tracking-[-0.01em]">
            Is PakLaw AI <span className="italic text-[#6B7F5E]">getting it right?</span>
          </h1>
          <p className="mt-3 text-[16px] text-[#4A5540] max-w-[560px]">
            We test it against 120+ real questions and check the answers by hand. This page shows how it's doing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary" icon="play">Run a test</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8 space-y-8">
        {/* Placeholder banner — every value below is invented until a real run exists */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="flag" icon="alert-triangle">Example numbers</Chip>
          <span className="text-[14px] text-[#4A5540]">These aren't real results yet — they'll be replaced once we run a full test.</span>
        </div>

        {/* 2 metric cards — the two our corpus work most directly affects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <MetricCard
            icon="search" eyebrow="Finds the right law" tag="Recall@5"
            tagHint="The technical name for this: out of every 5 results the search engine returns, how often the correct one was in there."
            value={0.72} gaugeColor="#6B7F5E"
            sub="Out of every 5 answers, how often the correct section was actually included."
          />
          <MetricCard
            icon="book-marked" eyebrow="Citations are real" tag="Citation validity"
            tagHint="The technical name for this: the percentage of cited Act + Section pairs that were checked and actually exist."
            value={0.90} gaugeColor="#5C8A52"
            sub="How often a cited law actually exists — checked against our corpus, not made up."
          />
        </div>

        {/* Headline result — the one chart we keep */}
        <ChartPanel
          eyebrow="Why this matters"
          title="Search got better as we improved it"
          description="Searching by meaning alone missed the right law too often. Adding keyword search, then a final double-check step, fixed most of that — this chart shows the improvement at each stage."
          chart={
            <BarChart
              width={860} height={260}
              data={[58, 74, 82]}
              labels={['Meaning search only', '+ Keyword search', '+ Double-check (now)']}
              color="#6B7F5E"
            />
          }
          note="Example values — will be replaced once the real test run finishes."
        />
      </div>
      </div>
    </div>
  );
}

// ---- Metric card — a plain-language label first, the technical term as a small tag ----
function MetricCard({ icon, eyebrow, tag, tagHint, value, gaugeColor, sub }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="font-serif text-[16px] leading-tight">{eyebrow}</div>
        <div className="w-8 h-8 rounded-md bg-[#EDE9D5] border border-[#B9C2A0] flex items-center justify-center shrink-0">
          <Icon name={icon} size={14} color="#4A5540" />
        </div>
      </div>
      {tag && (
        <div className="mt-1 inline-flex items-center gap-1" title={tagHint}>
          <Eyebrow>{tag}</Eyebrow>
          {tagHint && <Icon name="info" size={11} color="#7A7D68" />}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center">
        <Gauge value={value} label={`${Math.round(value * 100)}%`} color={gaugeColor} size={104} />
      </div>

      <div className="mt-4 pt-3 border-t rule-hair">
        <div className="text-[14px] text-[#4A5540] leading-snug">{sub}</div>
        <div className="mt-1 text-[14px] italic text-[#B8543A]">Example — not a real result yet</div>
      </div>
    </Card>
  );
}

// ---- Chart panel — eyebrow, title, description, chart, and a placeholder note ----
function ChartPanel({ eyebrow, title, description, chart, note, className = '' }) {
  return (
    <Card className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className="font-serif text-[22px] leading-tight mt-1">{title}</div>
      {description && <p className="mt-2 text-[16px] text-[#4A5540] max-w-[640px]">{description}</p>}
      <div className="mt-5 overflow-x-auto">{chart}</div>
      {note && <div className="mt-3 text-[14px] italic text-[#B8543A]">{note}</div>}
    </Card>
  );
}
