# Team Briefing — Document Analysis & Citation Verifier

*A script for explaining this work to the team. Lines in **quotes** are things you can say out loud. Everything else is a note for you.*

**Time needed:** about 10 minutes, plus questions.
**Full technical detail:** `docs/document-analysis-handoff.md`

---

## 1. Start here — the one-minute version

> "I finished two things: the document analysis endpoint, and the citation verifier.
>
> Document analysis means someone uploads a rent agreement or a contract as a PDF, and gets back a plain-language summary, a list of clauses with the risky ones flagged, the deadlines the document puts on them, and a note about what personal information we hid before sending it to the AI.
>
> The citation verifier is the safety check. If the AI mentions a law section that we did not actually retrieve, we do not show that answer at all. It now runs on the chat feature too, not just on documents."

**If someone asks which plan tasks these are:** Phase 2 task 1 (`/rag/query` plus `/rag/analyze-document`) and Phase 1 task 5 (the hallucination guard).

**If you want to show proof rather than describe it:** two real runs are saved in `docs/evidence/`. Open `sample-analysis-output.json`.

> "I ran the same tenancy agreement twice. Both times it classified all five clauses identically and verified every citation. It found two separate problems: the rent increase is 15 percent where the law caps it at 10, and the landlord clause claims they can evict without going to court, which the ordinance does not allow." 

---

## 2. How document analysis works — walk them through it

> "The important thing is that I did not build a new system for this. It reuses what we already have.
>
> Our chat feature already knows how to take a question, find the relevant law, and answer with a citation. Document analysis just gives it a different input — instead of a typed question, every clause of the uploaded document becomes the question. That is why the plan said this would only take about two days."

Then walk through the steps:

> "Step one, we read the text out of the PDF. This only works if the PDF has real text in it. If someone scans or photographs a paper document, there is only a picture of text, nothing to read — so we reject it and say why. The plan decided we would not do image reading, so we say so honestly instead of half-doing it.
>
> Step two, we hide the personal information. Before anything goes to the AI, we find CNIC numbers, phone numbers and email addresses by pattern — a CNIC is five digits, dash, seven digits, dash, one digit. We count how many we hid, so the screen can say exactly what was masked. We do not detect names or addresses. This step runs first on purpose, so private data never reaches the AI at all.
>
> Step three, we split the document into clauses using the numbering — one, two, three. If a document has no numbering, we fall back to splitting it into small groups of sentences.
>
> Step four, for each clause we search our law corpus for whatever is relevant. This is the same search the chat uses. It runs on our own machine, so it costs nothing.
>
> Step five, we ask the AI to judge that clause against the law we found. It answers ok, warn, or flag, with one sentence saying why, plus any deadline the clause creates.
>
> Step six is the safety check, and this is the part I care most about. AI models sometimes invent section numbers that sound completely real. So we pull every Section reference out of the AI's explanation and check it against the law we actually retrieved. If it does not match, we force that clause to flagged, no matter how confident the AI sounded.
>
> Step seven, one more AI call writes the three-to-five sentence summary."

**Show the real example if you have it on screen:** the sample tenancy agreement comes back with the 15 percent rent increase flagged, because it is higher than the 10 percent ceiling in the Sindh Rented Premises Ordinance.

---

## 3. What changed for other people — say this to the right person

### To whoever is doing the Express routes (Phase 2 task 3)

> "The Python endpoint is done and working, so you are unblocked. It is `POST /rag/analyze-document`. You send it the file, it sends back summary, flagged clauses, obligations, and the masking counts. The exact field names are in the handoff doc, so you can build the Documents schema to match and nothing needs renaming later.
>
> Two things the plan asks for on your side: multer has to allow PDF only and cap the size at 10 MB, the same as mine. And when a file is rejected, my endpoint already returns a clear message — please pass that message through instead of replacing it with a generic error."

### To whoever is doing the document upload screen (Phase 3 task 3)

> "The screen is already designed, so this is rewiring, not building from scratch. But the text on it needs fixing — it currently promises PDF, DOCX, JPG and 40 MB. It is PDF only, 10 MB, and scanned pages do not work.
>
> The masking badge matters most. The plan says call it basic masking, never PII protection, and say plainly that we catch CNIC, phone and email but not names or addresses. If we overclaim there and someone uploads something sensitive believing it is fully anonymous, that is a real problem — and it is exactly the kind of thing that gets picked apart in a viva."

### To whoever is doing the chat routes or chat UI

> "Heads up — `/rag/query` behaves a little differently now, but nothing you built will break. I only added fields.
>
> Two changes. First, the answer can now be a refusal: if the AI cites law we did not retrieve, we withhold the answer and send a message saying so. The sources still come back, so please keep showing the sources rather than an empty box. Second, it no longer crashes with a 500 when the AI fails — it returns the sources with an honest note instead."

### To whoever is doing the evaluation dashboard (task 6)

