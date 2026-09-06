## Summary

Implements **plan Section 9b document analysis** (`POST /rag/analyze-document`) and the **plan Section 6 citation verifier** as a blocking gate on `/rag/query`.

Plan tasks: **Phase 2 task 1** (FastAPI `/rag/query` with per-stage timing, plus `/rag/analyze-document`) and **Phase 1 task 5** (citation verifier + unsupported-claim detector).

## What this adds

Upload a PDF → extract text → mask PII → split into clauses → retrieve relevant law → LLM explains each clause → verify every citation → return summary + flagged clauses.

| New module | Purpose |
|---|---|
| `document_extraction.py` | PDF text extraction from upload bytes. PDF only; scanned PDFs rejected with a clear message |
| `masking.py` | Regex masking of CNIC / phone / email, with per-category counts |
| `doc_chunker.py` | Splits uploaded documents by numbered clause, sentence-window fallback |
| `citation_verifier.py` | Parses section/article references and confirms each is grounded in retrieved law; plus the plan Section 8 unsupported-claim detector |

`search_service.py` is **reused unchanged** — there is no second retrieval pipeline (the risk plan Section 14 warns about).

## Citation verifier is now a blocking gate (plan Section 6)

`/rag/query` previously had no citation verification at all. It now runs after generation and before display: if an answer cites law that was not retrieved, the answer is **withheld** and the event logged. This is what plan Section 1 requires ("verified against the corpus before display, or it refuses") and what plan Section 15's "Citation validity 100%" depends on.

Four **additive** fields on `QueryResponse` — nothing existing breaks:

| Field | For |
|---|---|
| `citations_verified` | Chat UI verified badge |
| `unverified_citations` | Logging / debugging |
| `unsupported_claims` | Dashboard Panel 3 |
| `verifier_blocked` | **Dashboard Panel 2 — "answers blocked by the verifier"** |

`timings.verify_ms` added for Panel 4 (measured ~0.2 ms, budget 100 ms).

## Evidence

Three live API runs saved in `docs/evidence/`, including one after the SDK migration. On the sample tenancy agreement, every run:

- flagged the **15% rent escalation** against the 10% ceiling (Sindh Rented Premises Ordinance)
- flagged **self-help re-entry** against Section 15's requirement to apply to the Controller
- verified every citation, extracted both dated obligations
- masked 2 CNICs, 1 phone, 1 email

Also tested: a forced hallucinated citation ("Section 9999") is overridden from `ok` to `flag`, while a legitimate cross-reference quoted from retrieved law is **not** falsely blocked.

## Notes for review

- **Migrated to `google-genai`** to match this branch to `dev`, so `generation.py` merges cleanly. Dev's client setup, `format_context()` and `generate_answer()` are unchanged here; only new functions are added on top. Every LLM call now goes through one `_generate()` helper (plan Section 3).
- **`GEMINI_MODEL` default differs from dev.** Dev defaults to `gemini-2.5-flash`, which returns `404 no longer available to new users` on newer keys. This branch defaults to `gemini-3.1-flash-lite`, verified working. Also, dev's commit message says `gemini-3.6-flash` "does not exist" — in testing that model returned **429 quota**, meaning the name is valid and it was a quota issue, not an invalid model.
- **Clauses are batched 8 per Gemini call.** The free tier allows only **20 requests per day per model**; one call per clause would need 21 requests for a 20-clause contract, more than the entire daily allowance.
- New dependency: `pdfplumber`. `google-generativeai` replaced by `google-genai`.

## Known limitations (documented, not hidden)

1. Citation verification is **existence-only** — we confirm a cited section is grounded in retrieved law, but do not verify the explanation correctly describes what that section says (plan Section 6 step 3 not implemented; the system prompt does not require verbatim excerpts).
2. Reranker latency is ~15.7 s warm vs plan Section 8's 200–600 ms budget, so `use_reranker` defaults to `false` on this endpoint.
3. `bge-reranker-v2-m3` segfaults when free RAM drops below ~3 GB — a process kill, not a catchable exception.
4. Masking is regex only: CNIC, phone, email. **Names and addresses are not detected.**
5. Risk levels on borderline administrative clauses vary between runs; the serious findings were stable across all three.

## Still to do (not in this PR — other owners)

- Express `POST /api/documents/upload` + `GET /api/documents/:id` + `Documents` schema (Phase 2 task 3). Multer must enforce **PDF only, 10 MB** to match.
- Document upload UI (Phase 3 task 3). The current copy promises "PDF, DOCX, JPG, up to 40 MB" — all now incorrect. The masking badge must say **"basic masking"**, never "PII protection", and state that names and addresses are not masked.

## Test plan

- [ ] `pip install -r requirements.txt`, set `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env`
- [ ] `python -m uvicorn fastapi_app.main:app --port 8000`, open `/docs`
- [ ] `POST /rag/analyze-document` with `sample_tenancy_agreement.pdf` → clauses 2 and 4 flagged, masking counts 2/1/1
- [ ] Upload a non-PDF → 422; a file over 10 MB → 413
- [ ] `POST /rag/query` still returns answers with sources, and `verifier_blocked` is present

Full detail: `docs/document-analysis-handoff.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
