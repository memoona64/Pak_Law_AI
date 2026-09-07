// /**
//  * RAG Service Layer Module
//  * Decouples retrieval and generation from Express logic. Routes calls either
//  * to internal Python FastAPI service or a local mock payload based on USE_MOCK.
//  */

// const axios = require('axios');

// /**
//  * Queries the legal retrieval engine.
//  * 
//  * @async
//  * @param {Object} params - Query parameters
//  * @param {string} params.question - Legal query
//  * @param {string} params.language - Query language ("en" | "ur" | "roman_ur")
//  * @param {string} [params.province] - Optional territorial jurisdiction
//  * @returns {Promise<Object>} Standardized RAG payload matching API contract
//  */
// exports.query = async ({ question, language, province }) => {
//   if (process.env.USE_MOCK === 'true') {
//     return {
//       answer: "Under Section 154 of the Code of Criminal Procedure, the officer in charge of a police station is bound to record any information disclosing a cognisable offence.",
//       citations: [
//         {
//           id: "crpc-154-0001",
//           act: "Code of Criminal Procedure, 1898",
//           shortCode: "crpc",
//           section: "154",
//           title: "Information in cognisable cases",
//           verbatim: "Every information relating to the commission of a cognisable offence, if given orally to an officer in charge of a police-station, shall be reduced to writing.",
//           jurisdiction: "federal",
//           province: null,
//           amendedUpTo: "2026-06-10",
//           corpusVersion: "v1"
//         }
//       ],
//       verified: true,
//       safetyTriggered: false,
//       timings: { detect: 120, retrieve: 180, rerank: 340, generate: 1420, verify: 40, total: 2100 }
//     };
//   }

//   try {
//     const pythonUrl = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/rag/query`;
//     const response = await axios.post(pythonUrl, { question, language, province });
//     return response.data;
//   } catch (error) {
//     console.error(`[RAG Service Error] ${error.message}`);
//     throw new Error('Python FastAPI retrieval service is unreachable or returned an error.');
//   }
// };







// /**
//  * RAG Service Layer Module
//  * Decouples retrieval and generation from Express logic. Routes calls either
//  * to internal Python FastAPI service or a local mock payload based on USE_MOCK.
//  *
//  * NOTE ON KNOWN GAPS (as of this wiring pass):
//  * - FastAPI's /rag/query has no "language" input yet — it is accepted here
//  *   and silently NOT forwarded, because sending it would just be ignored by
//  *   FastAPI's Pydantic model anyway. Multilingual generation is not wired
//  *   server-side yet. Flag this to the team — it's a real feature gap, not
//  *   just a naming mismatch.
//  * - FastAPI has no citation-verification gate and no safety-trigger detection
//  *   in this endpoint yet. `verified` and `safetyTriggered` below are honest
//  *   placeholders (false / not-yet-implemented), not faked "true" values.
//  *   Do not change these to hardcoded `true` — that would misrepresent a
//  *   safety feature as working when it isn't built yet.
//  * - FastAPI's citation metadata keys are inconsistent across corpus files
//  *   (e.g. "section" vs "section_number", "Article" vs "Article_number").
//  *   _mapChunkToCitation() below tries multiple known key names defensively
//  *   and logs a warning (does not throw) when a field is genuinely absent,
//  *   rather than guessing or faking a value.
//  */

// const axios = require('axios');

// /**
//  * Maps one FastAPI chunk object to the frontend-facing citation contract.
//  * Defensive: different corpus files may use different metadata key names.
//  * @param {Object} chunk - { id, text, metadata, rerank_score }
//  * @returns {Object} citation matching the contract in the backend guide
//  */
// function _mapChunkToCitation(chunk) {
//   const meta = chunk.metadata || {};

//   const act = meta.act || meta.act_name || meta.law_name || null;
//   const title = meta.title || meta.heading || meta.section_title || null;
//   const section = meta.section || meta.section_number || meta.Article || meta.Article_number || null;
//   const amendedUpTo = meta.amended_up_to || meta.amendedUpTo || meta.last_verified || null;
//   const corpusVersion = meta.corpus_version || meta.corpusVersion || meta.index_version || null;

