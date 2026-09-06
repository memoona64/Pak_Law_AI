# PakLaw AI — Testing & Evaluation Report

> **Branch:** `testing-evaluation`  
> **Evaluation coverage:** 150 labelled questions  
> **Role:** Testing & Evaluation  
> **Purpose:** Evaluate retrieval quality, multilingual performance, refusal behaviour, latency, and representative generated-answer quality using measured evidence.

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

> **Important:** Recall@5 and Recall@10 are retrieval metrics. They are not overall model accuracy.

---

## 2. Evaluation Scope

The final evaluation covered **150 unique labelled questions** across the major query types required for PakLaw AI.

### Coverage included

- exact legal citation queries
- natural-language English queries
- Roman Urdu queries
- Urdu-script queries
- province-sensitive queries
- multi-section queries
- constitutional questions
- family-law questions
- deliberately out-of-scope questions

### Dataset composition

| Dimension | Count |
|---|---:|
| Total questions | **150** |
| Legal | **133** |
| OOS-labelled | **17** |
| Province-sensitive | **22** |
| Multi-section | **14** |
| English | **85** |
| Roman Urdu | **37** |
| Urdu | **28** |

One OOS-labelled record was identified during review as having legal intent. It was excluded from the true non-legal refusal denominator rather than being incorrectly treated as a non-legal OOS question.

---

## 3. Evaluation Methodology

Evaluation was completed in two main stages.

### Stage A — Legal Retrieval Benchmark

All **133 legal questions** were evaluated against the retrieval service.

The final bulk benchmark used:

- hybrid retrieval
- exact-citation shortcut enabled
- query normalization enabled
- `k = 10`
- reranker disabled for the bulk run

The reranker was disabled for the large Colab benchmark because full reranked requests were too expensive and slow for a controlled 133-question run.

Therefore, the final Recall and latency figures in this report describe the **tested no-reranker bulk configuration**, not the complete reranked production configuration.

For each legal query, evaluation checked whether the labelled expected source appeared:

- within the **Top 5**
- within the **Top 10**

### Stage B — Generated-Answer and Refusal Review

Generation-based evaluation was used for:

- representative legal answers
- grounding and citation review
- unsupported-claim review
- out-of-scope refusal behaviour

Generation results were kept separate from retrieval metrics so the report does not confuse source retrieval performance with final-answer quality.

---

## 4. Overall Retrieval Results

| Metric | Result |
|---|---:|
| Legal retrieval calls attempted | **133** |
| Successful retrieval calls | **133 / 133** |
| Retrieval execution errors | **0** |
| Recall@5 | **83 / 133 = 62.41%** |
| Recall@10 | **90 / 133 = 67.67%** |
| P50 retrieval latency | **146.0 ms** |
| P95 retrieval latency | **379.5 ms** |

### Interpretation

The labelled expected legal source appeared in the first five retrieved results for approximately **62.4%** of the evaluated legal questions.

Within the first ten results, this increased to approximately **67.7%**.

This shows that increasing retrieval depth recovered some additional expected legal sources, but important retrieval weaknesses remain in specific languages and query types.

---

## 5. Performance by Language

| Language | Legal questions | Recall@5 | Recall@10 |
|---|---:|---:|---:|
| English | 71 | **77.46%** | **81.69%** |
| Roman Urdu | 34 | **52.94%** | **52.94%** |
| Urdu | 28 | **35.71%** | **50.00%** |

### Interpretation

English retrieval performed strongest.

Roman Urdu performance was substantially lower than English.

Urdu-script queries showed the weakest Top-5 performance, although performance improved when retrieval depth increased to Top 10.

### Main multilingual finding

The system requires further improvement in:

- Urdu query understanding
- Roman Urdu normalization
- multilingual retrieval consistency

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

### Multi-section scoring note

The multi-section category used a **strict all-expected-sources criterion**.

If a query expected two legal sections and the system retrieved only one of them, the query was counted as a miss.

The resulting 0% therefore means the complete expected source set was not recovered for those strict cases. It does not mean no relevant source was ever retrieved.

