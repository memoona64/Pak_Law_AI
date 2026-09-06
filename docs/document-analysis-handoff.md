# Document Analysis — Handoff

**Plan reference:** §9b (Document analysis), §6 (citation verifier), §11 (endpoints, collections), §13 Phase 1 task 5 + Phase 2 task 1
**Status:** FastAPI side complete. Express and frontend still to do.
**Branch:** `document-analysis`

---

## 0. How it works, in plain language

**The problem we are solving.** Someone signs a rent agreement without understanding it. We want to tell them, in plain words, what the document makes them do — and warn them about clauses that conflict with actual Pakistani law.

**The trick is that we did not build anything new to do this.** The Q&A feature already knows how to take a question, find the relevant law, and answer it with a real citation. Document analysis just feeds it a different input: instead of a typed question, each *clause* of the uploaded document becomes the "question". That is why §9b calls it cheap.

**What happens when someone uploads a PDF, step by step:**

1. **Read the text out of the PDF.** We use a library called `pdfplumber` that pulls text off each page. This only works if the PDF has real, selectable text. If someone scanned or photographed a paper document, there is no text to read — just a picture of text — so we reject it and say so. (Reading text out of pictures is called OCR, and the plan deliberately decided not to do it.)

2. **Hide the personal information.** Before anything is sent to Google's AI, we find and cover up CNIC numbers, phone numbers, and email addresses using *pattern matching* — for example, "5 digits, dash, 7 digits, dash, 1 digit" is a CNIC. We count how many of each we hid, so the screen can honestly say "2 CNIC numbers and 1 phone number were masked". **We do not detect names or addresses**, and the UI must say so plainly. This step runs first, on purpose, so private data never reaches the AI at all.

3. **Split the document into clauses.** A contract is a list of numbered clauses, so we cut the text wherever a new number starts ("1.", "2.", "3."). If a document has no numbering, we fall back to splitting it into small groups of sentences instead.

4. **For each clause, find the relevant law.** This reuses the existing search, unchanged — the same BM25 + vector + fusion pipeline the chat feature uses. This step runs on our own machine and costs nothing.

5. **Ask the AI to judge each clause.** We send the clause together with the law we found, and ask: is this normal, questionable, or a real problem? It answers `ok`, `warn`, or `flag`, with one sentence explaining why, and notes any deadline the clause creates.

6. **Check the AI did not make up its citation.** This is the important part. AI models sometimes invent section numbers that sound real. So we read every "Section 9(2)" style reference out of the AI's explanation and confirm it matches a chunk of law we actually retrieved. **If it does not match, we force that clause to `flag`, no matter how confident the AI was.** An invented citation can never be shown as safe.

7. **Write the summary.** One final AI call produces 3–5 plain sentences: what kind of document this is and what it commits you to.

**Two things worth understanding about why the code looks the way it does:**

- **Failures are contained.** Every AI call can fail — the network drops, the free quota runs out, the model returns something malformed. If that happens, the affected clauses come back marked `warn` with an honest "analysis failed, please review manually" note, and **every other clause still gets analysed**. A document is never thrown away because one part of it failed.
- **Each clause costs one AI request, plus one for the summary.** A 5-clause document costs 6 requests. This adds up fast on the free Gemini tier, so avoid re-running the same document repeatedly while testing. A batching optimisation (8 clauses per request) was written and then deliberately set aside before submission because it had not been verified against the live API — see limitation 5.

**Where this fits in the system.** The browser never talks to Python directly (§3). The React page will call Express, and Express calls this Python endpoint and saves the result in MongoDB. That Express layer is not built yet — see section 3 below.

---

## 1. What is done

`POST /rag/analyze-document` implements the full §9b pipeline and is working end to end.

| §9b step | Where it lives | Notes |
|---|---|---|
| Upload PDF | `fastapi_app/main.py` | PDF only, 10 MB cap |
| Extract text | `fastapi_app/document_extraction.py` | Same pdfplumber approach as `scripts/extract.py`, reading upload bytes instead of a file path |
| Mask PII | `fastapi_app/masking.py` | Regex only — CNIC, phone, email. Returns a count per category |
| Chunk it | `fastapi_app/doc_chunker.py` | Splits by numbered clause; sentence-window fallback for unstructured documents |
| Retrieve relevant law | `fastapi_app/search_service.py` | **Reused unchanged.** No second retrieval pipeline (§14 risk) |
| LLM explains the clause | `fastapi_app/generation.py` → `analyze_clause()` | One Gemini call per clause. Returns risk + note + obligation |
| Citation verifier | `fastapi_app/citation_verifier.py` | See limitation 1 below |
| Summary + flagged clauses | `fastapi_app/main.py` | `summarize_document()` writes the 3–5 sentence summary |

**Masking ordering is correct per §9b** ("never in parallel"): masking runs before chunking, and before any text reaches the embedding model or the LLM.

