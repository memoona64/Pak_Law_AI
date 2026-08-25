# **PakLaw AI — Detailed Explanation**

## **What Is This System?**

Think of this as a **super-smart legal search engine** specifically for Pakistani laws. It helps lawyers, students, or anyone find the right legal sections quickly without reading hundreds of pages.

**Simple analogy**: Imagine a massive law library with 1001 legal documents. This system is like a librarian who can find the right information in seconds using different search methods.

---

## **The Problem It Solves**

You have a legal question, and you need to find the relevant law. For example:

- A lawyer needs to find **"What does Section 302 say about punishment?"**
- A student asks **"What is the procedure for eviction in Sindh?"**
- Someone wants to know **"What does Article 25 of the Constitution say?"**

**The challenge**: Pakistani laws are spread across multiple codes (Constitution, PPC, CrPC, MFLO, Sindh laws), and finding the right section manually takes time.

---

## **How This System Helps**

You type a question, and the system finds the most relevant law sections using **three clever methods**:

### **Method 1: Keyword Search (BM25)**
- **How it works**: Looks for specific words you type inside the laws
- **Example**: You type `"eviction"` → System finds all laws mentioning "eviction"
- **Best for**: Finding laws by specific terms

### **Method 2: Meaning Search (Vector/Chroma)**
- **How it works**: Understands the *meaning* of your question, even if you use different words
- **Example**: You type `"getting kicked out"` → System understands you mean "eviction" even without that word
- **Best for**: Conceptual questions where you describe the topic

### **Method 3: The Shortcut (Exact Lookup)**
- **How it works**: If you mention a specific section or article number, it goes directly there
- **Speed**: About **0 milliseconds** (skips all searching)
- **Example**: `"Section 302 PPC"` → Instant result, no searching needed

---

## **Province Filtering**

Pakistan has **federal laws** (apply to whole country) and **provincial laws** (only apply to that province).

- **`province=None`**: Searches **all Pakistan** (federal laws only)
- **`province="Sindh"`**: Searches **Sindh province laws + federal laws**

**Why important?** If you're asking about Sindh-specific laws (like Sindh rental laws), you filter by `"Sindh"` to get only those results.

---

## **The Reranker (Smart Re-ranking)**

After the two search methods find candidates, a **teacher model** re-ranks them by relevance. It's like:

1. **First pass**: Two search methods find 20 potential results
2. **Teacher review**: The cross-encoder teacher looks at each and says "this is better, this is worse"
3. **Final top 5**: Only the best 5 are returned

**Result**: More accurate, relevant results.

---

## **Urdu & Roman Urdu Support**

The system understands legal questions in multiple languages:

| Language | Example Query |
|----------|--------------|
| **Roman Urdu** | `"talaq ka procedure kya hai"` |
| **Roman Urdu (section)** | `"dafah 302"` or `"dhara 302 PPC"` |
| **Urdu script** | Works too |
| **English** | `"Section 302 PPC"`, `"eviction notice"` |

**Note**: The keyword search splits text by spaces, so pure Urdu might not match perfectly by keywords alone, but the meaning search works fine for all languages.

---

## **How to Use It (Step-by-Step)**

### **Step 1: Start the Server**

```bash
cd paklaw-ai
uvicorn fastapi_app.main:app --host 127.0.0.1 --port 8000
```

**Server starts at**: http://127.0.0.1:8000

### **Step 2: Test With These Examples**

**1. Exact-citation shortcut (fastest)**:
```bash
curl -X POST http://127.0.0.1:8000/rag/query \
  -d '{"query":"Section 302 PPC"}'
```
**Result**: Returns Section 302 of Pakistan Penal Code instantly (~0ms)

**2. With province filter**:
```bash
curl -X POST http://127.0.0.1:8000/rag/query \
  -d '{"query":"eviction notice","province":"Sindh"}'
```
**Result**: Returns Sindh rental/eviction laws (chunk from Sindh Rented Premises Ordinance 1979)

**3. General question (talaq)**:
```bash
curl -X POST http://127.0.0.1:8000/rag/query \
  -d '{"query":"talaq ka procedure kya hai"}'
```
**Result**: Returns talaq procedure from Islamic family law