### Strongest evaluated areas

- exact citation retrieval
- constitutional retrieval in the evaluated sample
- province-sensitive retrieval
- English retrieval relative to multilingual queries

### Main improvement areas

- Urdu script
- Roman Urdu
- multi-section retrieval
- selected family-law queries

---

## 7. Latency Evaluation

For the final no-reranker bulk retrieval benchmark:

- **P50 retrieval latency:** 146.0 ms
- **P95 retrieval latency:** 379.5 ms

A first-call startup/model-download outlier of approximately **247 seconds** was also observed.

This startup event is reported separately rather than hidden inside the warmed retrieval measurements.

Earlier integrated testing also showed that reranking and generation can make full end-to-end requests significantly slower.

Therefore:

**retrieval latency must not be presented as full end-to-end response latency.**

---

## 8. Out-of-Scope / Refusal Evaluation

The final dataset contained **17 OOS-labelled records**.

After dataset review, one labelled record was excluded from the true non-legal OOS denominator because it represented legal intent.

### Final generation attempt

| Item | Result |
|---|---:|
| True non-legal OOS cases selected | **16** |
| Successful Gemini generation calls | **6** |
| Correct refusals | **6 / 6** |
| Observed refusal rate among successful calls | **100.00%** |
| Quota-limited / unscored cases | **10** |

All six OOS cases for which a valid generated response was obtained were correctly refused.

The ten remaining cases returned **Gemini HTTP 429 quota errors before an answer was generated**.

They were therefore not counted as refusal failures.

### Correct interpretation

The defensible statement is:

> **6/6 successfully generated true-OOS responses were correctly refused. Ten additional cases could not be scored because generation was blocked by API quota limits.**

It is not correct to claim that all sixteen OOS requests completed successfully.

---

## 9. Representative Legal Answer Review

Four representative generated legal answers were manually reviewed.

Review criteria included:

- relevance
- correct expected source
- grounding in retrieved legal context
- citation correctness
- unsupported legal claims
- overall answer behaviour

| Case | Expected source | Result |
|---|---|---|
| Theft — English | PPC Section 379 | **PASS** |
| Exact citation query | PPC Section 302 | **PASS** |
| Theft — Roman Urdu | PPC Section 379 | **PASS** |
| Cheating | PPC Section 417 | **PASS** |

### Manual sample result

**4 / 4 representative legal answers passed.**

This is a representative manual sample.

It must **not** be presented as overall system accuracy or as a system-wide citation percentage.

---

## 10. Citation and Unsupported-Claim Interpretation

This evaluation intentionally does **not** report an automated system-wide hallucination rate.

Reliable hallucination or unsupported-content assessment requires human interpretation of generated answers.

For the four representative manually reviewed legal cases:

- expected legal citations were used correctly
- answers were grounded in retrieved legal context
- no unsupported legal claim was observed in the reviewed sample

This is reported as a **manual sample finding**, not a system-wide zero-hallucination claim.

### Citation validity vs groundedness

These concepts must remain separate.

**Citation validity** asks whether a cited legal Act/Section genuinely exists.

**Groundedness** asks whether the actual statement made in the answer is supported by the retrieved legal context.

A citation can exist while an unsupported claim is still made, so one metric cannot replace the other.

---

## 11. Key Findings

### What performed well

1. Exact-citation retrieval achieved **100% Recall@5 and Recall@10** in the evaluated category.
2. Province-sensitive retrieval performed strongly at **86.36% Recall@5** and **90.91% Recall@10**.
3. All **133 legal retrieval calls completed successfully** with zero execution errors.
4. The representative generated-answer sample passed the manual grounding and citation review.
5. Every successfully generated true non-legal OOS response was correctly refused.

### What needs improvement

1. Urdu retrieval requires significant improvement.
2. Roman Urdu retrieval and normalization remain inconsistent.
3. Multi-section retrieval requires stronger query decomposition and source coverage.
4. Selected family-law queries require further retrieval tuning.
5. End-to-end generation and reranking can introduce significant latency.
6. Some legal-source metadata requires cleanup.
7. API quota limits affected the completion of the generation-based refusal evaluation.

