import React, { useEffect, useMemo, useState } from 'react';
import {
  Icon,
  Chip,
  Btn,
  Eyebrow,
  Card,
  BarChart,
  Gauge,
} from '../components/primitives';
import AppSidebar from '../components/AppSidebar';

const MODE_LABELS = {
  vector_only: 'Vector-only',
  hybrid: 'Hybrid',
  hybrid_reranker: 'Hybrid + Reranker',
};

const MODE_SHORT_LABELS = {
  vector_only: 'Vector',
  hybrid: 'Hybrid',
  hybrid_reranker: 'Hybrid + Reranker',
};

export default function Dashboard() {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluation() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/eval/latest');

        if (!response.ok) {
          throw new Error(`Evaluation API returned ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setEvaluation(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load evaluation results.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, []);

  const bestMode = useMemo(() => {
    if (!evaluation?.modes) return null;

    return Object.entries(evaluation.modes).reduce(
      (best, [key, mode]) => {
        if (!best || mode.recall_at_5 > best.mode.recall_at_5) {
          return { key, mode };
        }
        return best;
      },
      null
    );
  }, [evaluation]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-[16px] text-[#4A5540]">
            Loading evaluation results...
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error || !evaluation) {
    return (
      <DashboardShell>
        <div className="max-w-[760px]">
          <Chip tone="flag" icon="alert-triangle">
            Evaluation unavailable
          </Chip>

          <h1 className="mt-4 font-serif text-[30px] sm:text-[42px] leading-tight">
            We couldn't load the evaluation results.
          </h1>

          <p className="mt-3 text-[16px] text-[#4A5540]">
            {error || 'No evaluation data was returned by the backend.'}
          </p>
        </div>
      </DashboardShell>
    );
  }

  const benchmark = evaluation.benchmark;
  const modes = evaluation.modes;

  const chartData = [
    modes.vector_only.recall_at_5,
    modes.hybrid.recall_at_5,
    modes.hybrid_reranker.recall_at_5,
  ];

  const chartLabels = [
    MODE_SHORT_LABELS.vector_only,
    MODE_SHORT_LABELS.hybrid,
    MODE_SHORT_LABELS.hybrid_reranker,
  ];

  const rerankerGain =
    modes.hybrid_reranker.recall_at_5 - modes.hybrid.recall_at_5;

  return (
    <DashboardShell>
      {/* Header */}
      <div className="px-4 sm:px-10 pt-6 sm:pt-10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b rule-hair">
        <div>
          <Eyebrow>Evaluation</Eyebrow>

          <h1 className="mt-2 font-serif text-[30px] sm:text-[42px] leading-[1.05] tracking-[-0.01em]">
            Is PakLaw AI{' '}
            <span className="italic text-[#6B7F5E]">finding the right law?</span>
          </h1>

          <p className="mt-3 text-[16px] text-[#4A5540] max-w-[620px]">
            We tested the retrieval system against a 150-question legal
            benchmark. These results compare three retrieval strategies and
            show how often the expected Act and Section appeared in the top
            results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="good" icon="check">
            Real benchmark
          </Chip>
        </div>
      </div>

      <div className="flex-1 overflow-auto pl-scroll px-4 sm:px-10 py-6 sm:py-8 space-y-8">
        {/* Benchmark scope */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            label="Questions tested"
            value={benchmark.total_questions}
            sub={`${benchmark.legal_questions} legal + ${benchmark.oos_questions} out-of-scope`}
          />

          <InfoCard
            label="Recall-evaluable"
            value={benchmark.recall_evaluable}
            sub="Legal questions with a matching corpus target"
          />

          <InfoCard
            label="Corpus gaps"
            value={benchmark.corpus_gaps}
            sub="Expected legal targets missing from the retrieval corpus"
            warning
          />

          <InfoCard
            label="Best Recall@5"
            value={`${bestMode.mode.recall_at_5.toFixed(2)}%`}
            sub={MODE_LABELS[bestMode.key]}
          />
        </div>

        {/* Main result */}
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <Eyebrow>Headline result</Eyebrow>

              <div className="font-serif text-[24px] sm:text-[28px] leading-tight mt-1">
                Hybrid + reranker finds the correct law most often
              </div>

              <p className="mt-2 text-[15px] sm:text-[16px] text-[#4A5540] max-w-[680px] leading-relaxed">
                On the 86 questions where the expected Act and Section exist
                in the corpus, the reranked system reached{' '}
                <strong>{modes.hybrid_reranker.recall_at_5.toFixed(2)}%</strong>{' '}
                Recall@5 — an improvement of{' '}
                <strong>{rerankerGain.toFixed(2)} percentage points</strong>{' '}
                over hybrid retrieval.
              </p>
            </div>

            <Gauge
              value={modes.hybrid_reranker.recall_at_5 / 100}
              label={`${modes.hybrid_reranker.recall_at_5.toFixed(1)}%`}
              color="#6B7F5E"
              size={118}
            />
          </div>
        </Card>

        {/* Retrieval comparison */}
        <ChartPanel
          eyebrow="Retrieval comparison"
          title="Recall@5 improves at each stage in this benchmark"
          description="Recall@5 measures whether the expected Act + Section appeared among the five highest-ranked retrieved results."
          chart={
            <BarChart
              width={860}
              height={270}
              data={chartData}
              labels={chartLabels}
              color="#6B7F5E"
            />
          }
          note="Vector-only 45.35% → Hybrid 67.44% → Hybrid + Reranker 75.58%."
        />

        {/* Mode details */}
        <div>
          <Eyebrow>Mode performance</Eyebrow>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-3">
            <ModeCard
              title="Vector-only"
              mode={modes.vector_only}
              description="Semantic similarity search without BM25 keyword fusion."
            />

            <ModeCard
              title="Hybrid"
              mode={modes.hybrid}
              description="BM25 keyword search combined with vector retrieval."
            />

            <ModeCard
              title="Hybrid + Reranker"
              mode={modes.hybrid_reranker}
              description="Hybrid retrieval followed by cross-encoder reranking."
              highlighted
            />
          </div>
        </div>

        {/* Latency */}
        <Card>
          <Eyebrow>Latency</Eyebrow>

          <div className="font-serif text-[22px] leading-tight mt-1">
            Accuracy improved, but reranking is much slower on this machine
          </div>

          <p className="mt-2 text-[15px] text-[#4A5540] max-w-[720px] leading-relaxed">
            The current benchmark ran on a CPU-only 4-core environment. The
            reranker gives the best retrieval accuracy, but its current
            latency is much higher than the retrieval-only modes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            <LatencyCard
              title="Vector-only"
              p50={modes.vector_only.latency_p50_ms}
              p95={modes.vector_only.latency_p95_ms}
            />

            <LatencyCard
              title="Hybrid"
              p50={modes.hybrid.latency_p50_ms}
              p95={modes.hybrid.latency_p95_ms}
            />

            <LatencyCard
              title="Hybrid + Reranker"
              p50={modes.hybrid_reranker.latency_p50_ms}
              p95={modes.hybrid_reranker.latency_p95_ms}
              highlighted
            />
          </div>
        </Card>

        {/* Language breakdown */}
        <BreakdownPanel
          title="Performance by language"
          description="The benchmark contains English, Roman Urdu, and Urdu-script questions."
          breakdownKey="language"
          modes={modes}
        />

        {/* Category breakdown */}
        <BreakdownPanel
          title="Performance by question category"
          description="Recall varies considerably by query style, especially for Roman Urdu and Urdu-script questions."
          breakdownKey="category"
          modes={modes}
        />

        {/* Province breakdown */}
        <BreakdownPanel
          title="Province-sensitive performance"
          description="Province-specific questions are evaluated separately where the benchmark provides province metadata."
          breakdownKey="province"
          modes={modes}
        />

        {/* Methodology */}
        <Card>
          <Eyebrow>How to read these results</Eyebrow>

          <div className="font-serif text-[22px] leading-tight mt-1">
            The benchmark has 150 questions, but Recall is calculated on 86
            corpus-supported legal targets
          </div>

          <div className="mt-4 space-y-3 text-[15px] text-[#4A5540] leading-relaxed max-w-[820px]">
            <p>
              The dataset contains <strong>133 legal questions</strong> and{' '}
              <strong>17 out-of-scope questions</strong>.
            </p>

            <p>
              Of the 133 legal questions, <strong>47</strong> have expected
              Act/Section targets that are not currently present in the
              retrieval corpus. Those cannot fairly be counted as retrieval
              failures, so Recall@5 and Recall@10 use the remaining{' '}
              <strong>86 evaluable questions</strong>.
            </p>

            <p>
              This dashboard therefore reports retrieval accuracy separately
              from refusal behavior and citation validity. Those latter
              metrics require a generation/refusal evaluation and are not
              claimed by this retrieval-only benchmark.
            </p>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

function DashboardShell({ children }) {
  return (
    <div className="flex h-screen w-full bg-[#F7F6F0] overflow-hidden">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 text-[#2A2F22] font-sans">
        {children}
      </div>
    </div>
  );
}

function InfoCard({ label, value, sub, warning = false }) {
  return (
    <Card>
      <Eyebrow>{label}</Eyebrow>

      <div className="mt-2 font-serif text-[28px] sm:text-[34px] leading-none">
        {value}
      </div>

      <p
        className={`mt-2 text-[13px] leading-snug ${
          warning ? 'text-[#B8543A]' : 'text-[#4A5540]'
        }`}
      >
        {sub}
      </p>
    </Card>
  );
}

function ModeCard({ title, mode, description, highlighted = false }) {
  return (
    <Card className={highlighted ? 'border-[#6B7F5E]' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>{title}</Eyebrow>

          <div className="mt-2 font-serif text-[32px] leading-none">
            {mode.recall_at_5.toFixed(2)}%
          </div>

          <div className="mt-1 text-[12px] uppercase tracking-[0.08em] text-[#7A7D68]">
            Recall@5
          </div>
        </div>

        {highlighted && (
          <Chip tone="good" icon="check">
            Best accuracy
          </Chip>
        )}
      </div>

      <p className="mt-4 text-[14px] text-[#4A5540] leading-relaxed">
        {description}
      </p>

      <div className="mt-4 pt-3 border-t rule-hair grid grid-cols-2 gap-3">
        <MetricMini
          label="Recall@10"
          value={`${mode.recall_at_10.toFixed(2)}%`}
        />

        <MetricMini
          label="P50"
          value={formatLatency(mode.latency_p50_ms)}
        />

        <MetricMini
          label="P95"
          value={formatLatency(mode.latency_p95_ms)}
        />

        <MetricMini
          label="Errors"
          value={mode.errors}
        />
      </div>
    </Card>
  );
}

function MetricMini({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.08em] text-[#7A7D68]">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-medium">{value}</div>
    </div>
  );
}

function LatencyCard({ title, p50, p95, highlighted = false }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlighted
          ? 'border-[#6B7F5E] bg-[#F0F1E6]'
          : 'border-[#D7D7C8] bg-[#FAF9F3]'
      }`}
    >
      <div className="font-serif text-[17px]">{title}</div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <MetricMini label="P50" value={formatLatency(p50)} />
        <MetricMini label="P95" value={formatLatency(p95)} />
      </div>
    </div>
  );
}

