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
from .generation import analyze_clause, generate_answer, summarize_document

MAX_CLAUSES = 200
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


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


def _build_validation_help(errors: list[dict]) -> list[str]:
    """Convert raw validation errors into short, actionable hints."""
    hints = []
    for err in errors:
        loc = err.get("loc", [])
        if not loc:
            continue

        field = loc[-1]
        if field == "query":
            hints.append("'query' is required and must be a non-empty string.")
        elif field == "province":
            hints.append("'province' must be a string when provided (e.g. 'Sindh').")
        elif field == "use_reranker":
            hints.append("'use_reranker' must be true or false.")
        elif field == "body":
            hints.append("Request body must be valid JSON.")

    if not hints:
        hints.append("Check JSON types and required fields.")

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

    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed for request body.",
            "endpoint": str(request.url.path),
            "expected_body": {
                "query": "Section 302 PPC",
                "province": "Sindh",
                "use_reranker": True,
                "normalize": True,
            },
            "help": _build_validation_help(raw_errors),
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


def _analyze_one_clause(
    clause_text: str, province: Optional[str], use_reranker: bool
) -> tuple[str, str, bool, Optional[dict]]:
    """Retrieve law for one clause, get a risk analysis, and verify its citations.

    Returns (risk, note, citations_verified, obligation). Any unverified
    citation forces risk to "flag" — the model's own risk guess is never
    trusted over an unverified citation.
    """
    try:
        retrieved, _, _ = search_service.search(
            query=clause_text, k=5, province=province, use_reranker=use_reranker
        )
    except ModelUnavailableError as exc:
        logger.warning("Retrieval unavailable for a clause, analyzing with no context: %s", exc)
        retrieved = []

    result = analyze_clause(clause_text, retrieved)
    verification = citation_verifier.verify_citations(result["note"], retrieved)
    risk = "flag" if verification["unverified"] else result["risk"]
    return risk, result["note"], verification["all_verified"], result["obligation"]


@app.post("/rag/analyze-document", response_model=AnalyzeDocumentResponse)
async def analyze_document(
    file: UploadFile = File(...),
    province: Optional[str] = Form(None),
    # Off by default: reranking runs per clause and costs ~15s each, so a long
    # document would take minutes. Turn it on for higher retrieval quality.
    use_reranker: bool = Form(False),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

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

    analyzed: list[ClauseAnalysis] = []
    obligations: list[ObligationItem] = []
    for index, clause in enumerate(clauses, start=1):
        clause_number = clause["clause_number"] or str(index)
        clause_text = clause["text"]
        try:
            risk, note, citations_verified, obligation = _analyze_one_clause(
                clause_text, province, use_reranker
            )
        except Exception as exc:
            # One bad clause (API error, unexpected model output) must not
            # take down analysis of the rest of the document.
            logger.warning("Analysis failed for clause %s: %s", clause_number, exc)
            risk, note, citations_verified, obligation = (
                "warn",
                "Analysis failed for this clause; please review manually.",
                False,
                None,
            )

        analyzed.append(
            ClauseAnalysis(
                clause_number=clause_number,
                text=clause_text,
                risk=risk,
                note=note,
                citations_verified=citations_verified,
            )
        )
        if obligation:
            obligations.append(ObligationItem(**obligation))

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
