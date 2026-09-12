"""
PakLaw AI — FastAPI Application
POST /rag/query  — hybrid search pipeline
"""

import io
import logging
import os
import sys
import time
from typing import Optional

if sys.platform == "win32" and hasattr(sys.stdout, "buffer") and hasattr(sys.stderr, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import citation_verifier, doc_chunker, document_extraction, masking, search_service
from .errors import DocumentExtractionError, ModelUnavailableError
from .generation import analyze_clauses, generate_answer, summarize_document

MAX_CLAUSES = 100
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
# Clauses per Gemini call. The free tier allows only 20 requests per day, so
# one call per clause cannot analyze a realistic contract at all. Worst case
# for one document analysis: ceil(MAX_CLAUSES / CLAUSE_BATCH_SIZE) clause-batch
# calls + 1 summary call = ceil(100 / 15) + 1 = 8 Gemini calls, comfortably
# under the daily cap.
CLAUSE_BATCH_SIZE = 15


logger = logging.getLogger("uvicorn.error")


def _parse_allowed_origins() -> list[str]:
    """Return allowed origins from env, with local dev-safe defaults."""
    raw = os.getenv("ALLOWED_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    return [
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]


def _parse_allow_origin_regex() -> Optional[str]:
    """Return optional CORS origin regex from env or sensible localhost default."""
    raw = os.getenv("ALLOWED_ORIGIN_REGEX")
    if raw:
        return raw.strip() or None
    return r"https?://(localhost|127\.0\.0\.1)(:\d+)?$"


allowed_origins = _parse_allowed_origins()
allow_credentials = "*" not in allowed_origins
allow_origin_regex = None if "*" in allowed_origins else _parse_allow_origin_regex()

app = FastAPI(
    title="PakLaw AI",
    description="Legal Q&A for Pakistani citizens",
    version="0.1.0",
    servers=[{"url": "/", "description": "Same origin"}],
    # Keep OpenAPI server URL relative to request origin.
    # This prevents Swagger from calling a stale host/scheme and throwing
    # "Failed to fetch" when running behind tunnels/proxies/different ports.
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Each validation-handled endpoint's own expected request shape and field
# hints, so a validation error on one endpoint doesn't show another
# endpoint's JSON body as the "expected" fix.
_ENDPOINT_VALIDATION_INFO = {
    "/rag/query": {
        "expected_body": {
            "query": "Section 302 PPC",
            "province": "Sindh",
            "use_reranker": True,
            "normalize": True,
        },
        "field_hints": {
            "query": "'query' is required and must be a non-empty string.",
            "province": "'province' must be a string when provided (e.g. 'Sindh').",
            "use_reranker": "'use_reranker' must be true or false.",
            "body": "Request body must be valid JSON.",
        },
    },
    "/rag/analyze-document": {
        "expected_body": {
            "file": "(multipart/form-data file upload, required)",
            "province": "Sindh",
            "use_reranker": False,
        },
        "field_hints": {
            "file": "'file' is required and must be an uploaded document.",
            "province": "'province' must be a string when provided (e.g. 'Sindh').",
            "use_reranker": "'use_reranker' must be true or false.",
        },
    },
}


def _build_validation_help(errors: list[dict], field_hints: dict[str, str]) -> list[str]:
    """Convert raw validation errors into short, actionable hints."""
    hints = []
    for err in errors:
        loc = err.get("loc", [])
        if not loc:
            continue

        field = loc[-1]
        hint = field_hints.get(field)
        if hint:
            hints.append(hint)

    if not hints:
        hints.append("Check the request fields and their types.")

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(hints))


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User's legal question")
    province: Optional[str] = Field(
        default=None,
        description="Optional province filter, e.g. Sindh or Punjab",
    )
    use_reranker: bool = Field(
        default=True,
        description="If true, re-rank fused search results with cross-encoder",
    )
    normalize: bool = Field(
        default=True,
        description="If true, normalize Roman Urdu / Urdu queries into English legal search terms",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "query": "police FIR darj nahi kar rahi",
                "province": "Sindh",
                "use_reranker": True,
                "normalize": True,
            }
        }
    }