function BreakdownPanel({ title, description, breakdownKey, modes }) {
  const keys = new Set();

  Object.values(modes).forEach((mode) => {
    const breakdown = mode.breakdowns?.[breakdownKey] || {};

    Object.keys(breakdown).forEach((key) => keys.add(key));
  });

  const rows = Array.from(keys).sort();

  if (!rows.length) return null;

  const evaluatedFor = (row) =>
    modes.vector_only.breakdowns?.[breakdownKey]?.[row]?.evaluated ??
    modes.hybrid.breakdowns?.[breakdownKey]?.[row]?.evaluated ??
    modes.hybrid_reranker.breakdowns?.[breakdownKey]?.[row]?.evaluated ??
    0;

  // Province coverage is real, not a data gap to apologize for — most
  // questions in the benchmark just aren't province-specific, so an
  // "Unknown" row here means "no province applies," not "missing data."
  let unknownNote = null;
  if (breakdownKey === 'province' && rows.includes('Unknown')) {
    const total = rows.reduce((sum, row) => sum + evaluatedFor(row), 0);
    const unknown = evaluatedFor('Unknown');
    unknownNote = `Province metadata is available for ${total - unknown} of these ${total} evaluable questions; the remaining ${unknown} have unknown (not province-specific) province metadata.`;
  }

  return (
    <Card>
      <Eyebrow>{breakdownKey}</Eyebrow>

      <div className="font-serif text-[22px] leading-tight mt-1">
        {title}
      </div>

      <p className="mt-2 text-[15px] text-[#4A5540]">
        {description}
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b rule-hair">
              <th className="py-3 pr-4 text-[11px] uppercase tracking-[0.08em] text-[#7A7D68]">
                Group
              </th>

              <th className="py-3 px-3 text-[11px] uppercase tracking-[0.08em] text-[#7A7D68]">
                Evaluated
              </th>

              <th className="py-3 px-3 text-[11px] uppercase tracking-[0.08em] text-[#7A7D68]">
                Vector R@5
              </th>

              <th className="py-3 px-3 text-[11px] uppercase tracking-[0.08em] text-[#7A7D68]">
                Hybrid R@5
              </th>

              <th className="py-3 px-3 text-[11px] uppercase tracking-[0.08em] text-[#7A7D68]">
                Reranker R@5
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const vector = modes.vector_only.breakdowns?.[breakdownKey]?.[row];
              const hybrid = modes.hybrid.breakdowns?.[breakdownKey]?.[row];
              const reranker =
                modes.hybrid_reranker.breakdowns?.[breakdownKey]?.[row];

              const evaluated = evaluatedFor(row);

              return (
                <tr key={row} className="border-b rule-hair last:border-b-0">
                  <td className="py-3 pr-4 text-[14px]">{row}</td>

                  <td className="py-3 px-3 text-[14px]">{evaluated}</td>

                  <td className="py-3 px-3 text-[14px]">
                    {formatPercent(vector?.recall_at_5)}
                  </td>

                  <td className="py-3 px-3 text-[14px]">
                    {formatPercent(hybrid?.recall_at_5)}
                  </td>

                  <td className="py-3 px-3 text-[14px] font-medium">
                    {formatPercent(reranker?.recall_at_5)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unknownNote && (
        <p className="mt-3 text-[13px] text-[#7A7D68]">{unknownNote}</p>
      )}
    </Card>
  );
}

function ChartPanel({
  eyebrow,
  title,
  description,
  chart,
  note,
  className = '',
}) {
  return (
    <Card className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>

      <div className="font-serif text-[22px] leading-tight mt-1">
        {title}
      </div>

      {description && (
        <p className="mt-2 text-[16px] text-[#4A5540] max-w-[700px]">
          {description}
        </p>
      )}

      <div className="mt-5 overflow-x-auto">{chart}</div>

      {note && (
        <div className="mt-3 text-[14px] italic text-[#4A5540]">
          {note}
        </div>
      )}
    </Card>
  );
}

function formatPercent(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : '—';
}

function formatLatency(ms) {
  if (typeof ms !== 'number') return '—';

  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }

  return `${ms.toFixed(1)}ms`;
}
