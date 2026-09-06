# PakLaw AI — Testing & Evaluation Report

> **Branch:** `testing-evaluation`  
> **Evaluation set:** 150 labelled questions  
> **Role:** Testing & Evaluation  
> **Purpose:** Measure retrieval quality, multilingual performance, refusal behaviour, latency, and representative generated-answer quality using reproducible evidence.

---

## 1. Executive Snapshot

| Metric | Final measured result |
|---|---:|
| Total evaluation questions | **150** |
| Legal retrieval questions evaluated | **133 / 133** |
| Retrieval execution errors | **0** |
| Recall@5 | **62.41% (83/133)** |
| Recall@10 | **67.67% (90/133)** |
| Retrieval latency P50 | **146.0 ms** |
| Retrieval latency P95 | **379.5 ms** |
| Representative legal manual review | **4/4 PASS** |
| Successful true-OOS generated responses | **6/6 correct refusals** |
| Additional OOS generation cases | **10 not scored — Gemini HTTP 429 quota limit** |

> **Important:** Recall@5 and Recall@10 are retrieval metrics, not overall model accuracy.

---

## 2. Evaluation Scope

The final evaluation dataset contains **150 unique questions** covering:

- exact legal citations
- natural-language English
- Roman Urdu
- Urdu script
- province-sensitive questions
- multi-section questions
- constitutional questions
- family-law questions
- deliberately out-of-scope queries

### Dataset composition

| Dimension | Count |
|---|---:|
| Total questions | 150 |
| Legal | 133 |
| OOS-labelled | 17 |
| Province-sensitive | 22 |
| Multi-section | 14 |
| English | 85 |
| Roman Urdu | 37 |
| Urdu | 28 |

One OOS-labelled item (`OLD06`) was identified during review as a **legal-intent query**, so it was excluded from the true non-legal refusal denominator.

---

## 3. Methodology

### Stage A — Retrieval Evaluation

All **133 legal questions** were evaluated directly against the retrieval service with:

- hybrid retrieval
- exact-citation shortcut enabled
- query normalization enabled
- `k = 10`
- reranker disabled for the bulk benchmark

The bulk benchmark used the no-reranker path to make the 133-question evaluation practical in the Colab environment. This result therefore must **not** be presented as a benchmark of the full reranked production configuration.

For every legal question, the evaluator checked whether the labelled expected legal source appeared:

- within the **Top 5** retrieved results
- within the **Top 10** retrieved results

---

## 4. Overall Retrieval Results

| Metric | Result |
|---|---:|
| Successful retrieval calls | **133 / 133** |
| Errors | **0** |
| Recall@5 | **83 / 133 = 62.41%** |
| Recall@10 | **90 / 133 = 67.67%** |
| P50 retrieval latency | **146.0 ms** |
| P95 retrieval latency | **379.5 ms** |

### Interpretation

The correct labelled source appeared in the first five results for approximately **62.4%** of the evaluated legal questions and within the first ten for approximately **67.7%**.

Increasing the retrieval depth from 5 to 10 therefore recovered additional expected sources, but substantial retrieval gaps remain for some language and query categories.

---

## 5. Performance by Language

| Language | Legal questions | Recall@5 | Recall@10 |
|---|---:|---:|---:|
| English | 71 | **77.46%** | **81.69%** |
| Roman Urdu | 34 | **52.94%** | **52.94%** |
| Urdu | 28 | **35.71%** | **50.00%** |

### Finding

English retrieval performed strongest.

Roman Urdu performance was substantially lower, while Urdu-script retrieval was the weakest at Top 5. Urdu improved when the result window increased to Top 10.

This identifies multilingual query understanding and normalization as a major future improvement area.

---

## 6. Performance by Query Category