//   const missing = [
//     ['act', act], ['title', title], ['amendedUpTo', amendedUpTo], ['corpusVersion', corpusVersion],
//   ].filter(([, val]) => !val).map(([name]) => name);

//   if (missing.length) {
//     console.warn(`[RAG Service] citation ${chunk.id} missing fields: ${missing.join(', ')}`);
//   }

//   return {
//     id: chunk.id,
//     act: act || 'Unknown Act',
//     shortCode: String(meta.short_code || '').toLowerCase(),
//     section: section ? String(section) : '',
//     title: title || '',
//     verbatim: chunk.text || '',
//     jurisdiction: meta.province ? 'province' : 'federal',
//     province: meta.province || null,
//     amendedUpTo,       // null if genuinely absent in the corpus — not faked
//     corpusVersion,     // null if genuinely absent in the corpus — not faked
//   };
// }

// /**
//  * Maps FastAPI's timings object (exact_ms, normalise_ms, bm25_ms, vector_ms,
//  * rrf_ms, rerank_ms, total_ms) to the contract's stage names. Note: FastAPI
//  * does not currently time the generate_answer() call at all, so "generate"
//  * is reported as null, not guessed.
//  */
// function _mapTimings(fastapiTimings = {}) {
//   const retrieve = (fastapiTimings.bm25_ms || 0) + (fastapiTimings.vector_ms || 0) + (fastapiTimings.rrf_ms || 0);
//   return {
//     detect: fastapiTimings.normalise_ms ?? null,
//     retrieve: retrieve || null,
//     rerank: fastapiTimings.rerank_ms ?? null,
//     generate: null,   // not timed by FastAPI yet — real gap, not hidden
//     verify: null,     // verification step doesn't exist yet
//     total: fastapiTimings.total_ms ?? null,
//   };
// }

// /**
//  * Queries the legal retrieval engine.
//  *
//  * @async
//  * @param {Object} params - Query parameters
//  * @param {string} params.question - Legal query (mapped to FastAPI's "query")
//  * @param {string} params.language - Query language ("en" | "ur" | "roman_ur")
//  *   Accepted here but NOT yet forwarded — see note above.
//  * @param {string} [params.province] - Optional territorial jurisdiction
//  * @returns {Promise<Object>} Standardized RAG payload matching the API contract
//  */
// exports.query = async ({ question, language, province }) => {
//   if (process.env.USE_MOCK === 'true') {
//     return {
//       answer: "Under Section 154 of the Code of Criminal Procedure, the officer in charge of a police station is bound to record any information disclosing a cognisable offence.",
//       citations: [
//         {
//           id: "crpc-154-0001",
//           act: "Code of Criminal Procedure, 1898",
//           shortCode: "crpc",
//           section: "154",
//           title: "Information in cognisable cases",
//           verbatim: "Every information relating to the commission of a cognisable offence, if given orally to an officer in charge of a police-station, shall be reduced to writing.",
//           jurisdiction: "federal",
//           province: null,
//           amendedUpTo: "2026-06-10",
//           corpusVersion: "v1"
//         }
//       ],
//       verified: true,
//       safetyTriggered: false,
//       timings: { detect: 120, retrieve: 180, rerank: 340, generate: 1420, verify: 40, total: 2100 }
//     };
//   }

//   try {
//     const pythonUrl = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/rag/query`;

//     // FastAPI expects { query, province, use_reranker, normalize } — NOT
//     // { question, language, province }. "language" has no home yet server-side.
//     const response = await axios.post(pythonUrl, {
//       query: question,
//       province: province || null,
//       use_reranker: true,
//       normalize: true,
//     });

//     const data = response.data; // { chunks, answer, timings, province_filter, normalized_query }

//     return {
//       answer: data.answer,
//       citations: (data.chunks || []).map(_mapChunkToCitation),
//       verified: data.citations_verified === true,   // real, from citation_verifier.py
//       verifierBlocked: data.verifier_blocked === true, // NEW: answer was withheld, not just flagged
//       unsupportedClaims: data.unsupported_claims || [], // NEW: low lexical-overlap sentences
//       safetyTriggered: false,             // still not implemented in FastAPI — honest placeholder
//       timings: _mapTimings(data.timings),
//     };
//   } catch (error) {
//     if (error.response) {
//       // FastAPI responded with an error status (e.g. 422 validation, 503 model unavailable)
//       console.error(`[RAG Service Error] FastAPI ${error.response.status}:`, error.response.data);
//       throw new Error(`Retrieval service returned an error (${error.response.status}).`);
//     }
//     console.error(`[RAG Service Error] ${error.message}`);
//     throw new Error('Python FastAPI retrieval service is unreachable or returned an error.');
//   }
// };