> "Panel 2 and Panel 3 numbers now come straight out of the `/rag/query` response, so you do not need anything extra from me.
>
> `citations_verified` tells you whether every citation checked out. `verifier_blocked` being true is your count of answers blocked by the verifier. `unsupported_claims` gives you the sentences that had almost no overlap with the retrieved law. And `timings.verify_ms` is the verification latency for Panel 4 — about 0.2 milliseconds, well inside the 100 millisecond budget."

### To whoever owns the chunker (Phase 1 task 2)

> "Small thing, not urgent — the chunker script itself is not in the repo. The chunk files are there so everything runs fine, but the code that produced them is only on your machine. Worth committing, because if we ever need to fix the reversed Urdu characters or add a document, nobody else can rebuild the corpus. It is also your interview story, and right now it is not in the project."

---

## 4. Be honest about these — do not skip this part

> "Four things I want to be upfront about.
>
> One. Our citation check confirms a cited section exists in the law we retrieved. It does not check that the AI's explanation correctly describes what that section actually says — that would need another AI call. So we should say we verify that citations are real and grounded, not that we verify the explanation is correct.
>
> Two. The reranker is very slow on our machines — about 15 seconds per query, where the plan budgeted under one second. The plan targets under 6 seconds end to end, so we are over. We should report the real number rather than hide it.
>
> Three. The reranker also crashes the whole server when the machine is low on memory. It is not a normal error we can catch — the program just dies. If the API suddenly stops responding, check free memory first.
>
> Four. Our masking is pattern matching only. It catches CNIC, phone and email reliably. It does not catch names or addresses, and we should never say that it does."

**Why say all this out loud:** the plan's final section makes the point that knowing the limits of your own measurement is rarer, and more impressive, than building the thing. Being vague here is what gets punished in a viva.

---

## 5. Questions you might get, and honest answers

**"Why didn't you just reuse the existing chunker?"**

> "The existing one splits legal codes by Act and Section, because that is how laws are written. An uploaded rent agreement has no sections — it has numbered clauses. So I split by clause number instead, with a fallback for documents that are not numbered. The retrieval and the verifier are reused exactly as they are, so we did not build a second pipeline, which is what the plan warned against."

**"Is the PII masking safe?"**

> "It reliably catches CNIC numbers, phone numbers and email addresses, and it runs before anything reaches the AI. It does not catch names or addresses at all. That is exactly why the plan says to label it basic masking and not PII protection."

**"How do you know the citation verifier actually works?"**

> "I tested it by forcing the AI to return a made-up citation — Section 9999 — while claiming the clause was fine. The system overrode it and marked the clause as flagged. I also tested the opposite case, where an answer repeats a cross-reference that genuinely appears in the retrieved law, and confirmed that one is not wrongly blocked."

**"How much does each upload cost us in API calls?"**

> "Our free tier only allows twenty Gemini requests per day for the whole project, which is very tight. So instead of asking about one clause at a time, we send eight clauses together in one request. A twenty-clause contract then costs four requests instead of twenty-one. Without that, one realistic contract would use up more than our entire daily allowance and the feature simply would not work."

**"What happened with the API quota?"** *(worth telling — it is a good engineering story)*

> "Our free tier only allows twenty requests per day, and it turned out to be per model, not just per project. So two things: I batched the clauses, which cut a document from twenty-one requests down to four, and I made the model name a setting in the .env file instead of hard-coded. When we ran out on one model, we switched to another in about ten seconds with no code change. The plan says every AI call should sit behind one swappable function exactly so a provider change takes under a day — this is that working in practice."

**"What if the Gemini quota runs out during the demo?"**

> "Then the clauses come back saying analysis failed, while the masking and clause splitting still work, and the chat returns the sources without a generated answer. Nothing crashes. But we should do one real run beforehand and keep the output saved as a backup."

**"What is left before this feature is finished?"**

> "On the Python side, nothing — both endpoints work. What is left is the Express route to receive the upload and save it, and the screen to display the result. Both are already written down in the handoff doc."

---

## 6. If you are demoing it live

1. Start the server: `python -m uvicorn fastapi_app.main:app --port 8000`
2. Open `http://127.0.0.1:8000/docs` in a browser
3. Open `POST /rag/analyze-document`, click **Try it out**, choose `sample_tenancy_agreement.pdf`, click **Execute**
4. It takes a minute or two — clauses go to the AI in batches of eight

**Point at these three things in the result:**

- `masking_applied` — *"this proves the personal data was hidden before the AI ever saw it"*
- the clause with `"risk": "flag"` — *"it found the rent increase is above the legal ceiling, and it cites the actual ordinance"*
- `citations_verified` — *"and this confirms that citation is real, not invented"*

**Backup if the quota is exhausted at demo time:** open `docs/evidence/sample-analysis-output.json` instead — it is a real saved run of exactly this document, so you can walk through the same three points from the file.

**If it fails with every clause saying "analysis failed":** that is the daily quota, not a bug. Change `GEMINI_MODEL` in `.env` to another model and restart — the limit is per model, so a different one usually has a fresh allowance.