| Category | Questions | Recall@5 | Recall@10 |
|---|---:|---:|---:|
| Exact citation | 25 | **100.00%** | **100.00%** |
| Natural English | 25 | **56.00%** | **64.00%** |
| Roman Urdu | 25 | **44.00%** | **44.00%** |
| Urdu script | 20 | **30.00%** | **45.00%** |
| Province-sensitive | 22 | **86.36%** | **90.91%** |
| Multi-section | 5 | **0.00%** | **0.00%** |
| Constitutional | 4 | **100.00%** | **100.00%** |
| Family law | 5 | **40.00%** | **60.00%** |
| Natural-language legacy | 2 | **100.00%** | **100.00%** |

### Important interpretation

The multi-section category uses a **strict criterion**: every expected labelled section must be present in the result window.

Therefore a query retrieving one correct section but missing another expected section is counted as a miss for this category.

### Main strengths

- Exact section/citation lookup
- Constitutional retrieval in the evaluated sample
- Province-sensitive retrieval
- English retrieval compared with multilingual queries

### Main weaknesses

- Urdu-script retrieval
- Roman Urdu retrieval
- strict multi-section retrieval
- family-law coverage/retrieval consistency

---

## 7. Latency Evaluation

For the final no-reranker retrieval benchmark:

- **P50:** 146.0 ms
- **P95:** 379.5 ms

A first-call startup/model-download outlier of approximately **247 seconds** was also observed.

This startup event is documented separately rather than hidden inside the normal warmed retrieval measurements.

Earlier integrated API testing also exposed much higher latency when reranking and generation were executed together. For this reason, retrieval-only benchmark latency and full end-to-end latency must not be treated as the same metric.

---

## 8. Out-of-Scope / Refusal Evaluation

The final dataset contained **17 OOS-labelled questions**.

During dataset review, one item was identified as a legal-intent question and excluded from the true non-legal OOS refusal denominator.

### Final generation attempt

| Item | Result |
|---|---:|
| True non-legal OOS cases selected | 16 |
| Successful Gemini generation calls | 6 |
| Correct refusals | **6 / 6** |
| Observed refusal rate on successful calls | **100.00%** |
| Quota-limited / unscored cases | 10 |

The ten remaining cases returned **HTTP 429 quota errors** before an answer was generated.

They are therefore **not counted as refusal failures**.

### Interpretation

All six OOS questions for which a valid generated response was obtained were correctly refused instead of being answered using unrelated retrieved legal context.

This is an **observed successful-call refusal rate**, not a claim that all sixteen cases completed.

---

## 9. Representative Generated-Answer Review

A small representative legal-answer sample was manually reviewed using existing successful end-to-end generation evidence.

Checks included:

- relevance
- grounding in retrieved legal sources
- citation correctness
- unsupported legal claims
- answer behaviour

| Case | Expected source | Result |
|---|---|---|
| Theft — English | PPC Section 379 | **PASS** |
| Exact citation query | PPC Section 302 | **PASS** |
| Theft — Roman Urdu | PPC Section 379 | **PASS** |
| Cheating | PPC Section 417 | **PASS** |

### Manual sample result

**4 / 4 representative legal answers passed.**

This result applies only to the reviewed sample and **must not be presented as overall system accuracy**.

---

## 10. Citation and Hallucination Interpretation

The evaluation intentionally does **not** claim an automated system-wide hallucination rate.

Hallucination / unsupported legal content requires human interpretation of generated answers.

For the representative manually reviewed legal sample:

- expected citations were used correctly
- answers were grounded in retrieved legal context
- no unsupported legal claim was observed in the reviewed cases

This evidence is reported as a **manual sample finding**, not as a claim of zero hallucination across the full system.

---

## 11. Key Findings

### What worked well

1. **Exact-citation retrieval was highly reliable** in the final benchmark.
2. **Province-sensitive retrieval performed strongly** compared with general multilingual retrieval.
3. The full 133-question legal benchmark completed with **zero retrieval execution errors**.
4. Representative generated legal answers were correctly grounded in the expected legal sources.
5. Successfully generated non-legal OOS responses were correctly refused.

