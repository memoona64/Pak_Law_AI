# Pak_Law_AI

A bilingual (English / Urdu / Roman-Urdu) legal question-answering system for
Pakistani citizens. Ask a question in plain language and get an answer backed
by real citations from Pakistani law (Constitution, Pakistan Penal Code, Code
of Criminal Procedure, Muslim Family Laws Ordinance, Sindh Rented Premises
Ordinance).

## How the pieces fit together

```
frontend/     React (Vite) chat UI — talks only to backend/
backend/      Express + MongoDB — auth, chat history, document uploads;
              forwards questions to fastapi_app/ and never does retrieval itself
fastapi_app/  FastAPI service — hybrid BM25 + Chroma vector search, cross-
              encoder reranking, exact-citation lookup, Gemini-based answer
              generation and citation verification
scripts/      One-off pipeline that builds the legal corpus: extracts text
              from PDFs in data/raw/, cleans it, chunks it, and records
              source/freshness metadata in data/corpus_meta.json
data/         raw/ (original PDFs, never modified by any script), clean/
              (extracted text), chunks/ (the chunked corpus fastapi_app loads)
```

A request flows: **frontend → backend (auth + storage) → fastapi_app
(retrieval + generation) → back through backend → frontend**.

## Getting started

Each part has its own setup:

- Backend: see [backend/README.md](backend/README.md)
- FastAPI retrieval service: see
  [PAKLAW_AI_QUICK_START.md](PAKLAW_AI_QUICK_START.md) and
  [PAKLAW_AI_RETRIEVAL_EXPLAINED.md](PAKLAW_AI_RETRIEVAL_EXPLAINED.md) for how
  the search pipeline itself works
- Frontend: `cd frontend && npm install && npm run dev`
- Corpus pipeline: scripts under `scripts/` (see comments in each script —
  `data/raw/` is never modified, only read)

Evaluation results and methodology are in `evaluation_report.md`.

## Further docs

- [docs/express-fastapi-guide.md](docs/express-fastapi-guide.md) — how the
  Express backend and FastAPI service talk to each other
- [fastapi_app/docs/retrieval-design.md](fastapi_app/docs/retrieval-design.md)
  — retrieval pipeline design decisions and trade-offs
