"""Hybrid legal retrieval: BM25 + metadata-filtered Chroma + RRF + reranking."""

import hashlib
import json
import time
from pathlib import Path
from typing import Optional

import chromadb
import numpy as np
from rank_bm25 import BM25Okapi

from .embeddings import MODEL_NAME, embed, embed_query
from .errors import ModelUnavailableError
from .query_normalizer import normalize_query
from .reranker import rerank

CHUNKS_DIR = Path("data/chunks")
CHROMA_DIR = Path("./chroma_db")
COLLECTION_NAME = "pak_law"
INDEX_VERSION = "2"
RRF_K = 60
REPLACED_CHUNK_FILES = {
    "pakistan_penal_code.json": "pakistan_penal_code_cleaned.json",
    "sind_rented_premises_ordinance_1979.json": "sind_rented_premises_ordinance_1979_no_newlines.json",
}

_chunks: list[dict] = []
_bm25: Optional[BM25Okapi] = None
_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None
_corpus_fingerprint: Optional[str] = None


def load_chunks(chunks_dir: Path = CHUNKS_DIR) -> list[dict]:
    """Load production chunk files, preferring the approved cleaned variants."""
    all_chunks = []
    available_files = {file_path.name for file_path in chunks_dir.glob("*.json")}
    for file_path in sorted(chunks_dir.glob("*.json")):
        replacement = REPLACED_CHUNK_FILES.get(file_path.name)
        if replacement in available_files:
            continue
        with file_path.open("r", encoding="utf-8") as file_handle:
            all_chunks.extend(json.load(file_handle))
    ids = [chunk["id"] for chunk in all_chunks]
    if len(ids) != len(set(ids)):
        raise ValueError("Chunk IDs must be unique before building retrieval indexes.")
    return all_chunks


def build_bm25(chunks: list[dict]) -> BM25Okapi:
    return BM25Okapi([chunk["text"].lower().split() for chunk in chunks])


def _fingerprint(chunks: list[dict]) -> str:
    payload = [
        {"id": chunk["id"], "text": chunk["text"], "metadata": chunk["metadata"]}
        for chunk in chunks
    ]
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _normalise_province(province: Optional[str]) -> Optional[str]:
    if province is None:
        return None
    normalised = province.strip().casefold()
    return normalised or None


def _chunk_province(chunk: dict) -> Optional[str]:
    value = chunk["metadata"].get("province")
    return _normalise_province(str(value)) if value else None


def _chroma_metadata(chunk: dict) -> dict[str, str]:
    """Return only flat, non-null metadata values supported by Chroma."""
    metadata = chunk["metadata"]
    province = _chunk_province(chunk)
    return {
        "scope": "federal" if province is None else "province",
        "province": province or "",
        "section": str(metadata.get("section") or metadata.get("section_number") or ""),
        "article": str(metadata.get("Article") or metadata.get("Article_number") or ""),
        "short_code": str(metadata.get("short_code") or ""),
    }


def _collection_is_current(collection: chromadb.Collection) -> bool:
    try:
        metadata = collection.metadata or {}
        return (
            collection.count() == len(_chunks)
            and metadata.get("corpus_fingerprint") == _corpus_fingerprint
            and metadata.get("embedding_model") == MODEL_NAME
            and metadata.get("index_version") == INDEX_VERSION
        )
    except Exception:
        # If Chroma cannot read the existing index, force a safe rebuild path.
        return False


def initialize(chunks_dir: Path = CHUNKS_DIR):
    """Load corpus and reuse a matching index; defer any rebuild until needed."""
    global _chunks, _bm25, _client, _collection, _corpus_fingerprint
    if _chunks:
        return
    _chunks = load_chunks(chunks_dir)
    _bm25 = build_bm25(_chunks)
    _corpus_fingerprint = _fingerprint(_chunks)
    _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = _client.get_or_create_collection(
        name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )
    _collection = collection if _collection_is_current(collection) else None


def _build_vector_index() -> chromadb.Collection:
    """Build a fresh collection only after embeddings are available."""
    global _collection
    if _collection is not None:
        return _collection

    # Encode first: an offline rebuild must not destroy the old on-disk index.
    ids = [chunk["id"] for chunk in _chunks]
    texts = [chunk["text"] for chunk in _chunks]
    vectors = embed(texts)
    metadatas = [_chroma_metadata(chunk) for chunk in _chunks]
    try:
        _client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    _collection = _client.create_collection(
        name=COLLECTION_NAME,
        metadata={
            "hnsw:space": "cosine",
            "corpus_fingerprint": _corpus_fingerprint,
            "embedding_model": MODEL_NAME,
            "index_version": INDEX_VERSION,
        },
    )
    for start in range(0, len(ids), 5000):
        _collection.add(
            ids=ids[start : start + 5000],
            documents=texts[start : start + 5000],
            embeddings=vectors[start : start + 5000].tolist(),
            metadatas=metadatas[start : start + 5000],
        )
    return _collection


def ensure_initialized():
    if not _chunks:
        initialize()


