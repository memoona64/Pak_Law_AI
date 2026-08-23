"""
Reranker service using cross-encoder.
Takes query + candidate chunks, rescores them, returns top K.
"""

from sentence_transformers import CrossEncoder

from .errors import ModelUnavailableError

RERANKER_MODEL = "BAAI/bge-reranker-v2-m3"

_reranker = None


def get_reranker() -> CrossEncoder:
    """Load the reranker model (lazy init, called once)."""
    global _reranker
    if _reranker is None:
        try:
            _reranker = CrossEncoder(RERANKER_MODEL)
        except Exception as exc:
            raise ModelUnavailableError(
                f"Could not load reranker model '{RERANKER_MODEL}'. "
                "Connect to the internet once to cache it locally, then retry."
            ) from exc
    return _reranker


def rerank(query: str, chunks: list[dict], top_k: int = 5) -> list[dict]:
    """
    Rerank chunks by relevance to query.

    Args:
        query: user question
        chunks: list of chunk dicts (must have "text" key)
        top_k: how many to return after reranking

    Returns:
        top_k chunks, sorted by relevance score
    """
    if not chunks:
        return []

    reranker = get_reranker()

    # Build (query, text) pairs
    pairs = [(query, chunk["text"]) for chunk in chunks]

    # Score each pair
    scores = reranker.predict(pairs)

    # Sort by score descending
    scored_chunks = list(zip(scores, chunks))
    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    # Return top K with score added
    results = []
    for score, chunk in scored_chunks[:top_k]:
        chunk_with_score = {**chunk, "rerank_score": float(score)}
        results.append(chunk_with_score)

    return results
