"""Domain exceptions exposed by the retrieval service."""


class ModelUnavailableError(RuntimeError):
    """A locally required embedding or reranking model could not be loaded."""

