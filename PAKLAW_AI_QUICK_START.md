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