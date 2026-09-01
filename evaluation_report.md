# PakLaw AI - Testing & Evaluation Report

## 1. Objective

The purpose of this evaluation was to test the retrieval and answer-generation
behavior of PakLaw AI using English, Roman Urdu, exact-section, natural-language,
and out-of-scope queries.

---

## 2. Retrieval Evaluation

A preliminary retrieval evaluation was performed using questions with known
expected legal sections.

### Results

- Evaluated retrieval queries: 5
- Passed: 4
- Failed: 1
- Preliminary Recall@5: 80.0%
- P50 retrieval latency: 821.6 ms
- P95 retrieval latency: 894.9 ms

A retrieval test was considered successful when the expected Act and Section
appeared within the top 5 retrieved chunks.

---

## 3. Out-of-Scope / Refusal Testing

10 non-legal questions were tested, including questions about food, weather,
sports, programming, movies, and general knowledge.

Results:

- Out-of-scope questions tested: 10
- Correct refusals: 10
- Preliminary refusal rate: 100%

The model consistently refused to answer unrelated questions using unsupported
legal information.

---

## 4. Manual Answer and Citation Evaluation

Three legal questions were manually reviewed:

1. Theft - PPC Section 379
2. Qatl-i-amd - PPC Section 302
3. Cheating - PPC Section 417

Results:

- Relevant answers: 3/3
- Expected legal sections cited: 3/3
- Grounded answers: 3/3
- Manual sample citation accuracy: 100%

These results represent a small manually reviewed sample and should not be
interpreted as the final system-wide citation accuracy.

---

## 5. Issues Identified

### Roman Urdu Query Normalization

The query:

`qatl ki saza kya hai?`

was normalized to:

`Punishment`

Important semantic information was lost during normalization. As a result,
PPC Section 302 did not appear in the top 5 results.

### CrPC Corpus Coverage

CrPC cleaned text is present in the repository, but CrPC chunks are not present
in the currently indexed chunk corpus.

Therefore, the Roman Urdu FIR query targeting CrPC Section 154 could not be
fairly included in the retrieval Recall@5 calculation.

### Retrieval Ranking

For some natural-language queries, the correct section was retrieved within
the top 5 but was not ranked first.

For example, PPC Section 379 and PPC Section 417 appeared at rank 2 in later
manual answer-generation tests.

### API Integration

The generation component was tested successfully using the existing
`generate_answer()` function. However, in the tested branch, the `/rag/query`
endpoint returns retrieval information and is not currently wired to return
the generated answer.

---

## 6. Conclusion

The preliminary evaluation shows that PakLaw AI can retrieve relevant PPC
sections and generate grounded legal answers for the tested examples.

The system also demonstrated strong refusal behavior on the tested
out-of-scope questions.

The main issues identified during evaluation were Roman Urdu query
normalization, missing indexed CrPC chunks, and retrieval ranking quality.

These are preliminary results based on a small evaluation sample. A larger
120+ question team evaluation set should be used before reporting final
system-wide metrics.