class ChunkResponse(BaseModel):
    id: str
    text: str
    metadata: dict
    rerank_score: Optional[float] = None


class QueryResponse(BaseModel):
    chunks: list[ChunkResponse]
    answer: str
    timings: dict
    province_filter: Optional[str]
    normalized_query: Optional[str] = None
    citations_verified: bool = True
    unverified_citations: list[dict] = []
    unsupported_claims: list[str] = []
    verifier_blocked: bool = False


class ObligationItem(BaseModel):
    date: str
    description: str


class ClauseAnalysis(BaseModel):
    clause_number: Optional[str]
    text: str
    risk: str
    note: str
    citations_verified: bool


class AnalyzeDocumentResponse(BaseModel):
    summary: str
    flagged_clauses: list[ClauseAnalysis]
    obligations: list[ObligationItem]
    masking_applied: dict


@app.on_event("startup")
def startup():
    search_service.initialize()
    logger.info(
        "CORS active config | allow_origins=%s | allow_origin_regex=%s | allow_credentials=%s",
        allowed_origins,
        allow_origin_regex,
        allow_credentials,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    raw_errors = exc.errors()
    path = request.url.path
    # Fall back to /rag/query's shape for any endpoint not in the table above,
    # so a new endpoint without guidance still gets something rather than
    # nothing.
    info = _ENDPOINT_VALIDATION_INFO.get(path, _ENDPOINT_VALIDATION_INFO["/rag/query"])

    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed for request body.",
            "endpoint": path,
            "expected_body": info["expected_body"],
            "help": _build_validation_help(raw_errors, info["field_hints"]),
            "errors": raw_errors,
        },
    )


