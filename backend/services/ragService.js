/**
 * RAG Service Layer Module
 * Sends requests to the Python FastAPI service and converts its responses
 * into the shape the rest of Express expects.
 *
 * KNOWN GAPS ON THE PYTHON SIDE (real, not naming issues):
 * - /rag/query has no "language" input. We accept it here and deliberately do
 *   NOT forward it, because FastAPI would ignore it. Multilingual generation
 *   is not wired server-side yet.
 * - There is no safety-trigger detection yet, so `safetyTriggered` below is an
 *   honest placeholder (always false).
 * - There is no citation-verification step on the Python side yet either, so
 *   `verified` is also an honest placeholder (always false) rather than a
 *   faked true.
 * - Citation metadata key names differ between corpus files: statutes (PPC,
 *   CrPC) use "section"/"section_number"/"section_title"; the Constitution
 *   uses "Article"/"Article_number"/"article_title"; MFLO and the Sindh
 *   Rented Premises Ordinance instead store the heading under a plain
 *   "title" key. _mapChunkToCitation() below tries each known name.
 * - FastAPI does not time the generation step, so timings.generate stays null.
 */

const axios = require('axios');

/**
 * Maps one FastAPI chunk to the frontend-facing citation shape.
 */
function _mapChunkToCitation(chunk) {
  const meta = chunk.metadata || {};

  const act = meta.act || null;
  const title = meta.section_title || meta.article_title || meta.title || null;
  const section = meta.section_number || meta.section || meta.Article_number || meta.Article || null;
  const amendedUpTo = meta.amendment_note || null;
  const corpusVersion = meta.corpus_version || meta.corpusVersion || null;

  return {
    id: chunk.id,
    act: act || 'Unknown Act',
    shortCode: String(meta.short_code || '').toLowerCase(),
    section: section ? String(section) : '',
    title: title || '',
    verbatim: chunk.text || '',
    jurisdiction: meta.jurisdiction || (meta.province ? 'province' : 'federal'),
    province: meta.province || null,
    amendedUpTo,     // null if genuinely absent — not faked
    corpusVersion,   // null if genuinely absent — not faked
  };
}

/**
 * Converts FastAPI's timing keys into the stage names the dashboard expects.
 */
function _mapTimings(fastapiTimings = {}) {
  const retrieve =
    (fastapiTimings.bm25_ms || 0) + (fastapiTimings.vector_ms || 0) + (fastapiTimings.rrf_ms || 0);
  return {
    detect: fastapiTimings.normalise_ms ?? null,
    retrieve: retrieve || null,
    rerank: fastapiTimings.rerank_ms ?? null,
    generate: null,                          // not timed by FastAPI yet — real gap, not hidden
    verify: null,                             // no citation-verification step exists yet
    total: fastapiTimings.total_ms ?? null,
  };
}

/**
 * Queries the legal retrieval engine.
 *
 * @async
 * @param {Object} params - Query parameters
 * @param {string} params.question - Legal query
 * @param {string} params.language - Query language ("en" | "ur" | "roman_ur") — accepted but not forwarded, see note above
 * @param {string} [params.province] - Optional territorial jurisdiction
 * @returns {Promise<Object>} Standardized RAG payload matching API contract
 */
exports.query = async ({ question, language, province }) => {
  if (process.env.USE_MOCK === 'true') {
    return {
      answer: "Under Section 154 of the Code of Criminal Procedure, the officer in charge of a police station is bound to record any information disclosing a cognisable offence.",
      citations: [
        {
          id: "crpc-154-0001",
          act: "Code of Criminal Procedure, 1898",
          shortCode: "crpc",
          section: "154",
          title: "Information in cognisable cases",
          verbatim: "Every information relating to the commission of a cognisable offence, if given orally to an officer in charge of a police-station, shall be reduced to writing.",
          jurisdiction: "federal",
          province: null,
          amendedUpTo: "2026-06-10",
          corpusVersion: "v1"
        }
      ],
      verified: true,
      safetyTriggered: false,
      timings: { detect: 120, retrieve: 180, rerank: 340, generate: 1420, verify: 40, total: 2100 }
    };
  }

  try {
    const pythonUrl = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/rag/query`;
    const response = await axios.post(pythonUrl, {
      query: question,
      province: province || null,
      // The cross-encoder reranker runs on CPU and took 3-4 minutes per
      // query in testing (acceptable for a one-time model download, not for
      // an interactive chat reply). Retrieval quality without it was already
      // good in testing, so it stays off until a faster reranker or GPU
      // inference is available.
      use_reranker: false,
      normalize: true,
    });

    const data = response.data;

    return {
      answer: data.answer,
      citations: (data.chunks || []).map(_mapChunkToCitation),
      verified: false,          // no citation-verification step exists on the Python side yet
      safetyTriggered: false,   // no safety-trigger detection exists yet
      timings: _mapTimings(data.timings),
    };
  } catch (error) {
    if (error.response) {
      console.error(`[RAG Service Error] FastAPI ${error.response.status}:`, error.response.data);
      throw new Error(`Retrieval service returned an error (${error.response.status}).`);
    }
    console.error(`[RAG Service Error] ${error.message}`);
    throw new Error('Python FastAPI retrieval service is unreachable or returned an error.');
  }
};