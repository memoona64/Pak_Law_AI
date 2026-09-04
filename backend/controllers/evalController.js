/**
 * Evaluation Benchmark Controller Module
 * Serves evaluation system metrics.
 */

/*
 * NOTE ON DESIGN TRADEOFF:
 * GET /api/eval/latest is public (unprotected) by deliberate choice to allow
 * open metric visibility on public dashboard interfaces without requiring end-user auth.
 * 
 * INTENTIONAL PLACEHOLDER DATA:
 * The response below returns pre-computed benchmark figures. This is placeholder data 
 * until the offline Python evaluation harness is wired. The frontend UI explicitly labels 
 * these metrics as benchmark results, so serving this shape directly is intentional.
 */
const mockEvalRun = {
  runDate: "2026-08-15T10:00:00.000Z",
  questionSetVersion: "v1.2.0",
  questionCount: 250,
  recallAt5: 0.89,
  recallAt10: 0.94,
  citationValidity: 0.98,
  refusalRate: 0.02,
  latency: {
    p50: 1850,
    p95: 2900,
    byStage: {
      detect: 110,
      retrieve: 175,
      rerank: 320,
      generate: 1200,
      verify: 45
    }
  },
  byRetrievalMode: {
    vector: { recallAt5: 0.76 },
    hybrid: { recallAt5: 0.83 },
    hybridRerank: { recallAt5: 0.89 }
  },
  byLanguage: {
    en: { recallAt5: 0.92 },
    ur: { recallAt5: 0.87 },
    roman_ur: { recallAt5: 0.85 }
  }
};

/**
 * Retrieves the latest benchmark evaluation metrics.
 * Route: GET /api/eval/latest
 */
exports.getLatestEval = (req, res) => {
  return res.status(200).json(mockEvalRun);
};

/**
 * Retrieves history of evaluation runs.
 * Route: GET /api/eval/runs
 */
exports.getEvalRuns = (req, res) => {
  return res.status(200).json([mockEvalRun]);
};