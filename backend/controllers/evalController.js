const fs = require('fs');
const path = require('path');

const summaryPath = path.join(
  __dirname,
  '..',
  'data',
  'evaluation_dashboard_summary.json'
);

function loadEvaluationSummary() {
  try {
    const raw = fs.readFileSync(summaryPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load evaluation summary:', error.message);
    return null;
  }
}

/**
 * GET /api/eval/latest
 *
 * Returns the latest offline 150-question benchmark.
 */
exports.getLatestEval = (req, res) => {
  const summary = loadEvaluationSummary();

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
  const summary = loadEvaluationSummary();

  if (!summary) {
    return res.status(500).json({
      error: 'Evaluation summary is unavailable.'
    });
  }

  return res.status(200).json([summary]);
};