**4. Article lookup**:
```bash
curl -X POST http://127.0.0.1:8000/rag/query \
  -d '{"query":"Article 25 constitution"}'
```
**Result**: Returns Article 25 of the Constitution of Pakistan

### **Step 3: Run the Tests**

```bash
cd paklaw-ai
python test_fastapi.py
```

**Expected output**: `5/5 test queries passing`

This tests:
1. Health check 
2. Section 302 exact lookup 
3. Eviction + Sindh province 
4. Article 25 exact lookup 
5. Talaq procedure query 

---

## **Key Files (What Does What?)**

| File | Simple Description |
|------|-------------------|
| `main.py` | **The front desk** — Receives your question, calls the searchers, gives you answers |
| `search_service.py` | **The search helper** — Does the actual looking up using keywords + meaning |
| `embeddings.py` | **The scanner** — Turns law text into numbers the computer can compare |
| `reranker.py` | **The teacher** — Reviews search results and re-ranks them by relevance |
| `errors.py` | **The "closed" sign** — If the scanners can't start, says "come back later" |
| `test_fastapi.py` | **The practice test** — Runs 5 queries to make sure everything works |
| `test_retrieval.py` | **The unit tests** — Runs 4 smaller tests for specific features |

---

## **What You Get Back (For Each Query)**

The system returns:

1. **Top 5 relevant law chunks** (each has: text, metadata about which act/section/province)
2. **Timing breakdown** (how long each step took):
   - `exact_ms`: Shortcut time (usually ~0ms if section/article mentioned)
   - `bm25_ms`: Keyword search time
   - `vector_ms`: Meaning search time
   - `rerank_ms`: Teacher re-ranking time
   - `total_ms`: Total time for everything

3. **Province filter shown** (if you specified one)

---

## **For Beginners: Getting Started Checklist**

- [ ] **Start the server**: `uvicorn fastapi_app.main:app --host 127.0.0.1 --port 8000`
- [ ] **Test health**: Open `http://127.0.0.1:8000/health` in your browser
- [ ] **Test exact shortcut**: Try the query `Section 302 PPC`
- [ ] **Test province filter**: Try `eviction notice` + `province=Sindh`
- [ ] **Run the tests**: `python test_fastapi.py` (should say **5/5 passing**)
- [ ] **Ask your own question**: Use the POST `/rag/query` endpoint with your query

---

## **Summary in Simple Terms**

This system is a **legal search backend** that:

1. **Takes** your legal question (in English, Roman Urdu, or Urdu)
2. **Searches** using two methods: keywords + meaning
3. **Fuses** the results and re-ranks them
4. **Shortcuts** on exact section/article references (instant, ~0ms)
5. **Filters** by province (federal vs. Sindh) if you specify
6. **Returns** top 5 relevant law sections + timing breakdown
7. **Is ready** for the next team member to build generation features on top

**It's the retrieval foundation** — the next stage (writing answers using LLMs) will build on top of this.

---

## **What It Does NOT Do**

*(Per the design doc, these are out of scope)*

- **Generate text/answers** — It only finds and returns law chunks
- **Build prompts** for LLMs
- **Roman Urdu rewriting** of queries
- **Voice input/output** (speech recognition/text-to-speech)

**These features may be added in Week 6** by another team member.

---

## **Common Questions**

**Q: Do I need to know programming to use this?**
A: No! You can test it with `curl` commands or the test script. Programming is only needed if you want to integrate it into your own app.

**Q: Can I search in Urdu?**
A: Yes! The system supports Roman Urdu (`"talaq ka procedure kya hai"`) and Urdu script. Keyword search works best with Roman Urdu (which uses spaces), while meaning search works for all languages.

**Q: What if I don't specify a province?**
A: It searches federal laws only (all Pakistan). Add `"province": "Sindh"` to also include Sindh provincial laws.

**Q: How fast is it?**
A: Very fast. Exact-citation shortcuts take ~0ms. Full pipeline (with reranker) typically takes under 1 second.

**Q: What if the models fail to load?**
A: The system returns HTTP 503 (Service Unavailable) with a helpful message. This is graceful degradation — the exact-citation shortcut still works if only one model is unavailable.

---

**Status**: Production-ready, 5/5 test queries passing
