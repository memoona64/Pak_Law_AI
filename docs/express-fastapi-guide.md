# Connecting Express to the Python API

*A guide for the document upload feature. Every file below is ready to use — the code here is the corrected version of what we already have.*

---

## Part 1 — How the two halves fit together

### There are two separate programs running at once

They are different programs, in different languages, on different ports. They are **not** imported into each other.

```
   Browser (React)
        |
        |  calls http://localhost:5000
        v
   Express  (Node.js)   <-- the backend part
        |
        |  calls http://localhost:8000
        v
   FastAPI  (Python)    <-- already built
        |
        +-- searches the law corpus
        +-- talks to Google's AI
```

Express sends Python an HTTP request, exactly like calling any website's API. Python sends JSON back.

**Two rules that follow from this:**

1. **Both servers must be running.** If Python is not started, Express fails with `ECONNREFUSED`. That is not a bug in the Express code — the other program simply is not there.
2. **The browser never calls Python directly.** It only talks to Express. Express is the middleman that also handles login and saves things to MongoDB.

---

## Part 2 — See it working before writing code

Do this first. It proves the Python side works and shows exactly what data comes back.

```bash
pip install -r requirements.txt
python -m uvicorn fastapi_app.main:app --port 8000
```

You need a `.env` in the **project root** (not in `backend/`) with:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

Then open **http://127.0.0.1:8000/docs** in a browser. Find `POST /rag/analyze-document`, click **Try it out**, choose `sample_tenancy_agreement.pdf`, click **Execute**, and wait 1–3 minutes.

### What comes back

```json
{
  "summary": "This is a residential tenancy agreement ...",
  "flagged_clauses": [
    {
      "clause_number": "2",
      "text": "2. Rent. The Tenant shall pay monthly rent of Rs. 125,000 ...",
      "risk": "flag",
      "note": "The 15% annual rent increase exceeds the 10% limit under Section 9(2) ...",
      "citations_verified": true
    }
  ],
  "obligations": [
    { "date": "14 August 2029", "description": "The Tenant must vacate the premises." }
  ],
  "masking_applied": { "cnic": 2, "phone": 1, "email": 0 }
}
```

**Why it takes minutes:** every batch of clauses is a separate call to Google's AI. That is normal, not a hang.

---

## Part 3 — Two naming differences to know about

These trip people up, so they are worth stating plainly.

**Python uses `snake_case`, our database uses `camelCase`:**

| Python sends | We store |
|---|---|
| `flagged_clauses` | `clauses` |
| `clause_number` | `clauseNumber` |
| `risk` | `status` |
| `citations_verified` | `citationsVerified` |
| `masking_applied` | `masking` |

The controller does this conversion. **Whoever builds the frontend needs to know this**, because the browser receives `clauses[].status`, not `flagged_clauses[].risk`.

**Python's chat endpoint takes `query`, not `question`.** It also does **not** accept a `language` field at all. That is a real missing feature on the Python side, not a naming problem — multilingual answering is not built server-side yet. We accept `language` in Express and simply do not forward it, and we say so in a comment rather than pretending it works.

---

## Part 4 — Setup

```bash
cd backend
npm install multer form-data express-rate-limit
```

| Package | Why |
|---|---|
| `multer` | Lets Express receive an uploaded file from the browser |
| `form-data` | Lets Express forward that file on to Python |
| `express-rate-limit` | Caps how many uploads one person can make (see Part 6) |
| `axios` | Already installed — sends the HTTP request |

The Python side also needs `python-multipart` to accept file uploads. It is already in the project's `requirements.txt`, so `pip install -r requirements.txt` covers it — but if uploads fail with a "python-multipart" error, that install step was skipped.

In `backend/.env`:

```
PYTHON_SERVICE_URL=http://localhost:8000
```

**Why a file needs `form-data`:** chat sends plain JSON, which is just text. A file cannot go inside JSON — files travel in a different format called `multipart/form-data`. The `form-data` package builds that format. This is the only real difference between the chat call and the document call.

---

## Part 5 — The files

### `backend/models/Document.js`

