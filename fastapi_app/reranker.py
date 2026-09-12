"""
Reranker service using cross-encoder.
Takes query + candidate chunks, rescores them, returns top K.
"""

import os
import threading

from sentence_transformers import CrossEncoder

from .errors import ModelUnavailableError

RERANKER_MODEL = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")

# Without this the model defaults to its own maximum (8192 tokens for
# bge-reranker-v2-m3). Cross-encoder cost grows superlinearly with sequence
# length, so a single long chunk in the candidate set dominates the whole
# batch — which is why rerank time swung between 20s and 42s depending on
# which chunks a query happened to retrieve. The corpus median chunk is ~128
# tokens and p90 is ~400, so 512 leaves over 90% of chunks untruncated, and
# judging relevance rarely needs more than the opening of a section.
RERANKER_MAX_LENGTH = int(os.getenv("RERANKER_MAX_LENGTH", "512"))

_reranker = None
# Guards first-load so two concurrent first requests can't both start
# loading the model at once (mirrors search_service.py's _index_lock).
_reranker_lock = threading.Lock()


def get_reranker() -> CrossEncoder:
    """Load the reranker model (lazy init, called once)."""
    global _reranker
    if _reranker is None:
        with _reranker_lock:
            if _reranker is None:
                try:
                    _reranker = CrossEncoder(RERANKER_MODEL, max_length=RERANKER_MAX_LENGTH)
                except Exception as exc:
                    raise ModelUnavailableError(
                        f"Could not load reranker model '{RERANKER_MODEL}': {exc}"
                    ) from exc
    return _reranker


def rerank(query: str, chunks: list[dict], top_k: int = 5) -> list[dict]:
    if not chunks:
        return []

    reranker = get_reranker()

    pairs = []

    for chunk in chunks:
        metadata = chunk.get("metadata", {})

        # Not every corpus file uses the same metadata key for a chunk's
        # title (e.g. MFLO/SRPO use plain "title", the Constitution uses
        # "article_title") - fall back the same way search_service.py does,
        # so the reranker never sees a blank title for those chunks.
        title = (
            metadata.get("section_title")
            or metadata.get("article_title")
            or metadata.get("title")
            or ""
        )

        document = (
            f"Act: {metadata.get('act', '')}; "
            f"Section: {metadata.get('section', '')}; "
            f"Short Code: {metadata.get('short_code', '')}; "
            f"Title: {title}; "
            f"Text: {chunk.get('text', '')}"
        )

        pairs.append((query, document))

    try:
        scores = reranker.predict(pairs, batch_size=4)
    except Exception as exc:
        raise ModelUnavailableError(
            f"Reranker model '{RERANKER_MODEL}' failed while scoring candidates: {exc}"
        ) from exc

    scored_chunks = list(zip(scores, chunks))
    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    results = []

    for score, chunk in scored_chunks[:top_k]:
        chunk_with_score = {**chunk, "rerank_score": float(score)}
        results.append(chunk_with_score)

    return results