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

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import search_service
from .errors import ModelUnavailableError


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
        "null",
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
    timings: dict
    province_filter: Optional[str]
    normalized_query: Optional[str] = None


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

    return QueryResponse(
        chunks=chunks,
        timings=timings,
        province_filter=request.province,
        normalized_query=normalized_query,
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
