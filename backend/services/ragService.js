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
 *   honest placeholder (always false). Do NOT change it to a hardcoded true —
 *   that would present an unbuilt safety feature as working.
 * - Citation metadata key names differ between corpus files: statutes (PPC,
 *   CrPC) use "section"/"section_number"/"section_title"; the Constitution
 *   uses "Article"/"Article_number"/"article_title" (lowercase "a" on the
 *   title key specifically — confirmed from real corpus samples).
 *   _mapChunkToCitation() below uses the confirmed real key names and logs a
 *   warning when a field is genuinely absent, rather than guessing or faking
 *   a value.
 * - amendedUpTo maps to the corpus's real "amendment_note" field, which
 *   exists on every chunk but is empty (null) in every sampled chunk so far —
 *   this is a data-completeness gap, not a missing feature.
 * - corpusVersion has no equivalent field anywhere in the corpus yet.
 *
 * Citation verification DOES now exist in FastAPI. `verified` below is a real
 * value from citation_verifier.py, not a placeholder.
 */

const axios = require('axios');
const FormData = require('form-data');

// Analysis is many AI calls, so it legitimately takes minutes.
const ANALYZE_TIMEOUT_MS = 300000;

/**
 * Maps one FastAPI chunk to the frontend-facing citation shape.
 * Uses confirmed real corpus metadata keys (see file header for the
 * statute-vs-Constitution key differences).
 */
function _mapChunkToCitation(chunk) {
  const meta = chunk.metadata || {};

  // Confirmed real keys from actual corpus samples (PPC, CrPC, Constitution):
  // act, short_code, section/section_number (statutes) OR Article/Article_number
  // (Constitution), section_title (statutes) OR article_title (Constitution,
  // lowercase "a" -- NOT "Article_title"), jurisdiction, province,
  // amendment_note (usually null but the field is real), source_status.
  // MFLO and the Sindh Rented Premises Ordinance instead store the heading
  // under a plain "title" key -- kept as a fallback below.
  // corpusVersion has no corpus equivalent at all -- stays null until added upstream.
  const act = meta.act || null;
  const title = meta.section_title || meta.article_title || meta.title || null;
  const section = meta.section_number || meta.section || meta.Article_number || meta.Article || null;
  const amendedUpTo = meta.amendment_note || null; // field exists but is empty for every sampled chunk so far
  const corpusVersion = meta.corpus_version || meta.corpusVersion || null; // no equivalent found in corpus yet

  const missing = [
    ['act', act], ['title', title], ['amendedUpTo', amendedUpTo], ['corpusVersion', corpusVersion],
  ].filter(([, val]) => !val).map(([name]) => name);

  if (missing.length) {
    console.warn(`[RAG Service] citation ${chunk.id} missing fields: ${missing.join(', ')}`);
  }

  return {
    id: chunk.id,
    act: act || 'Unknown Act',
    shortCode: String(meta.short_code || '').toLowerCase(),
    section: section ? String(section) : '',
    title: title || '',
    verbatim: chunk.text || '',
    jurisdiction: meta.jurisdiction || (meta.province ? 'province' : 'federal'), // real field now used directly
    province: meta.province || null,
    amendedUpTo,     // null if genuinely absent — not faked
    corpusVersion,   // null if genuinely absent — not faked
  };
}

/**
 * Converts FastAPI's timing keys into the stage names the dashboard expects.
 * FastAPI does not time the generation call, so "generate" stays null.
 */
function _mapTimings(fastapiTimings = {}) {
  const retrieve =
    (fastapiTimings.bm25_ms || 0) + (fastapiTimings.vector_ms || 0) + (fastapiTimings.rrf_ms || 0);
  return {
    detect: fastapiTimings.normalise_ms ?? null,
    retrieve: retrieve || null,
    rerank: fastapiTimings.rerank_ms ?? null,
    generate: null,                          // not timed by FastAPI yet — real gap, not hidden
    verify: fastapiTimings.verify_ms ?? null, // citation verification IS timed now
    total: fastapiTimings.total_ms ?? null,
  };
}

