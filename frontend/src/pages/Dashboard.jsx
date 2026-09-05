import React from 'react';
import { Icon, Chip, Btn, Eyebrow, Card, BarChart, Gauge } from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

// Evaluation dashboard — our real metrics, with obvious placeholder values until a real eval run exists.
export default function Dashboard() {
  return (
    <div className="flex h-screen w-full bg-[#F8F5F0] overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 text-[#2C221E] font-sans">
      {/* Header */}
      <div className="px-10 pt-10 pb-6 flex items-end justify-between border-b rule-hair">
        <div>
          <Eyebrow>Evaluation Dashboard</Eyebrow>
          <h1 className="mt-2 font-serif text-[42px] leading-[1.02] tracking-[-0.01em]">
            The evidence, on the <span className="italic text-[#8C6D53]">record.</span>
          </h1>
          <p className="mt-3 text-[16px] text-[#6E5540] max-w-[560px]">
            Retrieval, citation validity, and refusal handling — measured against our evaluation set of 120+ questions across the statutes in our corpus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="outline" icon="filter">Statute · All</Btn>
          <Btn variant="primary" icon="play">Run evaluation</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-auto pl-scroll px-10 py-8 space-y-8">
        {/* Placeholder banner — every value below is invented until a real run exists */}
        <div className="flex items-center gap-2.5">
          <Chip tone="flag" icon="alert-triangle">Placeholder data</Chip>
          <span className="text-[14px] text-[#6E5540]">Every number on this page is a placeholder — none of it comes from a real evaluation run yet.</span>
        </div>

        {/* 4 metric cards — our real metrics */}
        <div className="grid grid-cols-4 gap-5">
          <MetricCard
            icon="search" eyebrow="Recall@5" kind="gauge" value={0.72} gaugeColor="#8C6D53"
            sub="Was the correct section in the top 5 retrieved results?"
          />
          <MetricCard
            icon="book-marked" eyebrow="Citation Validity" kind="gauge" value={0.90} gaugeColor="#5A7A4E"
            sub="% of cited Act + Section that actually exist in the corpus"
          />
          <MetricCard
            icon="shield-alert" eyebrow="Refusal Rate" kind="gauge" value={0.65} gaugeColor="#C08A2E"
            sub="% of out-of-scope questions correctly refused"
          />
          <MetricCard
            icon="zap" eyebrow="Latency" kind="latency" latency={{ p50: 480, p95: 1150 }}
            sub="End-to-end, current pipeline"
          />
        </div>

        {/* Headline result — the largest panel on the page */}
        <ChartPanel
          eyebrow="Headline result"
          title="Recall@5 by retrieval mode"
          description="Vector-only retrieval was missing the correct section too often. Adding BM25 with reciprocal rank fusion, then a reranker on top, is what fixed it — this chart is the evidence."
          chart={
            <BarChart
              width={860} height={260}
              data={[58, 74, 82]}
              labels={['Vector only', 'Hybrid (BM25+RRF)', 'Hybrid + reranker']}
              color="#8C6D53"
            />
          }
          note="Placeholder values — will be replaced once the real evaluation run finishes."
        />

        <div className="grid grid-cols-12 gap-5">
          <ChartPanel
            className="col-span-6"
            eyebrow="By language"
            title="Recall@5 — English, Urdu, Roman Urdu"
            description="Reported separately for each language, not blended into a single average."
            chart={
              <BarChart
                width={480} height={220}
                data={[81, 63, 55]}
                labels={['English', 'Urdu (script)', 'Roman Urdu']}
                color="#8C6D53"
              />
            }
            note="Placeholder values — will be replaced once the real evaluation run finishes."
          />

          <ChartPanel
            className="col-span-6"
            eyebrow="Latency"
            title="Latency by pipeline stage (P50)"
            description="Milliseconds spent in each stage of the retrieval-and-answer pipeline."
            chart={
              <BarChart
                width={480} height={220}
                data={[45, 210, 95, 340]}
                labels={['Embed', 'Retrieve', 'Rerank', 'Generate']}
                color="#6E5540"
              />
            }
            note="Placeholder values — will be replaced once the real evaluation run finishes."
          />
        </div>
      </div>
      </div>
    </div>
  );
}

// ---- Metric card — either a gauge (percentage metrics) or a p50/p95 pair (latency) ----
function MetricCard({ icon, eyebrow, kind, value, gaugeColor, latency, sub }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <Eyebrow>{eyebrow}</Eyebrow>
        <div className="w-8 h-8 rounded-md bg-[#EFE4D2] border border-[#D6BFA8] flex items-center justify-center">
          <Icon name={icon} size={14} color="#6E5540" />
        </div>
      </div>

      {kind === 'gauge' ? (
        <div className="mt-4 flex items-center justify-center">
          <Gauge value={value} label={`${Math.round(value * 100)}%`} color={gaugeColor} size={104} />
        </div>
      ) : (
        <div className="mt-4 space-y-1">
          <div className="flex items-baseline gap-1.5">
            <div className="font-serif text-[34px] leading-none tracking-tight">{latency.p50}</div>
            <div className="text-[14px] text-[#7D7268] font-medium">ms · P50</div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="font-serif text-[22px] leading-none tracking-tight text-[#6E5540]">{latency.p95}</div>
            <div className="text-[14px] text-[#7D7268] font-medium">ms · P95</div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t rule-hair">
        <div className="text-[14px] text-[#6E5540] leading-snug">{sub}</div>
        <div className="mt-1 text-[14px] italic text-[#B8543A]">Placeholder — pending real eval run</div>
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
      {description && <p className="mt-2 text-[16px] text-[#6E5540] max-w-[640px]">{description}</p>}
      <div className="mt-5 overflow-x-auto">{chart}</div>
      {note && <div className="mt-3 text-[14px] italic text-[#B8543A]">{note}</div>}
    </Card>
  );
}