```js
/**
 * Document Data Model
 * Stores the analysis of one uploaded legal document.
 */

const mongoose = require('mongoose');

const clauseSchema = new mongoose.Schema({
  clauseNumber: { type: String },
  text: { type: String, required: true },
  status: { type: String, enum: ['ok', 'warn', 'flag'], required: true }, // mapped from FastAPI's "risk"
  note: { type: String },
  // Defaults to false on purpose: if this field is ever missing we must assume
  // NOT verified. Defaulting to true would silently mark an unchecked citation
  // as safe, which is the opposite of what this flag exists for.
  citationsVerified: { type: Boolean, default: false },
}, { _id: false });

const obligationSchema = new mongoose.Schema({
  date: { type: String },
  description: { type: String, required: true },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true },
  // Not required: if the AI quota runs out, Python still returns a useful
  // result with the clauses and masking counts, just without a summary.
  summary: { type: String, default: '' },
  clauses: { type: [clauseSchema], default: [] },
  obligations: { type: [obligationSchema], default: [] },
  masking: {
    cnic: { type: Number, default: 0 },
    phone: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
  },
  truncated: { type: Boolean, default: false }, // true if Python hit its MAX_CLAUSES limit
}, { timestamps: true }); // gives createdAt / updatedAt automatically

module.exports = mongoose.model('Document', documentSchema);
```

**Two things changed here and why:**

- `citationsVerified` now defaults to **`false`**. This flag says "we checked that the law the AI cited is real." If the field goes missing for any reason, defaulting to `true` would mark an unchecked citation as verified — exactly backwards for a safety check. Safety flags should fail closed.
- `summary` is no longer `required`. If the AI's daily quota runs out, Python still returns everything else correctly and just has no summary. With `required: true`, saving would crash and we would lose a perfectly usable result.

---

### `backend/services/ragService.js`

```js
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
```

**What changed and why:**

- **`verify` now reads `verify_ms`.** The old comment said verification did not exist. It does now, and the evaluation dashboard needs this number for its latency panel. It was returning `null` for a step that actually runs.
- **The header comment was corrected.** It claimed there was no citation-verification gate. There is one now, and the code was already reading it — so the comment contradicted the code underneath it. A stale comment is worse than no comment, because the next person believes it.
- **Added an explicit `timeout`.** Analysis takes minutes. Being explicit means nobody later assumes a long wait is a hang and "fixes" it by adding a short timeout.

---

### `backend/controllers/documentsController.js`

```js
const Document = require('../models/Document');
const ragService = require('../services/ragService');

/**
 * POST /api/documents/upload
 * multipart/form-data: file (PDF, required), province (optional)
 * Protected — req.user.id is set by the auth middleware.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Expected a "file" field with a PDF.' });
    }

    const province = req.body.province || null;

    // FastAPI does its own size/type/empty checks and returns 413 or 422.
    // analyzeDocument() passes those through instead of hiding them.
    const analysis = await ragService.analyzeDocument(
      req.file.buffer,
      req.file.originalname,
      province
    );

    const doc = await Document.create({
      userId: req.user.id,
      filename: req.file.originalname,
      summary: analysis.summary,
      clauses: analysis.clauses,
      obligations: analysis.obligations,
      masking: analysis.masking,
      truncated: analysis.truncated,
    });

    return res.status(201).json({
      id: doc._id,
      filename: doc.filename,
      uploadedAt: doc.createdAt,
      summary: doc.summary,
      clauses: doc.clauses,
      obligations: doc.obligations,
      masking: doc.masking,
      truncated: doc.truncated,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'The analysis service is not running. Start the Python server on port 8000.'
      });
    }
    next(error);
  }
};

/**
 * GET /api/documents/:id
 * Only returns a document owned by the requesting user.
 */
exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) {
      // 404 rather than 403: do not reveal that someone else's document exists.
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.json({
      id: doc._id,
      filename: doc.filename,
      uploadedAt: doc.createdAt,
      summary: doc.summary,
      clauses: doc.clauses,
      obligations: doc.obligations,
      masking: doc.masking,
      truncated: doc.truncated,
    });
  } catch (error) {
    // A malformed id should look like "not found", not a server crash.
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Document not found' });
    }
    next(error);
  }
};
```

**What changed and why:**

- **Added an `ECONNREFUSED` case.** Without it, forgetting to start the Python server produces a confusing generic 500. Now it says exactly what is wrong.
- **Added the `CastError` case to `getDocument`.** If someone requests `/api/documents/abc`, Mongoose throws because `abc` is not a valid id. Without this it becomes a 500 error; with it, it is a clean 404. The chat controller already handles it this way.

---

### `backend/routes/documents.js`

