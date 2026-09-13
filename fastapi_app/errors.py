"""Domain exceptions exposed by the retrieval service."""


class ModelUnavailableError(RuntimeError):
    """A locally required embedding or reranking model could not be loaded."""


class DocumentExtractionError(RuntimeError):
    """A document's text could not be extracted (unsupported format, corrupt file, or OCR unavailable)."""