// /**
//  * Sends an uploaded document to FastAPI's /rag/analyze-document for masking,
//  * clause chunking, per-clause risk analysis, and summarization.
//  *
//  * @async
//  * @param {Buffer} fileBuffer - raw PDF bytes (from multer memoryStorage)
//  * @param {string} filename - original filename, forwarded for logging/errors
//  * @param {string} [province] - optional province filter for retrieval
//  * @returns {Promise<Object>} { summary, clauses, obligations, masking, truncated }
//  *   already mapped into the Express/Document-model shape (NOT the raw FastAPI shape)
//  */
// exports.analyzeDocument = async (fileBuffer, filename, province) => {
//   const FormData = require('form-data');
//   const form = new FormData();
//   form.append('file', fileBuffer, filename);
//   if (province) form.append('province', province);
//   // use_reranker defaults to false in FastAPI (per-clause reranking is slow) — leave it off

//   try {
//     const pythonUrl = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}/rag/analyze-document`;
//     const response = await axios.post(pythonUrl, form, {
//       headers: form.getHeaders(),
//       maxContentLength: Infinity,
//       maxBodyLength: Infinity,
//     });

//     const data = response.data; // { summary, flagged_clauses, obligations, masking_applied }

//     return {
//       summary: data.summary,
//       clauses: (data.flagged_clauses || []).map(c => ({
//         clauseNumber: c.clause_number,
//         text: c.text,
//         status: c.risk,                          // FastAPI calls it "risk"; contract calls it "status"
//         note: c.note,
//         citationsVerified: c.citations_verified,
//         // NOTE: FastAPI does not return per-clause citation objects (act/section/etc) yet —
//         // only a citationsVerified boolean. If the frontend needs to *display* which law a
//         // flagged clause relates to, that's a real gap to raise with the FastAPI team, not
//         // something to fake here.
//       })),
//       obligations: (data.obligations || []).map(o => ({ date: o.date, description: o.description })),
//       masking: {
//         cnic: (data.masking_applied || {}).cnic || 0,
//         phone: (data.masking_applied || {}).phone || 0,
//         email: (data.masking_applied || {}).email || 0,
//       },
//       truncated: (data.summary || '').includes('Only the first'), // FastAPI signals truncation inline in the summary text, not as a separate field
//     };
//   } catch (error) {
//     if (error.response) {
//       console.error(`[RAG Service Error] analyze-document ${error.response.status}:`, error.response.data);
//       // Surface FastAPI's own validation/size errors (422, 413) rather than masking them as a generic 502
//       const err = new Error(error.response.data?.detail || 'Document analysis failed.');
//       err.status = error.response.status;
//       throw err;
//     }
//     console.error(`[RAG Service Error] ${error.message}`);
//     throw new Error('Python FastAPI document analysis service is unreachable.');
//   }
// };







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
 * - Citation metadata key names differ between corpus files ("section" vs
 *   "section_number", "Article" vs "Article_number"). _mapChunkToCitation()
 *   tries each known name and logs a warning when a field is genuinely absent,
 *   rather than inventing a value.
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
 * Defensive, because different corpus files use different metadata key names.
 */
function _mapChunkToCitation(chunk) {
  const meta = chunk.metadata || {};

  const act = meta.act || meta.act_name || meta.law_name || null;
  const title = meta.title || meta.heading || meta.section_title || null;
  const section = meta.section || meta.section_number || meta.Article || meta.Article_number || null;
  const amendedUpTo = meta.amended_up_to || meta.amendedUpTo || meta.last_verified || null;
  const corpusVersion = meta.corpus_version || meta.corpusVersion || meta.index_version || null;

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
    jurisdiction: meta.province ? 'province' : 'federal',
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