### What needs improvement

1. **Urdu retrieval requires substantial improvement.**
2. **Roman Urdu normalization and retrieval remain inconsistent.**
3. **Multi-section questions are difficult under the strict all-required-sources criterion.**
4. Family-law retrieval requires further tuning.
5. End-to-end generation and reranking can introduce substantial latency.
6. Some retrieved metadata/title fields require data-quality cleanup.
7. Gemini free-tier quota limits affected completion of the final generation-based refusal test.

---

## 12. Integration Finding

During final evaluation on the `testing-evaluation` branch, the checked-out `/rag/query` response exposed retrieval fields but did not return an `answer` field.

Generation source from the team's LLM-generation work was therefore loaded temporarily for generation evaluation.

This is treated as a **branch/integration state finding**, not as a retrieval failure.

The temporary generation files are not part of this evaluator's implementation contribution and should not be committed as Testing & Evaluation work.

---

## 13. Limitations

- The final 133-question retrieval benchmark was run with the **reranker disabled** for practical execution time.
- Results therefore describe the tested bulk retrieval configuration and not a full before/after three-mode retrieval comparison.
- Only a small representative generated-answer sample was manually judged.
- Ten final OOS generation cases could not be evaluated because of Gemini HTTP 429 quota limits.
- The first retrieval call incurred a large model-download/startup cost.
- Multi-section scoring uses a strict all-expected-sources criterion.
- Historical earlier runs are retained as development evidence but are not mixed into the final 133-question reproducible denominator.
- Retrieval Recall must not be described as overall answer accuracy.

---

## 14. Recommended Next Improvements

1. Improve Urdu and Roman Urdu normalization.
2. Add stronger multi-section query decomposition/retrieval.
3. Improve family-law retrieval coverage.
4. Complete branch integration so the deployed `/rag/query` consistently returns generated answers.
5. Add OOS detection before expensive retrieval/reranking/generation where appropriate.
6. Reduce reranker and generation latency.
7. Clean inconsistent legal-source metadata.
8. Run a controlled future comparison of:
   - vector-only retrieval
   - hybrid BM25 + vector + RRF
   - hybrid + cross-encoder reranking

Only measured comparison results should be published.

---

## 15. Evidence Files

The following committed files provide the preserved final evaluation evidence:

- [`final_evaluation_metrics_150.json`](final_evaluation_metrics_150.json) — aggregate metrics from the completed 133-question legal retrieval benchmark
- [`manual_answer_evaluation_150.json`](manual_answer_evaluation_150.json) — representative legal manual review and final OOS generation summary
- [`evaluation_dataset.json`](evaluation_dataset.json) — earlier saved evaluation dataset used during development
- [`evaluation_results.csv`](evaluation_results.csv) — earlier evaluation results retained as historical evidence
- [`generated_answer_results.json`](generated_answer_results.json) — earlier generated-answer retrieval evidence

> **Evidence preservation note:** Detailed final per-query JSON/CSV files created during the Colab evaluation session were lost after a runtime reset before they were committed. They are therefore not recreated or presented as raw reproducible artifacts. Final aggregate figures above are preserved from the recorded completed-run outputs.

---

## 16. Final Evaluation Statement

The final evaluation provides a reproducible benchmark across **150 labelled questions**, including a completed **133-question legal retrieval run**.

The evaluation demonstrates strong exact-citation and province-sensitive retrieval while exposing measurable weaknesses in Urdu, Roman Urdu, multi-section, and selected family-law queries.

The work also demonstrates why evaluation must distinguish:

- retrieval performance from answer accuracy
- API failures from retrieval misses
- valid citations from full answer groundedness
- automated metrics from human hallucination assessment
- retrieval latency from full end-to-end generation latency

These findings provide concrete evidence for both the strengths of PakLaw AI and the areas requiring further engineering improvement.