def _eligible_indices(province: Optional[str]) -> list[int]:
    normalised = _normalise_province(province)
    return [
        index
        for index, chunk in enumerate(_chunks)
        if normalised is None
        or _chunk_province(chunk) is None
        or _chunk_province(chunk) == normalised
    ]


def _bm25_search(query: str, eligible_indices: list[int], k: int = 20) -> list[int]:
    """Score only eligible chunks, so province filtering precedes ranking."""
    scores = _bm25.get_scores(query.lower().split())
    ranked = sorted(eligible_indices, key=lambda index: scores[index], reverse=True)
    return ranked[:k]


def _chroma_where(province: Optional[str]) -> Optional[dict]:
    normalised = _normalise_province(province)
    if normalised is None:
        return None
    return {"$or": [{"scope": "federal"}, {"province": normalised}]}


def _vector_search(query: str, province: Optional[str], k: int = 20) -> list[int]:
    collection = _build_vector_index()
    result = collection.query(
        query_embeddings=[embed_query(query).tolist()],
        n_results=k,
        where=_chroma_where(province),
        include=[],
    )
    id_to_index = {chunk["id"]: index for index, chunk in enumerate(_chunks)}
    return [id_to_index[chunk_id] for chunk_id in result["ids"][0]]


def _rrf(bm25_indices: list[int], vector_indices: list[int]) -> list[int]:
    scores: dict[int, float] = {}
    for rank, index in enumerate(bm25_indices, start=1):
        scores[index] = scores.get(index, 0.0) + 1.0 / (RRF_K + rank)
    for rank, index in enumerate(vector_indices, start=1):
        scores[index] = scores.get(index, 0.0) + 1.0 / (RRF_K + rank)
    return sorted(scores, key=scores.get, reverse=True)


def _extract_section_ref(query: str) -> Optional[tuple[str, str]]:
    import re

    article = re.search(
        r"(?:article|art\.?|آرٹیکل)\s*(\d+[A-Z]?(?:-[A-Z])?)", query, re.I | re.UNICODE
    )
    if article:
        return "article", article.group(1).upper()
    section = re.search(
        r"(?:section|sec\.?|dafa|dafah|dhara|dharaa|دفعہ)\s*(\d+[A-Z]?(?:-[A-Z])?)",
        query,
        re.I | re.UNICODE,
    )
    if section:
        return "section", section.group(1).upper()
    return None


def _exact_lookup(ref_type: str, ref_number: str, province: Optional[str]) -> list[dict]:
    eligible = set(_eligible_indices(province))
    results = []
    for index, chunk in enumerate(_chunks):
        if index not in eligible:
            continue
        metadata = chunk["metadata"]
        key = "section" if ref_type == "section" else "Article"
        fallback = "section_number" if ref_type == "section" else "Article_number"
        value = metadata.get(key) or metadata.get(fallback) or ""
        if str(value).upper() == ref_number:
            results.append(chunk)
    return results


def search(
    query: str,
    k: int = 5,
    province: Optional[str] = None,
    use_exact: bool = True,
    use_reranker: bool = True,
    normalize: bool = True,
) -> tuple[list[dict], dict, str]:
    """Run direct lookup or metadata-filtered hybrid retrieval with query normalization."""
    ensure_initialized()
    timings: dict[str, float | str] = {}
    started = time.perf_counter()
    if use_exact:
        reference = _extract_section_ref(query)
        if reference:
            exact = _exact_lookup(*reference, province)
            timings["exact_ms"] = round((time.perf_counter() - started) * 1000, 1)
            if exact:
                timings["total_ms"] = timings["exact_ms"]
                return exact[:k], timings, query
    timings["exact_ms"] = round((time.perf_counter() - started) * 1000, 1)

    search_query = query
    if normalize:
        started = time.perf_counter()
        search_query, _ = normalize_query(query)
        timings["normalise_ms"] = round((time.perf_counter() - started) * 1000, 1)

    eligible_indices = _eligible_indices(province)
    started = time.perf_counter()
    bm25_indices = _bm25_search(search_query, eligible_indices, k=20)
    timings["bm25_ms"] = round((time.perf_counter() - started) * 1000, 1)
    started = time.perf_counter()
    vector_indices = _vector_search(search_query, province, k=20)
    timings["vector_ms"] = round((time.perf_counter() - started) * 1000, 1)
    started = time.perf_counter()
    fused = _rrf(bm25_indices, vector_indices)
    timings["rrf_ms"] = round((time.perf_counter() - started) * 1000, 1)
    candidates = [_chunks[index] for index in fused[:20]]
    started = time.perf_counter()
    if use_reranker and candidates:
        try:
            top_chunks = rerank(search_query, candidates, top_k=k)
            timings["rerank_status"] = "ok"
        except ModelUnavailableError:
            # Degrade gracefully when only the reranker is unavailable.
            top_chunks = candidates[:k]
            timings["rerank_status"] = "fallback_no_model"
    else:
        top_chunks = candidates[:k]
        timings["rerank_status"] = "skipped"
    timings["rerank_ms"] = round((time.perf_counter() - started) * 1000, 1)
    timings["total_ms"] = round(
        sum(value for value in timings.values() if isinstance(value, (int, float))),
        1,
    )
    return top_chunks, timings, search_query
