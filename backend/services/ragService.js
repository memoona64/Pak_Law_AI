/**
 * RAG Service Layer Module
 * Decouples retrieval and generation from Express logic. Routes calls either
 * to internal Python FastAPI service or a local mock payload based on USE_MOCK.
 */

const axios = require('axios');

/**
 * Queries the legal retrieval engine.
 * 
 * @async
 * @param {Object} params - Query parameters
 * @param {string} params.question - Legal query
 * @param {string} params.language - Query language ("en" | "ur" | "roman_ur")
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
    // The Python service's request contract is { query, province, use_reranker,
    // normalize } -- it has no "question" or "language" field. Sending the
    // wrong field names here means the service's own validation always
    // rejects the request with a 422 before it ever runs a search.
    const response = await axios.post(pythonUrl, {
      query: question,
      province,
      use_reranker: true,
      normalize: true,
    });
    const { chunks = [], answer, timings } = response.data;

    // The Python service returns { chunks, answer, timings, ... }, not the
    // { citations, sources, verified, safetyTriggered } shape the rest of
    // this backend expects (that shape only exists in the mock above).
    // Translate real chunks into citation objects here so callers don't
    // need to know which mode produced the result.
    const citations = chunks.map((chunk) => {
      const meta = chunk.metadata || {};
      return {
        id: chunk.id,
        act: meta.act,
        shortCode: meta.short_code,
        section: meta.section || meta.Article,
        title: meta.section_title,
        verbatim: chunk.text,
        jurisdiction: meta.jurisdiction,
        province: meta.province,
      };
    });

    return {
      answer,
      citations,
      sources: [],
      // Neither of these is actually computed by /rag/query today -- citation
      // verification and safety checks only exist on the separate
      // document-analysis endpoint. Reporting true/false here would claim a
      // check ran when it didn't, so this reports "not evaluated" instead.
      verified: null,
      safetyTriggered: null,
      timings,
    };
  } catch (error) {
    console.error(`[RAG Service Error] ${error.message}`);
    throw new Error('Python FastAPI retrieval service is unreachable or returned an error.');
  }
};