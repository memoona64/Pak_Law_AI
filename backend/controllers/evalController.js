const fs = require('fs');
const path = require('path');
const QueryEvent = require('../models/QueryEvent');
const Feedback = require('../models/Feedback');

const summaryPath = path.join(
  __dirname,
  '..',
  'data',
  'evaluation_dashboard_summary.json'
);

// Read once at module load instead of on every request — this file only
// changes when a new benchmark run is committed, not per-request.
function loadEvaluationSummary() {
  try {
    const raw = fs.readFileSync(summaryPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load evaluation summary:', error.message);
    return null;
  }
}

const cachedSummary = loadEvaluationSummary();

/**
 * GET /api/eval/latest
 *
 * Returns the latest offline 150-question benchmark.
 */
exports.getLatestEval = (req, res) => {
  const summary = cachedSummary;

  if (!summary) {
    return res.status(500).json({
      error: 'Evaluation summary is unavailable.'
    });
  }

  return res.status(200).json(summary);
};

/**
 * GET /api/eval/runs
 *
 * Currently exposes the latest benchmark as the only available run.
 */
exports.getEvalRuns = (req, res) => {
  const summary = cachedSummary;

  if (!summary) {
    return res.status(500).json({
      error: 'Evaluation summary is unavailable.'
    });
  }

  return res.status(200).json([summary]);
};

/**
 * Picks the value at percentile p (0-100) from an already-sorted array of
 * numbers using nearest-rank. Returns null for an empty array so callers
 * never have to special-case "no data yet" themselves.
 */
function percentileOf(sortedNumbers, p) {
  if (sortedNumbers.length === 0) return null;
  const index = Math.min(
    sortedNumbers.length - 1,
    Math.ceil((p / 100) * sortedNumbers.length) - 1
  );
  return sortedNumbers[Math.max(index, 0)];
}

/**
 * Turns a list of per-query latencies (ms) into p50/p95/mean. Returns all
 * nulls for an empty list rather than dividing by zero.
 */
function summarizeLatency(latencies) {
  if (latencies.length === 0) {
    return { p50: null, p95: null, mean: null };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const mean = latencies.reduce((sum, value) => sum + value, 0) / latencies.length;
  return {
    p50: percentileOf(sorted, 50),
    p95: percentileOf(sorted, 95),
    mean: Math.round(mean),
  };
}

/**
 * Counts how many events fall under each value of one field, e.g.
 * countBy(events, 'language') -> { en: 12, ur: 3, roman_ur: 5 }.
 * Events with a missing/null value for that field are grouped as "unknown".
 */
function countBy(events, field) {
  const counts = {};
  for (const event of events) {
    const value = event[field] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

/**
 * Turns a list of Feedback documents ({ vote: 'up' | 'down' }) into vote
 * counts and a helpful rate. Returns helpfulRate: null when nobody has
 * voted yet, rather than claiming 0% on no data.
 */
function summarizeFeedback(feedbackDocs) {
  const up = feedbackDocs.filter((doc) => doc.vote === 'up').length;
  const down = feedbackDocs.filter((doc) => doc.vote === 'down').length;
  const total = up + down;
  return {
    up,
    down,
    total,
    helpfulRate: total === 0 ? null : Math.round((up / total) * 1000) / 10,
  };
}

/**
 * Parses the ?days= query param into a whole number of days, defaulting to
 * 30 on anything unparseable. NOT "parseInt(...) || 30" - that would treat
 * an explicit ?days=0 the same as a missing/invalid value, since 0 is falsy
 * in JS. Always returns at least 1.
 */
function parseDaysParam(rawValue) {
  const parsed = parseInt(rawValue, 10);
  return Math.max(1, Number.isNaN(parsed) ? 30 : parsed);
}

// Exposed for unit testing (see backend/test/liveEvalMetrics.test.js) - these
// are pure functions with no database access, so they're tested directly.
exports._internal = { percentileOf, summarizeLatency, countBy, summarizeFeedback, parseDaysParam };

/**
 * GET /api/eval/live?days=30
 *
 * Live usage analytics from real /api/chat/ask traffic (see QueryEvent,
 * logged in chatController.js) plus real user feedback (see Feedback model).
 * This is NOT an accuracy metric like the offline benchmark above - real
 * queries have no known-correct answer to check retrieval against, so this
 * reports volume, latency, error rate, how often the citation verifier
 * blocked an answer, and the feedback helpful-rate instead.
 */
exports.getLiveEval = async (req, res, next) => {
  try {
    const days = parseDaysParam(req.query.days);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [events, feedbackDocs] = await Promise.all([
      QueryEvent.find({ createdAt: { $gte: since } }).lean(),
      Feedback.find({ timestamp: { $gte: since } }).lean(),
    ]);

    const errorCount = events.filter((event) => event.error).length;
    const verifierBlockedCount = events.filter((event) => event.verifierBlocked).length;
    const successfulLatencies = events
      .filter((event) => !event.error)
      .map((event) => event.latencyMs);

    return res.status(200).json({
      windowDays: days,
      totalQueries: events.length,
      errors: {
        count: errorCount,
        rate: events.length === 0 ? null : Math.round((errorCount / events.length) * 1000) / 10,
      },
      verifierBlocked: {
        count: verifierBlockedCount,
        rate: events.length === 0 ? null : Math.round((verifierBlockedCount / events.length) * 1000) / 10,
      },
      latencyMs: summarizeLatency(successfulLatencies),
      byLanguage: countBy(events, 'language'),
      byProvince: countBy(events, 'province'),
      feedback: summarizeFeedback(feedbackDocs),
    });
  } catch (error) {
    next(error);
  }
};
