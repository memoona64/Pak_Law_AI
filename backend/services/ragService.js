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
    const response = await axios.post(pythonUrl, { question, language, province });
    return response.data;
  } catch (error) {
    console.error(`[RAG Service Error] ${error.message}`);
    throw new Error('Python FastAPI retrieval service is unreachable or returned an error.');
  }
};