### Verified behaviour, not just written

- Real PDF end to end: masked 1 CNIC and 1 phone, correctly flagged a 15% rent escalation against the 10% statutory ceiling in the Sindh Rented Premises Ordinance, and extracted the vacate date as an obligation.
- **Hallucinated citation test:** when the model was forced to return `"risk": "ok"` while citing a fabricated "Section 9999", the endpoint overrode it to `flag` with `citations_verified: false`. An unverified citation can never pass through as safe.
- Rejections: non-PDF → 422, scanned PDF with no text layer → 422, oversized → 413, empty → 400.

---

## 2. API contract

### Request

`POST /rag/analyze-document` — `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | file | yes | **PDF only**, max **10 MB** |
| `province` | string | no | e.g. `sindh` — filters retrieval to that province plus federal law |
| `use_reranker` | boolean | no | Defaults to `false`. See the latency warning in §4 before enabling |

### Response `200`

```json
{
  "summary": "This document is a tenancy agreement which obligates you to pay a monthly rent of Rs 125,000 and to vacate on or before 14 August 2029. ...",
  "flagged_clauses": [
    {
      "clause_number": "4",
      "text": "Clause 4. Rent. The Tenant shall pay ...",
      "risk": "flag",
      "note": "The 15 percent annual rent increase exceeds the limit in Section 9(2) of the Sindh Rented Premises Ordinance, 1979.",
      "citations_verified": true
    }
  ],
  "obligations": [
    { "date": "14 August 2029", "description": "The tenant must vacate the premises." }
  ],
  "masking_applied": { "cnic": 1, "phone": 1, "email": 0 }
}
```

**Field notes**

- `flagged_clauses` contains **every** clause analysed, not only the risky ones. Each carries its own `risk`, which is one of `ok`, `warn`, `flag`. Filter client-side.
- `clause_number` is the document's own clause number where it has one, otherwise a sequential position.
- `citations_verified` is `false` when the clause cited a section that was not found in the retrieved law. Those clauses are always forced to `risk: "flag"`.
- `masking_applied` gives exact counts, so the UI badge can say "2 CNIC numbers and 1 phone number were masked".

### Errors

| Status | When | Body |
|---|---|---|
| 400 | Empty file | `{"detail": "Uploaded file is empty"}` |
| 413 | Over 10 MB | `{"detail": "File is too large. Maximum size is 10 MB."}` |
| 422 | Not a PDF | `{"detail": "Only PDF files are supported."}` |
| 422 | Scanned PDF, no text layer | `{"detail": "No text could be read from this PDF. Scanned documents are not supported — ..."}` |
| 422 | Nothing analysable found | `{"detail": "No analyzable text found in this document"}` |

A single clause failing (API error, quota exhausted, unparseable model output) does **not** fail the request — that clause is returned as `warn` with an explanatory note and the remaining clauses are still analysed.

### API quota cost per upload

**One Gemini call per clause, plus one for the summary.**

| Document size | Gemini calls |
|---|---|
| 5 clauses | 6 |
| 20 clauses | 21 |
| 40 clauses | 41 |

Retrieval is local and costs no quota. If you see every clause come back as *"Analysis failed for this clause"* with `masking_applied` still populated, that is almost always the **free-tier quota** (HTTP 429 in the server log), not a bug — a new API key on the same Google account will not help, since quota is per project.

---

## 3. What still needs doing

### Express — Phase 2 task 3 (§11)

- `POST /api/documents/upload` — multer, **PDF only, 10 MB cap** (match `MAX_UPLOAD_BYTES` in `fastapi_app/main.py`), forward to `/rag/analyze-document`, save the result.
- `GET /api/documents/:id` — return a saved analysis, scoped to the owning user.
- Both routes currently return `501` in `backend/routes/documents.js`.
- `Documents` collection per §11: `userId, filename, summary, flaggedClauses[], obligations[], maskingApplied, citations[], createdAt`.
- The pattern to copy is `chatController.js` → `ragService.js`, which already forwards to FastAPI over axios.

### Frontend — Phase 3 task 3 (§12)

- Wire `Documents.jsx` / `DocumentDetail.jsx` to real data. Every clause, count, and date in them is currently hardcoded sample data.
- **Update the upload copy.** It currently says *"PDF, DOCX, JPG, or scanned pages. Up to 40 MB."* All of that is now wrong — it is **PDF only, 10 MB**, and scanned pages are explicitly unsupported.
- **Masking badge wording (§9b, important).** Label it **"basic masking"**, never "PII protection". State plainly that CNIC, phone and email are masked by pattern matching, and that **names and addresses are not**. Overclaiming here is a viva risk and a genuine liability.
- State the other §9b limits in the UI: PDF only, size cap, scanned documents will not work, and *"this is not a legal review — it flags things worth asking a lawyer about."*

### Citation verifier — Phase 1 task 5 — **done**

Now owned here and wired as §6 requires. See section 6 below.

### Chunker — Phase 1 task 2

The section-aware corpus chunker is **not committed anywhere** — only its output in `data/chunks/*.json`. It should be committed so the corpus can be rebuilt.

---

## 4. Known limitations — state these honestly

1. **Citation verification is existence-only (§6 step 3 not implemented).** §9b says a cited section is "verified to exist **and to say what the answer claims**". Only the first half is implemented: we confirm the cited Section/Article is grounded in the law actually retrieved. We do **not** verify that a quoted excerpt appears verbatim in the cited section, and the system prompt does not currently require answers to include verbatim excerpts — both would need to change together. The `find_unsupported_claims()` lexical-overlap check is a partial substitute (§8 calls this only partly automatable). Do not claim the second half.

2. **Reranker latency is far over budget.** §8 Panel 4 budgets 200–600 ms for reranking. Measured on CPU with the model already warm: **~15.7 seconds** per query (~49 s on the first call including model load). §15 targets p95 under 6 s end to end. This is why `use_reranker` defaults to `false` on this endpoint — it runs once per clause, so a 20-clause document would add roughly five minutes.

3. **The reranker can hard-crash the process.** `bge-reranker-v2-m3` needs ~2.3 GB and segfaults when free RAM drops below roughly 3 GB. A segfault kills the whole process — the existing `ModelUnavailableError` fallback cannot catch it, since that only handles Python exceptions. If the API dies silently, this is the first thing to check.

4. **Basic masking only.** CNIC, phone and email by regex. Names and addresses are not attempted, per §9b.

5. **A batching optimisation exists but was not shipped.** Sending 8 clauses per Gemini call (cutting a 20-clause document from 21 requests to 4) was written and unit-tested, but the free-tier quota ran out before it could be verified against the live API. Rather than ship unverified behaviour before submission, the proven one-call-per-clause version was kept. The patch is worth revisiting after submission if quota limits become a problem.

---

## 5. Citation verifier (plan §6, Phase 1 task 5)

`fastapi_app/citation_verifier.py` — the hallucination guard. It runs in two places: on every chat answer, and on every clause explanation in document analysis.

### What it does

| §6 step | Status |
|---|---|
| 1. Parse every section/article reference out of the answer | Done — English, Urdu (`دفعہ`, `آرٹیکل`) and Roman Urdu (`dafa`, `dhara`) forms |
| 2. Check each exists in the retrieved law | Done |
| 3. Check the quoted excerpt appears in the section's text | **Not done** — see limitation 1 |
| 4. On failure: refuse the answer and log it | Done |
| Runs as a blocking gate on `/rag/query` | Done |
| §8 unsupported-claim detector | Done — `find_unsupported_claims()` |

### How the gate behaves

If an answer cites anything that is not grounded in the law retrieved for it, the answer is **withheld** — replaced with a refusal telling the user the sources are listed below — and the event is logged with the offending references. This matches §1 ("every answer citing a real Act and Section verified against the corpus before display, **or it refuses**").

`/rag/query` gained four response fields, all additive so existing callers keep working:

| Field | Meaning |
|---|---|
| `citations_verified` | `false` if any citation was ungrounded |
| `unverified_citations` | The specific references that failed, e.g. `[{"type":"section","number":"9999"}]` |
| `unsupported_claims` | Answer sentences with little lexical overlap with the retrieved law (§8: a review signal, not proof) |
| `verifier_blocked` | `true` when the answer was withheld — **this is the count for dashboard Panel 2** |

`timings` also gains `verify_ms` for the §8 Panel 4 latency breakdown.

### Why it checks retrieved chunks, not the whole corpus

An answer citing a real section that was never retrieved is still ungrounded in the sources it claims to be based on. Checking against retrieval is the stricter and more honest test.

### Avoiding false blocks

Legal provisions cross-reference each other constantly ("Section 302 read with Section 34"). If the verifier only checked chunk *metadata*, repeating a cross-reference from inside a retrieved chunk's own text would wrongly block a correct answer. So a reference is treated as grounded if it appears in chunk metadata **or** anywhere in the retrieved chunk text. Verified by test: a cross-reference to Section 34 quoted from a retrieved Section 302 chunk passes, while an invented Section 9999 is blocked.

---

## 6. Attribution

- `masking.py`, `doc_chunker.py`, `citation_verifier.py`, `document_extraction.py`, the `/rag/analyze-document` endpoint, `analyze_clause()`, `summarize_document()`, and the two new prompts — this branch.
- `generation.py` and `prompts.py` were created by Wania Imran on `llm-generation`; this branch merged that work and added to it.
- `search_service.py` is Kaneeza's and was reused unchanged.
