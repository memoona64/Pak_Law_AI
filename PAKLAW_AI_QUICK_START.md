# **PakLaw AI — Quick Start**

## **Overview**
Hybrid legal search backend for Pakistani laws (BM25 + Chroma vector + RRF fusion + cross-encoder rerank + exact-citation shortcut).

---

## **Running the Server**

```bash
cd paklaw-ai
uvicorn fastapi_app.main:app --host 127.0.0.1 --port 8000
```

**Server**: http://127.0.0.1:8000

---

## **API Endpoints**

### **POST `/rag/query`**
```json
{
  "query": "Section 302 PPC",
  "province": "Sindh",
  "use_reranker": true
}
```

### **GET `/health`**
```bash
curl http://127.0.0.1:8000/health
# → {"status":"ok","chunks_loaded":1001}
```

### **GET `/`**
Basic info + docs links.

---

## **Test It**

```bash
python test_fastapi.py
# → 5/5 test queries passing
```

---

## **Features**

- BM25 keyword + Chroma vector search
- RRF fusion (K=60) + cross-encoder rerank
- Exact-citation shortcut (`Section 302`, `Article 25`)
- Province filtering (`None` / `Sindh`)
- HTTP 503 if models unavailable
- 1001 section-aware legal chunks

---

## **Design Doc**

Generation, prompting, Roman-Urdu rewriting, and voice are out of scope.

---

## **Troubleshooting: Swagger "Failed to fetch"**

If Swagger UI shows:

- Failed to fetch
- Possible Reasons: CORS / Network Failure / URL scheme must be "http" or "https"

Use this checklist:

1. Open docs using the server URL (not a local file):
  - http://127.0.0.1:8000/docs
  - or http://localhost:8000/docs (use one host consistently)
2. Confirm backend is running:
  - http://127.0.0.1:8000/health
3. Make sure you are not mixing hosts/schemes/ports:
  - avoid opening docs at localhost while API calls target 127.0.0.1 (or vice versa)
  - avoid mixing http and https unless your API is actually served on https
4. If browser cache is stale, hard refresh docs (Ctrl+F5).
5. If calling from a frontend on another origin, set `ALLOWED_ORIGINS` (comma-separated) before starting the server.

If /health works and /rag/query returns JSON, the backend is fine and the error is usually a browser/docs context issue.