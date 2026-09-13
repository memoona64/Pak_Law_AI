import json
from pathlib import Path

FILES = {
    "vector_only": "evaluation_results_vector_only_150.json",
    "hybrid": "evaluation_results_hybrid_150.json",
    "hybrid_reranker": "evaluation_results_hybrid_reranker_150.json",
}

out = {
    "benchmark": {
        "dataset": "evaluation_master_150.json",
        "total_questions": 150,
        "legal_questions": 133,
        "oos_questions": 17,
        "recall_evaluable": 86,
        "corpus_gaps": 47,
        "note": "Recall metrics use only legal questions whose expected Act/Section target exists in the retrieval corpus."
    },
    "modes": {}
}

for mode, filename in FILES.items():
    path = Path(filename)

    if not path.exists():
        raise FileNotFoundError(f"Missing result file: {filename}")

    data = json.loads(path.read_text(encoding="utf-8"))
    mode_data = data["modes"][mode]

    out["modes"][mode] = {
        "recall_at_5": mode_data["summary"]["recall_at_5"],
        "recall_at_10": mode_data["summary"]["recall_at_10"],
        "latency_p50_ms": mode_data["summary"]["latency_p50_ms"],
        "latency_p95_ms": mode_data["summary"]["latency_p95_ms"],
        "latency_mean_ms": mode_data["summary"]["latency_mean_ms"],
        "recall_evaluable": mode_data["summary"]["recall_evaluable"],
        "corpus_gaps": mode_data["summary"]["corpus_gaps"],
        "errors": mode_data["summary"]["errors"],
        "breakdowns": mode_data.get("breakdowns", {})
    }

output_path = Path("backend/data/evaluation_dashboard_summary.json")
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(
    json.dumps(out, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

print(f"Created: {output_path}")
print(json.dumps(out["modes"], indent=2))