```js
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadDocument, getDocument } = require('../controllers/documentsController');

// Memory storage: the file is forwarded straight to Python, never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — must match FastAPI's MAX_UPLOAD_BYTES
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted.'));
    }
    cb(null, true);
  },
});

// Each upload costs several AI requests, and the free tier allows only 20 per
// day for the whole project. Without this cap, a few uploads exhaust the team's
// entire daily quota and everything else stops working.
const documentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Document upload limit reached for this hour.' },
});

// multer's errors (wrong type, too large) must reach the client as 400/413
// rather than crashing the request.
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

router.post('/upload', auth, documentRateLimiter, handleUpload, uploadDocument);
router.get('/:id', auth, getDocument);

module.exports = router;
```

**What changed and why:**

- **The rate limiter was restored.** It existed in the original file and was lost in the rewrite. This is the most important fix on this page: our Gemini free tier allows only **20 requests per day for the entire project**, and one upload costs 2–6 of them. Without the cap, a handful of uploads leaves nobody able to use chat or documents for the rest of the day.

Nothing to change in `server.js` — `/api/documents` is already mounted there.

---

## Part 6 — Testing it

Three things must be running: MongoDB, Python, Express.

```bash
# Terminal 1 — Python
python -m uvicorn fastapi_app.main:app --port 8000

# Terminal 2 — Express
cd backend
npm start
```

Postman is easiest: **POST** to `http://localhost:5000/api/documents/upload`, add header `Authorization: Bearer YOUR_TOKEN`, then **Body → form-data**, key `file`, change its type from Text to **File**, and pick the PDF.

Expect `201` with the saved document, including an `id` you can use with `GET /api/documents/:id`.

---

## Part 7 — When something goes wrong

| What you see | What it means | Fix |
|---|---|---|
| `ECONNREFUSED` / 503 "analysis service is not running" | Python is not started | Run uvicorn on port 8000 |
| `401 Access denied` | No login token | Add the `Authorization: Bearer <token>` header |
| `400 No file uploaded` | The form field is not named `file` | It must be exactly `file` |
| `422 Only PDF files are supported` | Not a PDF | Upload a real PDF |
| `422 No text could be read from this PDF` | It is a scan or photo, not real text | Use a PDF where text can be selected with the mouse |
| `422 This file could not be read as a PDF` | The file is corrupt, or something renamed to `.pdf` | Use a real, uncorrupted PDF |
| `413 File is too large` | Over 10 MB | Use a smaller file |
| Every clause says "Analysis failed" | AI daily quota is used up | Change `GEMINI_MODEL` in the root `.env` to another model, restart Python |
| Request seems to hang | Analysis genuinely takes 1–3 minutes | Wait. Do not shorten the timeout |
| `MongooseError` on save | MongoDB not running, or `MONGO_URI` wrong | Check `backend/.env` |

### The most confusing case

**"It says analysis failed, but there is still data."**

If the AI quota runs out, Python returns `200` with every clause marked `warn` and a note saying analysis failed — while `masking` still shows correct counts. That is deliberate. Reading the PDF, masking the personal data, and splitting the clauses all worked; only the AI step failed. Save it normally.

**How to tell quota apart from a real bug:** look at the Python terminal. `429 You exceeded your current quota` means quota. Anything else is worth investigating.

---

## Part 8 — Four things that must stay right

1. **The 10 MB limit must match on both sides.** Python rejects anything larger with `413`. If multer allowed more, the user would wait through a long upload only to be rejected at the end.
2. **PDF only.** No DOCX, no images, no scans. If the frontend still promises "PDF, DOCX, JPG, up to 40 MB", that text is wrong and must be corrected.
3. **Never replace Python's error message with a generic one.** It explains exactly why a file was rejected. Passing `error.response.data.detail` through is what makes the message useful to a real user.
4. **The masking notice wording.** The screen must say **"basic masking"**, never "PII protection", and must state that CNIC, phone and email are masked but **names and addresses are not**. If someone uploads something sensitive believing it is fully anonymous, that is a genuine harm — and the exact kind of overclaim that gets picked apart in a viva.

---

## Quick reference

| | |
|---|---|
| Python endpoint | `POST http://localhost:8000/rag/analyze-document` |
| Sent as | `multipart/form-data`, field name `file` |
| Optional fields | `province`, `use_reranker` |
| Python returns | `summary`, `flagged_clauses[]`, `obligations[]`, `masking_applied` |
| We store as | `summary`, `clauses[]`, `obligations[]`, `masking` |
| Time taken | 1–3 minutes |
| Limits | PDF only, 10 MB, 10 uploads per hour |
| AI quota | 20 requests per day for the whole project |
| Test page | http://127.0.0.1:8000/docs |
