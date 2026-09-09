"""
Reranker service using cross-encoder.
Takes query + candidate chunks, rescores them, returns top K.
"""

import os

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
RERANKER_MAX_LENGTH = int(os.getenv("RERANKER_MAX_LENGTH", "256"))

_reranker = None


def get_reranker() -> CrossEncoder:
    """Load the reranker model (lazy init, called once)."""
    global _reranker
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

        document = (
            f"Act: {metadata.get('act', '')}; "
            f"Section: {metadata.get('section', '')}; "
            f"Short Code: {metadata.get('short_code', '')}; "
            f"Title: {metadata.get('section_title', '')}; "
            f"Text: {chunk.get('text', '')}"
        )

        pairs.append((query, document))

    scores = reranker.predict(pairs, batch_size=4)
    

    scored_chunks = list(zip(scores, chunks))
    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    results = []

    for score, chunk in scored_chunks[:top_k]:
        chunk_with_score = {**chunk, "rerank_score": float(score)}
        results.append(chunk_with_score)

    return results
