"""
Embeddings service using multilingual-e5-small.
Single embed() function — swap model here if needed.
"""

from sentence_transformers import SentenceTransformer
import numpy as np

from .errors import ModelUnavailableError

MODEL_NAME = "intfloat/multilingual-e5-small"

# Loaded once at startup, reused for all requests
_model = None


def get_model() -> SentenceTransformer:
    """Load the embedding model (lazy init, called once)."""
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer(MODEL_NAME)
        except Exception as exc:
            # Out of memory and not-yet-downloaded look identical from here,
            # but they need opposite fixes. Windows reports low memory as
            # "paging file is too small" (OSError 1455) — saying "check your
            # internet" for that sends people looking in the wrong place.
            if "paging file" in str(exc) or isinstance(exc, MemoryError):
                hint = (
                    "Not enough free memory to load it — this model needs roughly 3 GB free. "
                    "Close other applications and retry."
                )
            else:
                hint = "Connect to the internet once to cache it locally, then retry."
            raise ModelUnavailableError(
                f"Could not load embedding model '{MODEL_NAME}'. {hint}"
            ) from exc
    return _model


def embed(texts: list[str]) -> np.ndarray:
    """Embed corpus passages using multilingual-E5's required prefix."""
    model = get_model()
    passages = [f"passage: {text}" for text in texts]
    return model.encode(passages, convert_to_numpy=True)


def embed_query(query: str) -> np.ndarray:
    """Embed one retrieval query using multilingual-E5's required prefix."""
    model = get_model()
    return model.encode([f"query: {query}"], convert_to_numpy=True)[0]