// Regression checks for services/ragService.js - the module that talks to
// the Python FastAPI service and maps its responses into the shape the rest
// of Express expects. Runs with Node's built-in test runner (no extra
// dependency to install): `node --test`.
//
// axios is mocked by overwriting its post()/get() methods directly, since
// require() caches modules — the same axios object ragService.js imports is
// the one these tests patch, so no real network call ever happens here.

const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const ragService = require('../services/ragService');

// Restores axios.post/get after each test so one test's mock can't leak
// into the next.
function withMockedAxios(mocks, run) {
  const originalPost = axios.post;
  const originalGet = axios.get;
  if (mocks.post) axios.post = mocks.post;
  if (mocks.get) axios.get = mocks.get;
  return run().finally(() => {
    axios.post = originalPost;
    axios.get = originalGet;
  });
}

test('query() in mock mode returns a fully-shaped answer with no network call', async () => {
  const originalMock = process.env.USE_MOCK;
  process.env.USE_MOCK = 'true';
  try {
    const result = await ragService.query({ question: 'What does Section 154 say?' });
    assert.equal(result.citations.length, 1);
    assert.deepEqual(result.sources, result.citations);
    assert.equal(result.verified, true);
    assert.equal(result.verifierBlocked, false);
    assert.deepEqual(result.unsupportedClaims, []);
  } finally {
    process.env.USE_MOCK = originalMock;
  }
});

test('query() aliases sources to the same mapped list as citations', async () => {
  const originalMock = process.env.USE_MOCK;
  process.env.USE_MOCK = 'false';
  await withMockedAxios(
    {
      post: async () => ({
        data: {
          answer: 'Theft is punishable under Section 379.',
          chunks: [
            { id: 'ppc-379', text: 'Whoever commits theft...', metadata: { act: 'PPC', section_number: '379', section_title: 'Theft', short_code: 'ppc' } },
          ],
          citations_verified: true,
          verifier_blocked: false,
          unsupported_claims: [],
          timings: {},
        },
      }),
    },
    async () => {
      const result = await ragService.query({ question: 'What is theft?' });
      assert.deepEqual(result.sources, result.citations);
      assert.equal(result.citations[0].section, '379');
      assert.equal(result.citations[0].title, 'Theft');
    }
  );
  process.env.USE_MOCK = originalMock;
});

test('query() falls back through title keys for MFLO/SRPO-style chunks', async () => {
  const originalMock = process.env.USE_MOCK;
  process.env.USE_MOCK = 'false';
  await withMockedAxios(
    {
      post: async () => ({
        data: {
          answer: 'A talaq must follow the prescribed form.',
          chunks: [
            { id: 'mflo-7', text: 'A talaq shall be pronounced...', metadata: { act: 'MFLO', section_number: '7', title: 'Talaq', short_code: 'mflo' } },
          ],
          citations_verified: true,
          verifier_blocked: false,
          unsupported_claims: [],
          timings: {},
        },
      }),
    },
    async () => {
      const result = await ragService.query({ question: 'How is talaq pronounced?' });
      assert.equal(result.citations[0].title, 'Talaq');
    }
  );
  process.env.USE_MOCK = originalMock;
});

test('query() surfaces verifierBlocked and unsupportedClaims from FastAPI', async () => {
  const originalMock = process.env.USE_MOCK;
  process.env.USE_MOCK = 'false';
  await withMockedAxios(
    {
      post: async () => ({
        data: {
          answer: 'Some answer citing law that was never retrieved.',
          chunks: [],
          citations_verified: false,
          verifier_blocked: true,
          unsupported_claims: ['Some answer citing law that was never retrieved.'],
          timings: {},
        },
      }),
    },
    async () => {
      const result = await ragService.query({ question: 'Anything?' });
      assert.equal(result.verifierBlocked, true);
      assert.deepEqual(result.unsupportedClaims, ['Some answer citing law that was never retrieved.']);
    }
  );
  process.env.USE_MOCK = originalMock;
});

test('analyzeDocument() preserves the original error code (e.g. ECONNREFUSED) when FastAPI is unreachable', async () => {
  await withMockedAxios(
    {
      post: async () => {
        const err = new Error('connect ECONNREFUSED 127.0.0.1:8000');
        err.code = 'ECONNREFUSED';
        throw err;
      },
    },
    async () => {
      await assert.rejects(
        () => ragService.analyzeDocument(Buffer.from('fake pdf'), 'test.pdf', null),
        (err) => {
          assert.equal(err.code, 'ECONNREFUSED');
          return true;
        }
      );
    }
  );
});

test('analyzeDocument() passes through FastAPI\'s own error message on a 4xx response', async () => {
  await withMockedAxios(
    {
      post: async () => {
        const err = new Error('Request failed with status code 413');
        err.response = { status: 413, data: { detail: 'File too large.' } };
        throw err;
      },
    },
    async () => {
      await assert.rejects(
        () => ragService.analyzeDocument(Buffer.from('fake pdf'), 'test.pdf', null),
        (err) => {
          assert.equal(err.status, 413);
          assert.equal(err.message, 'File too large.');
          return true;
        }
      );
    }
  );
});
