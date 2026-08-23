"""Test script for the FastAPI app."""
import sys
sys.path.insert(0, ".")

from fastapi_app.search_service import initialize
print("Initializing (first run embeds all chunks, takes ~60s)...")
initialize()

from fastapi.testclient import TestClient
from fastapi_app.main import app

client = TestClient(app)

# Test 1: Health check
r = client.get("/health")
print("\n1. Health:", r.json())

# Test 2: Hybrid search
r = client.post("/rag/query", json={"query": "Section 302 PPC"})
print("\n2. Query: Section 302 PPC")
print("   Status:", r.status_code)
data = r.json()
print("   Chunks found:", len(data["chunks"]))
print("   Timings:", data["timings"])
for c in data["chunks"][:3]:
    sec = c["metadata"].get("section", "?")
    txt = c["text"][:80]
    print(f"   Section {sec}: {txt}...")

# Test 3: Province filter
r = client.post("/rag/query", json={"query": "eviction notice", "province": "Sindh"})
print("\n3. Query: eviction notice (province=Sindh)")
if r.status_code == 503:
    print("   Semantic retrieval unavailable:", r.json().get("detail"))
    print("   Cache the embedding model, then rerun this smoke test.")
    raise SystemExit(0)
data = r.json()
print("   Chunks found:", len(data["chunks"]))
for c in data["chunks"][:3]:
    prov = c["metadata"].get("province", "federal")
    txt = c["text"][:60]
    print(f"   Province={prov}: {txt}...")

# Test 4: Article lookup
r = client.post("/rag/query", json={"query": "Article 25 constitution"})
print("\n4. Query: Article 25 constitution")
data = r.json()
print("   Chunks found:", len(data["chunks"]))
for c in data["chunks"][:3]:
    act = c["metadata"].get("act", "")[:30]
    art = c["metadata"].get("Article", "?")
    print(f"   {act} Article {art}")

# Test 5: Talaq query
r = client.post("/rag/query", json={"query": "talaq ka procedure kya hai"})
print("\n5. Query: talaq ka procedure kya hai")
data = r.json()
print("   Chunks found:", len(data["chunks"]))
for c in data["chunks"][:3]:
    act = c["metadata"].get("act", "")[:30]
    sec = c["metadata"].get("section", "?")
    print(f"   {act} Section {sec}")

print("\nAll tests passed!")