/**
 * Asks a legal question.
 * @param {string} params.question - mapped to FastAPI's "query"
 * @param {string} params.language - accepted but NOT forwarded, see note above
 * @param {string} [params.province]
 */
exports.query = async ({ question, language, province }) => {
  if (process.env.USE_MOCK === 'true') {
    return {
      answer: "Under Section 154 of the Code of Criminal Procedure, the officer in charge of a police station is bound to record any information disclosing a cognisable offence.",
      citations: [{
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
      }],
      verified: true,
      verifierBlocked: false,
      unsupportedClaims: [],
      safetyTriggered: false,
      timings: { detect: 120, retrieve: 180, rerank: 340, generate: 1420, verify: 40, total: 2100 }
    };
  }

  try {
    const pythonUrl = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/rag/query`;

    // FastAPI expects { query, province, use_reranker, normalize }.
    const response = await axios.post(pythonUrl, {
      query: question,
      province: province || null,
      use_reranker: true,
      normalize: true,
    });

    const data = response.data;

    return {
      answer: data.answer,
      citations: (data.chunks || []).map(_mapChunkToCitation),
      verified: data.citations_verified === true,
      // True when the answer was WITHHELD because it cited law we never retrieved.
      // The sources are still returned — the UI must still show them.
      verifierBlocked: data.verifier_blocked === true,
      unsupportedClaims: data.unsupported_claims || [],
      safetyTriggered: false, // not implemented in FastAPI yet — honest placeholder
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

/**
 * Sends an uploaded PDF to FastAPI for masking, clause analysis and summarising.
 * Returns the result already mapped into our Document-model shape.
 */
exports.analyzeDocument = async (fileBuffer, filename, province) => {
  const form = new FormData();
  form.append('file', fileBuffer, filename);
  if (province) form.append('province', province);
  // use_reranker is left off: reranking runs per clause and adds ~15s each.

  try {
    const pythonUrl = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/rag/analyze-document`;
    const response = await axios.post(pythonUrl, form, {
      headers: form.getHeaders(),
      timeout: ANALYZE_TIMEOUT_MS,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const data = response.data;

    return {
      summary: data.summary,
      clauses: (data.flagged_clauses || []).map(c => ({
        clauseNumber: c.clause_number,
        text: c.text,
        status: c.risk,                  // FastAPI calls it "risk"; we store "status"
        note: c.note,
        citationsVerified: c.citations_verified === true,
        // FastAPI returns only a true/false here, not the act/section details.
        // If the UI needs to show WHICH law a flagged clause relates to, that is
        // a real gap to raise with the Python side, not something to invent here.
      })),
      obligations: (data.obligations || []).map(o => ({ date: o.date, description: o.description })),
      masking: {
        cnic: (data.masking_applied || {}).cnic || 0,
        phone: (data.masking_applied || {}).phone || 0,
        email: (data.masking_applied || {}).email || 0,
      },
      // FastAPI signals truncation inside the summary text, not as its own field.
      truncated: (data.summary || '').includes('Only the first'),
    };
  } catch (error) {
    if (error.response) {
      console.error(`[RAG Service Error] analyze-document ${error.response.status}:`, error.response.data);
      // Pass FastAPI's own message through (413 too large, 422 bad file) instead
      // of replacing it with a generic error the user cannot act on.
      const err = new Error(error.response.data?.detail || 'Document analysis failed.');
      err.status = error.response.status;
      throw err;
    }
    console.error(`[RAG Service Error] ${error.message}`);
    throw new Error('Python FastAPI document analysis service is unreachable.');
  }
};

/**
 * Pings FastAPI's /health endpoint to check if it's reachable.
 * Used at Express startup and by Express's own /api/health route.
 * Fails fast (2s timeout) — a slow/unreachable Python service must not
 * hang whoever calls this.
 */
exports.checkPythonHealth = async () => {
  try {
    const pythonUrl = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/health`;
    const response = await axios.get(pythonUrl, { timeout: 2000 });
    return { reachable: true, chunksLoaded: response.data.chunks_loaded };
  } catch (error) {
    return { reachable: false, error: error.message };
  }
};