@app.post("/rag/query", response_model=QueryResponse)
def rag_query(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        chunks, timings, normalized_query = search_service.search(
            query=request.query,
            k=5,
            province=request.province,
            use_reranker=request.use_reranker,
            normalize=request.normalize,
        )
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        answer = generate_answer(request.query, chunks)
    except Exception as exc:
        # Retrieval succeeded, so return the sources with an honest note rather
        # than a 500: the user still gets the law even when generation fails.
        logger.warning("Answer generation failed: %s", exc)
        answer = (
            "The answer could not be generated right now. The relevant legal sources "
            "retrieved for this question are listed below."
        )

    # Citation verifier: a blocking gate between generation and display. An
    # answer citing law that was never retrieved is withheld, not shown.
    started = time.perf_counter()
    verification = citation_verifier.verify_citations(answer, chunks)
    unsupported = citation_verifier.find_unsupported_claims(answer, chunks)
    blocked = bool(verification["unverified"])
    if blocked:
        logger.warning(
            "Answer blocked: unverified citations %s for query %r",
            verification["unverified"],
            request.query,
        )
        answer = (
            "This answer was withheld because it cited legal provisions that could not be "
            "verified against the retrieved sources. The sources found for your question are "
            "listed below. Please consult a qualified Pakistani legal professional."
        )
    timings["verify_ms"] = round((time.perf_counter() - started) * 1000, 1)

    return QueryResponse(
        chunks=chunks,
        answer=answer,
        timings=timings,
        province_filter=request.province,
        normalized_query=normalized_query,
        citations_verified=verification["all_verified"],
        unverified_citations=verification["unverified"],
        unsupported_claims=unsupported,
        verifier_blocked=blocked,
    )


def _retrieve_for_clause(clause_text: str, province: Optional[str], use_reranker: bool) -> list[dict]:
    """Find the law relevant to one clause. Local only — no LLM call, no quota cost."""
    try:
        retrieved, _, _ = search_service.search(
            query=clause_text, k=5, province=province, use_reranker=use_reranker
        )
        return retrieved
    except ModelUnavailableError as exc:
        logger.warning("Retrieval unavailable for a clause, analyzing with no context: %s", exc)
        return []


@app.post("/rag/analyze-document", response_model=AnalyzeDocumentResponse)
async def analyze_document(
    request: Request,
    file: UploadFile = File(...),
    province: Optional[str] = Form(None),
    # Off by default: reranking runs per clause and costs ~15s each, so a long
    # document would take minutes. Turn it on for higher retrieval quality.
    use_reranker: bool = Form(False),
):
    too_large_detail = (
        f"File is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
    )

    # Cheap, early check: if the whole request body is already bigger than
    # the limit, reject now instead of even starting to read the file.
    # Content-Length covers the whole multipart body (a little more than the
    # file itself), so this only ever rejects early — it never lets an
    # oversized file through — and the chunked read below is still the
    # authoritative check.
    content_length = request.headers.get("content-length")
    if content_length is not None and content_length.isdigit():
        if int(content_length) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=too_large_detail)

    # Read in bounded chunks instead of one `await file.read()`, so a file
    # that lies about (or omits) Content-Length still gets rejected as soon
    # as it crosses the limit, rather than being fully buffered into memory
    # first and only checked afterwards.
    chunks_read = []
    total_bytes = 0
    chunk_size = 1024 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=too_large_detail)
        chunks_read.append(chunk)
    data = b"".join(chunks_read)

    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        raw_text = document_extraction.extract_text(file.filename or "", data)
    except DocumentExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    mask_result = masking.mask_text(raw_text)
    clauses = doc_chunker.chunk_document(mask_result.text)
    if not clauses:
        raise HTTPException(status_code=422, detail="No analyzable text found in this document")

    truncated = len(clauses) > MAX_CLAUSES
    clauses = clauses[:MAX_CLAUSES]

    prepared = [
        {
            "clause_number": clause["clause_number"] or str(index),
            "text": clause["text"],
            "chunks": _retrieve_for_clause(clause["text"], province, use_reranker),
        }
        for index, clause in enumerate(clauses, start=1)
    ]

    analyzed: list[ClauseAnalysis] = []
    obligations: list[ObligationItem] = []
    for start in range(0, len(prepared), CLAUSE_BATCH_SIZE):
        batch = prepared[start : start + CLAUSE_BATCH_SIZE]
        try:
            results = analyze_clauses(batch)
        except Exception as exc:
            # One failed batch (API error, quota) must not discard the rest.
            logger.warning("Analysis failed for clauses starting at %s: %s", start + 1, exc)
            results = [
                {
                    "risk": "warn",
                    "note": "Analysis failed for this clause; please review manually.",
                    "obligation": None,
                }
                for _ in batch
            ]

        for item, result in zip(batch, results):
            verification = citation_verifier.verify_citations(result["note"], item["chunks"])
            analyzed.append(
                ClauseAnalysis(
                    clause_number=item["clause_number"],
                    text=item["text"],
                    # An unverified citation outranks whatever risk the model claimed.
                    risk="flag" if verification["unverified"] else result["risk"],
                    note=result["note"],
                    citations_verified=verification["all_verified"],
                )
            )
            if result["obligation"]:
                try:
                    obligations.append(ObligationItem(**result["obligation"]))
                except Exception as exc:
                    # The model's JSON doesn't always match the expected shape
                    # (missing/extra keys, wrong types). One malformed
                    # obligation must not discard every clause analyzed so far.
                    logger.warning(
                        "Skipping malformed obligation for clause %s: %s",
                        item["clause_number"],
                        exc,
                    )

    flagged_notes = [clause.note for clause in analyzed if clause.risk == "flag"]
    try:
        summary = summarize_document(mask_result.text, flagged_notes)
    except Exception as exc:
        # A failed summary must not discard the clause analysis that succeeded.
        logger.warning("Document summary failed: %s", exc)
        flagged_count = len(flagged_notes)
        warn_count = sum(1 for clause in analyzed if clause.risk == "warn")
        summary = (
            f"Summary unavailable. {len(analyzed)} clauses analyzed, "
            f"{flagged_count} flagged for review, {warn_count} warnings."
        )
    if truncated:
        summary += f" Only the first {MAX_CLAUSES} clauses were analyzed due to document length."

    return AnalyzeDocumentResponse(
        summary=summary,
        flagged_clauses=analyzed,
        obligations=obligations,
        masking_applied=mask_result.counts,
    )


@app.get("/")
def root():
    return {
        "name": "PakLaw AI",
        "status": "ok",
        "endpoints": {
            "health": "/health",
            "query": "/rag/query",
            "docs": "/docs",
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "chunks_loaded": len(search_service._chunks)}
