# Retrieval stack design

## Scope

Improve the FastAPI retrieval service while retaining the existing local Chroma
deployment and legal corpus. Generation, prompting, Roman-Urdu rewriting, and
voice are outside this change.

## Decisions

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| One metadata-aware Chroma collection | Python-only filtering; a collection per province | It preserves correct pre-ranking filtering without duplicating federal chunks. |
| Fingerprint the corpus and embedding model | Reuse any non-empty collection | A persistent index must never silently represent a different corpus or model. |
| E5 query/passage prefixes | Encode all text identically | This is the model's retrieval convention. |
| Multilingual BGE reranker | English MS MARCO reranker | The application must support Urdu and Roman-Urdu queries. |
| Lazy model loading and HTTP 503 on unavailable models | Startup downloads; uncaught failures | Exact lookup remains available and semantic failures are actionable. |

## Retrieval flow

1. Load and validate chunks, calculate a fingerprint, and create or rebuild the
   Chroma collection when the fingerprint or embedding model changes.
2. Persist retrieval metadata, including province scope, in Chroma.
3. For provincial queries, restrict both BM25 and Chroma candidates to that
   province plus federal law before ranking.
4. Fuse the two ranked lists using reciprocal-rank fusion, then rerank the
   candidates with a multilingual cross-encoder.
5. Keep direct section/article lookup model-free. Return an actionable HTTP 503
   when a required local model cannot be loaded.

## Verification

Tests use small synthetic chunks and mocked model calls. They cover Chroma
metadata preparation, corpus fingerprinting, pre-ranking province filtering,
E5 prefixes, and service-unavailable behavior.