---

## 12. Integration Finding

During final evaluation on the `testing-evaluation` branch, the checked-out `/rag/query` response exposed retrieval information but did not return an `answer` field in that branch state.

Generation code from the team's LLM-generation work was therefore loaded temporarily in the Colab evaluation environment so generation-based tests could be completed.

This was treated as a **branch/integration-state finding**, not as a retrieval failure.

Those temporary generation source files are not part of the Testing & Evaluation implementation contribution and were not committed with this evaluation update.

---

## 13. Limitations

The final results should be interpreted with the following limitations:

- the 133-question bulk retrieval benchmark was run with the reranker disabled
- the result therefore does not represent a complete before/after reranker comparison
- only a small representative generated-answer sample was manually reviewed
- ten final OOS generation cases could not be scored because of Gemini HTTP 429 quota limits
- the first retrieval request incurred a large model-download/startup delay
- multi-section scoring used a strict all-expected-sources rule
- retrieval Recall is not the same as overall answer accuracy
- retrieval latency is not the same as full end-to-end latency
- detailed final per-query artifacts created during the Colab session were lost after a runtime reset before they were committed

---

## 14. Recommended Next Improvements

1. Improve Urdu and Roman Urdu normalization.
2. Improve multilingual query understanding.
3. Add stronger multi-section query decomposition and retrieval.
4. Improve family-law retrieval coverage.
5. Complete branch integration so the deployed `/rag/query` consistently returns generated answers.
6. Add early OOS classification before expensive retrieval/reranking/generation where appropriate.
7. Reduce reranker and generation latency.
8. Clean inconsistent legal-source metadata.
9. Run a future controlled retrieval comparison across:
   - vector-only retrieval
   - hybrid BM25 + vector + RRF
   - hybrid + cross-encoder reranking

Only experimentally measured comparison results should be published.

---

## 15. Preserved Evaluation Evidence

The following committed files preserve the final evaluation summary evidence:

- [`final_evaluation_metrics_150.json`](final_evaluation_metrics_150.json) — aggregate results from the completed 133-question legal retrieval benchmark
- [`manual_answer_evaluation_150.json`](manual_answer_evaluation_150.json) — representative manual legal review and OOS generation summary
- [`evaluation_dataset.json`](evaluation_dataset.json) — earlier development evaluation dataset
- [`evaluation_results.csv`](evaluation_results.csv) — earlier development retrieval results
- [`generated_answer_results.json`](generated_answer_results.json) — earlier generated-answer evaluation evidence
- [`manual_answer_evaluation.json`](manual_answer_evaluation.json) — earlier manually reviewed legal-answer evidence

> **Evidence preservation note:** Detailed final per-query JSON/CSV artifacts produced during the final Colab evaluation session were lost after a runtime reset before they were committed. They have not been fabricated or reconstructed as raw evidence. Final aggregate results are preserved from the recorded completed-run outputs.

---

## 16. Final Evaluation Statement

PakLaw AI's final Testing & Evaluation work covered **150 labelled questions**, including a completed **133-question legal retrieval benchmark**.

The benchmark produced:

- **Recall@5: 62.41%**
- **Recall@10: 67.67%**
- **P50 retrieval latency: 146.0 ms**
- **P95 retrieval latency: 379.5 ms**
- **0 retrieval execution errors across 133 legal calls**

The results demonstrate strong exact-citation and province-sensitive retrieval while exposing measurable weaknesses in Urdu, Roman Urdu, multi-section, and selected family-law queries.

Representative generated-answer testing also showed grounded legal responses in the reviewed sample, while successfully generated non-legal OOS queries were correctly refused.

The evaluation deliberately distinguishes:

- retrieval performance from final-answer accuracy
- API errors from retrieval misses
- citation validity from groundedness
- automated metrics from human unsupported-claim assessment
- retrieval latency from full end-to-end latency

The purpose of this evaluation is not to present perfect results. It is to provide measurable evidence of what PakLaw AI currently does well, where it fails, and which areas should be improved next.
