"""
PakLaw AI - Retrieval Evaluation Harness

Evaluates the PakLaw AI retrieval system against evaluation_master_150.json.

Dataset schema:
    id
    category
    language
    query
    expected_act
    expected_section
    province
    is_oos
    question_type
    source_set

Evaluation modes:
    1. vector_only
    2. hybrid
    3. hybrid_reranker

Metrics:
    - Recall@5
    - Recall@10
    - Latency P50
    - Latency P95
    - Retrieval errors
    - Corpus gaps
    - Language breakdown
    - Category breakdown
    - Province breakdown
    - Question-type breakdown

Important:
    - Exact citation matching is disabled during benchmark retrieval.
    - OOS questions are not included in retrieval Recall.
    - Act-only questions are evaluated using expected_act.
    - Act + section questions require both expected_act and expected_section.
    - Corpus gaps are reported separately.
"""

import argparse
import csv
import json
import math
import statistics
import time
from collections import defaultdict
from pathlib import Path

from fastapi_app import search_service


# ============================================================================
# CONFIGURATION
# ============================================================================

DATASET_FILE = "evaluation_master_150.json"
RESULTS_JSON = "evaluation_results_150.json"
RESULTS_CSV = "evaluation_results_150.csv"

ALL_MODES = [
    "vector_only",
    "hybrid",
    "hybrid_reranker",
]

TOP_K = 10


# ============================================================================
# ACT ALIASES
# ============================================================================

# Dataset uses short codes such as PPC and SRPO.
# Retrieval corpus normally stores full Act names plus short_code metadata.

ACT_ALIASES = {
    "ppc": {
        "ppc",
        "pakistan penal code",
        "pakistan penal code, 1860",
    },
    "srpo": {
        "srpo",
        "sindh rented premises ordinance",
        "sindh rented premises ordinance, 1979",
        "sindh rented premises ordinance 1979",
    },
    "crpc": {
        "crpc",
        "code of criminal procedure",
        "code of criminal procedure, 1898",
        "code of criminal procedure 1898",
    },
    "cpc": {
        "cpc",
        "code of civil procedure",
        "code of civil procedure, 1908",
        "code of civil procedure 1908",
    },
    "qso": {
        "qso",
        "qanun-e-shahadat order",
        "qanun-e-shahadat order, 1984",
        "qanun-e-shahadat order 1984",
    },
    "constitution": {
        "constitution",
        "constitution of pakistan",
        "constitution of the islamic republic of pakistan",
    },
}


# ============================================================================
# BASIC NORMALIZATION
# ============================================================================

def normalize_text(value):
    """Normalize a value for comparison."""

    if value is None:
        return ""

    text = str(value).strip().lower()

    # Normalize common punctuation differences.
    text = text.replace("–", "-")
    text = text.replace("—", "-")

    # Collapse repeated whitespace.
    text = " ".join(text.split())

    return text


def canonical_act(value):
    """
    Convert an Act name/short code into a canonical comparison key.

    Unknown Act names are returned in normalized form.
    """

    normalized = normalize_text(value)

    if not normalized:
        return ""

    for canonical, aliases in ACT_ALIASES.items():
        if normalized in aliases:
            return canonical

    return normalized


# ============================================================================
# DATASET LOADING
# ============================================================================

def load_dataset(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def validate_dataset(data):
    """
    Validate the actual evaluation_master_150.json schema.
    """

    questions = data.get("questions", [])

    total = len(questions)

    legal = [
        q for q in questions
        if not q.get("is_oos")
    ]

    oos = [
        q for q in questions
        if q.get("is_oos")
    ]

    errors = []

    # ------------------------------------------------------------------------
    # Dataset-level checks
    # ------------------------------------------------------------------------

    if total != 150:
        errors.append(
            f"Expected 150 questions, found {total}."
        )

    if len(legal) != 133:
        errors.append(
            f"Expected 133 legal questions, found {len(legal)}."
        )

    if len(oos) != 17:
        errors.append(
            f"Expected 17 OOS questions, found {len(oos)}."
        )

    # ------------------------------------------------------------------------
    # Per-question checks
    # ------------------------------------------------------------------------

    for index, question in enumerate(questions, start=1):

        if not question.get("id"):
            errors.append(
                f"Question {index} is missing 'id'."
            )

        if "query" not in question:
            errors.append(
                f"Question {index} is missing 'query'."
            )

        # OOS questions do not require gold Act/Section.
        if question.get("is_oos"):
            continue

        if not question.get("expected_act"):
            errors.append(
                f"Legal question {index} is missing 'expected_act'."
            )

        # expected_section is intentionally allowed to be null.
        #
        # Example:
        # PR01 has:
        # expected_act = SRPO
        # expected_section = null
        #
        # That is an Act-level retrieval question.

    # ------------------------------------------------------------------------
    # Print validation result
    # ------------------------------------------------------------------------

    if errors:
        print()
        print("Dataset validation warnings:")

        for error in errors:
            print(f"  - {error}")

        print()
        print(
            "Note: expected_section=None is allowed for Act-level "
            "questions and is NOT treated as a dataset error."
        )

    else:
        print(
            f"Dataset validated: {total} total, "
            f"{len(legal)} legal, {len(oos)} OOS."
        )

    return questions


# ============================================================================
# CHUNK METADATA HELPERS
# ============================================================================

def get_meta(chunk):
    """
    Safely obtain metadata from a retrieval chunk.
    """

    metadata = chunk.get("metadata", {})

    if isinstance(metadata, dict):
        return metadata

    return {}


def get_chunk_id(chunk):
    metadata = get_meta(chunk)

    return (
        chunk.get("id")
        or chunk.get("chunk_id")
        or metadata.get("id")
        or metadata.get("chunk_id")
        or ""
    )


def get_chunk_act(chunk):
    """
    Get Act information from a retrieval chunk.

    Supports both top-level and nested metadata.
    """

    metadata = get_meta(chunk)

    return (
        chunk.get("act")
        or metadata.get("act")
        or chunk.get("short_code")
        or metadata.get("short_code")
        or ""
    )


def get_chunk_short_code(chunk):
    metadata = get_meta(chunk)

    return (
        chunk.get("short_code")
        or metadata.get("short_code")
        or ""
    )


def get_chunk_section(chunk):
    metadata = get_meta(chunk)

    return (
        chunk.get("section")
        or metadata.get("section")
        or chunk.get("section_number")
        or metadata.get("section_number")
        or ""
    )


def get_chunk_section_title(chunk):
    metadata = get_meta(chunk)

    return (
        chunk.get("section_title")
        or metadata.get("section_title")
        or ""
    )


def get_chunk_province(chunk):
    metadata = get_meta(chunk)

    return (
        chunk.get("province")
        or metadata.get("province")
        or None
    )


# ============================================================================
# ACT MATCHING
# ============================================================================

def act_matches(expected_act, chunk):
    """
    Compare dataset expected_act against retrieval chunk Act metadata.

    Supports:
        PPC <-> Pakistan Penal Code
        SRPO <-> Sindh Rented Premises Ordinance
        etc.
    """

    expected = canonical_act(expected_act)

    if not expected:
        return False

    chunk_act = canonical_act(get_chunk_act(chunk))
    chunk_short_code = canonical_act(
        get_chunk_short_code(chunk)
    )

    if expected == chunk_act:
        return True

    if expected == chunk_short_code:
        return True

    # Also support substring comparison for unknown Acts.
    expected_normalized = normalize_text(expected_act)

    chunk_act_raw = normalize_text(get_chunk_act(chunk))
    chunk_code_raw = normalize_text(get_chunk_short_code(chunk))

    if (
        expected_normalized
        and expected_normalized in chunk_act_raw
    ):
        return True

    if (
        expected_normalized
        and expected_normalized in chunk_code_raw
    ):
        return True

    return False


# ============================================================================
# SECTION MATCHING
# ============================================================================

def section_matches(expected_section, chunk):
    """
    Compare expected section with a retrieval chunk.

    Returns True only when a section was actually requested.
    """

    if expected_section is None:
        return True

    expected = normalize_text(expected_section)

    if not expected:
        return True

    actual = normalize_text(
        get_chunk_section(chunk)
    )

    return actual == expected


# ============================================================================
# GOLD TARGET MATCHING
# ============================================================================

def chunk_matches(question, chunk):
    """
    Determine whether a retrieved chunk satisfies the gold target.

    Case 1:
        expected_act = PPC
        expected_section = 302

        Requires:
            Act match AND Section match

    Case 2:
        expected_act = SRPO
        expected_section = null

        Requires:
            Act match only
    """

    expected_act = question.get("expected_act")
    expected_section = question.get("expected_section")

    if not act_matches(expected_act, chunk):
        return False

    return section_matches(
        expected_section,
        chunk,
    )


# ============================================================================
# CORPUS TARGET CHECK
# ============================================================================

def corpus_contains_target(question):
    """
    Determine whether the gold target exists somewhere in the loaded corpus.

    For Act + Section questions:
        Act AND Section must exist.

    For Act-only questions:
        Act must exist.

    This is used to distinguish genuine retrieval misses from corpus gaps.
    """

    expected_act = question.get("expected_act")
    expected_section = question.get("expected_section")

    if not expected_act:
        return False

    chunks = getattr(
        search_service,
        "_chunks",
        [],
    )

    for chunk in chunks:

        if not act_matches(expected_act, chunk):
            continue

        # Act-only target.
        if expected_section is None:
            return True

        # Act + Section target.
        if section_matches(
            expected_section,
            chunk,
        ):
            return True

    return False


# ============================================================================
# RETRIEVAL
# ============================================================================

def get_chunks(
    mode,
    query,
    province=None,
    k=TOP_K,
):
    """
    Run retrieval using one of the three benchmark modes.

    Exact citation shortcut is deliberately disabled.
    """

    # ------------------------------------------------------------------------
    # Vector-only
    # ------------------------------------------------------------------------

    if mode == "vector_only":

        normalized_query, _ = (
            search_service.normalize_query(query)
        )

        indices = search_service._vector_search(
            normalized_query,
            province,
            k=k,
        )

        chunks = [
            search_service._chunks[index]
            for index in indices[:k]
        ]

        return chunks, normalized_query

    # ------------------------------------------------------------------------
    # Hybrid
    # ------------------------------------------------------------------------

    if mode == "hybrid":

        chunks, _, normalized_query = (
            search_service.search(
                query,
                k=k,
                province=province,
                use_exact=False,
                use_reranker=False,
                normalize=True,
            )
        )

        return chunks, normalized_query

    # ------------------------------------------------------------------------
    # Hybrid + reranker
    # ------------------------------------------------------------------------

    if mode == "hybrid_reranker":

        chunks, _, normalized_query = (
            search_service.search(
                query,
                k=k,
                province=province,
                use_exact=False,
                use_reranker=True,
                normalize=True,
            )
        )

        return chunks, normalized_query

    raise ValueError(
        f"Unknown evaluation mode: {mode}"
    )


# ============================================================================
# RANK FINDING
# ============================================================================

def find_rank(question, chunks):
    """
    Return the first rank at which the gold target appears.

    Returns None if not found.
    """

    for rank, chunk in enumerate(
        chunks,
        start=1,
    ):
        if chunk_matches(
            question,
            chunk,
        ):
            return rank

    return None


def find_act_only_rank(question, chunks):
    """
    Diagnostic helper.

    Finds the first retrieved chunk matching the expected Act,
    regardless of section.
    """

    expected_act = question.get(
        "expected_act"
    )

    if not expected_act:
        return None

    for rank, chunk in enumerate(
        chunks,
        start=1,
    ):
        if act_matches(
            expected_act,
            chunk,
        ):
            return rank

    return None


# ============================================================================
# SINGLE QUESTION EVALUATION
# ============================================================================

def evaluate_question(
    question,
    mode,
):
    query = question.get(
        "query",
        "",
    )

    province = question.get(
        "province"
    )

    expected_section = question.get(
        "expected_section"
    )

    corpus_available = corpus_contains_target(
        question
    )

    result = {
        "id": question.get("id"),
        "query": query,
        "mode": mode,
        "is_oos": bool(
            question.get("is_oos")
        ),
        "language": question.get("language"),
        "category": question.get("category"),
        "province": province,
        "question_type": question.get(
            "question_type"
        ),
        "source_set": question.get(
            "source_set"
        ),
        "expected_act": question.get(
            "expected_act"
        ),
        "expected_section": expected_section,
        "corpus_target_available": corpus_available,
        "recall_evaluable": False,
        "status": "ok",
        "rank": None,
        "recall_at_5": False,
        "recall_at_10": False,
        "act_only_rank": None,
        "latency_ms": None,
        "normalized_query": None,
        "retrieved_chunks": [],
        "error": None,
    }

    # ------------------------------------------------------------------------
    # OOS
    # ------------------------------------------------------------------------

    if question.get("is_oos"):
        result["status"] = "oos_not_evaluated"
        return result

    # ------------------------------------------------------------------------
    # Corpus gap
    # ------------------------------------------------------------------------

    if not corpus_available:
        result["status"] = "corpus_gap"
        return result

    # This question can legitimately contribute to Recall.
    result["recall_evaluable"] = True

    # ------------------------------------------------------------------------
    # Run retrieval
    # ------------------------------------------------------------------------

    started = time.perf_counter()

    try:

        chunks, normalized_query = get_chunks(
            mode=mode,
            query=query,
            province=province,
            k=TOP_K,
        )

        elapsed_ms = (
            time.perf_counter() - started
        ) * 1000

        result["latency_ms"] = elapsed_ms

        result["normalized_query"] = (
            normalized_query
        )

        # --------------------------------------------------------------------
        # Recall
        # --------------------------------------------------------------------

        rank = find_rank(
            question,
            chunks,
        )

        result["rank"] = rank

        result["recall_at_5"] = (
            rank is not None
            and rank <= 5
        )

        result["recall_at_10"] = (
            rank is not None
            and rank <= 10
        )

        # Diagnostic Act-only rank.
        result["act_only_rank"] = (
            find_act_only_rank(
                question,
                chunks,
            )
        )

        # --------------------------------------------------------------------
        # Retrieved chunk information
        # --------------------------------------------------------------------

        retrieved = []

        for rank_number, chunk in enumerate(
            chunks,
            start=1,
        ):

            retrieved.append(
                {
                    "rank": rank_number,
                    "chunk_id": get_chunk_id(chunk),
                    "act": get_chunk_act(chunk),
                    "short_code": get_chunk_short_code(
                        chunk
                    ),
                    "section": get_chunk_section(
                        chunk
                    ),
                    "section_title": (
                        get_chunk_section_title(
                            chunk
                        )
                    ),
                    "province": get_chunk_province(
                        chunk
                    ),
                }
            )

        result["retrieved_chunks"] = retrieved

    except Exception as exc:

        result["status"] = "error"

        result["error"] = (
            f"{type(exc).__name__}: {exc}"
        )

    return result


# ============================================================================
# STATISTICS
# ============================================================================

def percentile(
    values,
    percentile_value,
):
    """
    Calculate percentile using linear interpolation.
    """

    if not values:
        return None

    sorted_values = sorted(values)

    if len(sorted_values) == 1:
        return sorted_values[0]

    position = (
        len(sorted_values) - 1
    ) * (
        percentile_value / 100
    )

    lower = math.floor(position)
    upper = math.ceil(position)

    if lower == upper:
        return sorted_values[
            lower
        ]

    weight = position - lower

    return (
        sorted_values[lower]
        * (1 - weight)
        + sorted_values[upper]
        * weight
    )


def percentage(
    numerator,
    denominator,
):
    if denominator == 0:
        return 0.0

    return (
        numerator / denominator
    ) * 100


# ============================================================================
# BREAKDOWNS
# ============================================================================

def calculate_breakdown(
    results,
    field,
):
    """
    Calculate Recall@5/@10 grouped by a dataset field.
    """

    groups = defaultdict(list)

    for result in results:

        if not result["recall_evaluable"]:
            continue

        value = result.get(field)

        if value is None or value == "":
            value = "Unknown"

        groups[str(value)].append(
            result
        )

    breakdown = {}

    for key, group in sorted(
        groups.items()
    ):

        evaluated = len(group)

        hits_5 = sum(
            1
            for result in group
            if result["recall_at_5"]
        )

        hits_10 = sum(
            1
            for result in group
            if result["recall_at_10"]
        )

        breakdown[key] = {
            "evaluated": evaluated,
            "recall_at_5": percentage(
                hits_5,
                evaluated,
            ),
            "recall_at_10": percentage(
                hits_10,
                evaluated,
            ),
        }

    return breakdown


# ============================================================================
# WARM-UP
# ============================================================================

def warm_up(mode):
    """
    Warm the retrieval/model stack before measured evaluation.

    The warm-up latency is NOT included in question latency statistics.
    """

    print(
        f"Warming up mode: {mode}"
    )

    try:

        sample_query = (
            "What is the punishment "
            "under Section 302 PPC?"
        )

        started = time.perf_counter()

        get_chunks(
            mode=mode,
            query=sample_query,
            province=None,
            k=TOP_K,
        )

        elapsed_ms = (
            time.perf_counter()
            - started
        ) * 1000

        print(
            f"  Warm-up completed in "
            f"{elapsed_ms:.1f} ms"
        )

    except Exception as exc:

        print(
            "  Warm-up warning: "
            f"{type(exc).__name__}: {exc}"
        )


# ============================================================================
# RUN ONE MODE
# ============================================================================

def run_mode(
    questions,
    mode,
):
    print()
    print("=" * 72)
    print(
        f"Running mode: {mode} "
        f"({len(questions)} questions)"
    )
    print("=" * 72)

    warm_up(mode)

    results = []

    for index, question in enumerate(
        questions,
        start=1,
    ):

        print(
            f"[{index}/{len(questions)}] "
            f"{question.get('id', '')}"
        )

        result = evaluate_question(
            question,
            mode,
        )

        results.append(result)

        status = result["status"]

        if status == "ok":

            rank = result["rank"]

            if rank is None:
                print(
                    "  Recall: MISS"
                )
            else:
                print(
                    f"  Recall rank: {rank}"
                )

        elif status == "corpus_gap":

            print(
                "  Status: CORPUS GAP"
            )

        elif status == "oos_not_evaluated":

            print(
                "  Status: OOS - "
                "not evaluated"
            )

        else:

            print(
                "  Status: ERROR - "
                f"{result['error']}"
            )

    return results


# ============================================================================
# MODE SUMMARY
# ============================================================================

def summarize_mode(results):

    evaluable = [
        result
        for result in results
        if result["recall_evaluable"]
    ]

    successful = [
        result
        for result in evaluable
        if result["status"] == "ok"
    ]

    errors = [
        result
        for result in results
        if result["status"] == "error"
    ]

    corpus_gaps = [
        result
        for result in results
        if result["status"] == "corpus_gap"
    ]

    oos = [
        result
        for result in results
        if result["status"]
        == "oos_not_evaluated"
    ]

    latencies = [
        result["latency_ms"]
        for result in successful
        if result["latency_ms"]
        is not None
    ]

    hits_5 = sum(
        1
        for result in successful
        if result["recall_at_5"]
    )

    hits_10 = sum(
        1
        for result in successful
        if result["recall_at_10"]
    )

    return {
        "questions_total": len(results),

        "legal_questions": sum(
            1
            for result in results
            if not result["is_oos"]
        ),

        "oos_questions": len(oos),

        "recall_evaluable": len(
            evaluable
        ),

        "successful_evaluations": len(
            successful
        ),

        "corpus_gaps": len(
            corpus_gaps
        ),

        "errors": len(errors),

        "recall_at_5": percentage(
            hits_5,
            len(evaluable),
        ),

        "recall_at_10": percentage(
            hits_10,
            len(evaluable),
        ),

        "latency_p50_ms": percentile(
            latencies,
            50,
        ),

        "latency_p95_ms": percentile(
            latencies,
            95,
        ),

        "latency_mean_ms": (
            statistics.mean(latencies)
            if latencies
            else None
        ),
    }


# ============================================================================
# JSON CLEANUP
# ============================================================================

def clean_result_for_json(result):
    """
    Results are already JSON-safe, but keep this helper for clarity.
    """

    return dict(result)


# ============================================================================
# BUILD JSON OUTPUT
# ============================================================================

def build_output(
    all_results,
    total_questions,
    legal_questions,
    oos_questions,
    initialization_ms,
    limit,
):

    output = {
        "dataset": {
            "file": DATASET_FILE,
            "total_questions": total_questions,
            "legal_questions": legal_questions,
            "oos_questions": oos_questions,
        },

        "configuration": {
            "top_k": TOP_K,
            "exact_match_disabled": True,
            "modes": ALL_MODES,
            "limit": limit,
            "initialization_ms": initialization_ms,
        },

        "modes": {},
    }

    for mode, results in all_results.items():

        output["modes"][mode] = {
            "summary": summarize_mode(
                results
            ),

            "breakdowns": {
                "language": calculate_breakdown(
                    results,
                    "language",
                ),

                "category": calculate_breakdown(
                    results,
                    "category",
                ),

                "province": calculate_breakdown(
                    results,
                    "province",
                ),

                "question_type": calculate_breakdown(
                    results,
                    "question_type",
                ),
            },

            "questions": [
                clean_result_for_json(
                    result
                )
                for result in results
            ],
        }

    return output


# ============================================================================
# CSV OUTPUT
# ============================================================================

def write_csv(
    all_results,
    path,
):

    rows = []

    for mode, results in all_results.items():

        for result in results:

            rows.append(
                {
                    "mode": mode,
                    "id": result.get("id"),
                    "query": result.get("query"),
                    "is_oos": result.get("is_oos"),
                    "language": result.get("language"),
                    "category": result.get("category"),
                    "province": result.get("province"),
                    "question_type": result.get(
                        "question_type"
                    ),
                    "source_set": result.get(
                        "source_set"
                    ),
                    "expected_act": result.get(
                        "expected_act"
                    ),
                    "expected_section": result.get(
                        "expected_section"
                    ),
                    "corpus_target_available": result.get(
                        "corpus_target_available"
                    ),
                    "recall_evaluable": result.get(
                        "recall_evaluable"
                    ),
                    "status": result.get(
                        "status"
                    ),
                    "rank": result.get(
                        "rank"
                    ),
                    "recall_at_5": result.get(
                        "recall_at_5"
                    ),
                    "recall_at_10": result.get(
                        "recall_at_10"
                    ),
                    "act_only_rank": result.get(
                        "act_only_rank"
                    ),
                    "latency_ms": result.get(
                        "latency_ms"
                    ),
                    "normalized_query": result.get(
                        "normalized_query"
                    ),
                    "error": result.get(
                        "error"
                    ),
                }
            )

    fieldnames = [
        "mode",
        "id",
        "query",
        "is_oos",
        "language",
        "category",
        "province",
        "question_type",
        "source_set",
        "expected_act",
        "expected_section",
        "corpus_target_available",
        "recall_evaluable",
        "status",
        "rank",
        "recall_at_5",
        "recall_at_10",
        "act_only_rank",
        "latency_ms",
        "normalized_query",
        "error",
    ]

    with open(
        path,
        "w",
        newline="",
        encoding="utf-8",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)


# ============================================================================
# MAIN
# ============================================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "PakLaw AI retrieval "
            "evaluation harness"
        )
    )

    parser.add_argument(
        "--mode",
        choices=ALL_MODES + ["all"],
        default="all",
        help="Evaluation mode",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help=(
            "Run only the first N "
            "legal questions"
        ),
    )

    parser.add_argument(
        "--dataset",
        default=DATASET_FILE,
        help="Path to evaluation dataset",
    )

    parser.add_argument(
        "--output-json",
        default=RESULTS_JSON,
        help="Output JSON path",
    )

    parser.add_argument(
        "--output-csv",
        default=RESULTS_CSV,
        help="Output CSV path",
    )

    args = parser.parse_args()

    if args.mode == "vector_only":
        args.output_json = "evaluation_results_vector_only_150.json"
        args.output_csv = "evaluation_results_vector_only_150.csv"
    elif args.mode == "hybrid":
        args.output_json = "evaluation_results_hybrid_150.json"
        args.output_csv = "evaluation_results_hybrid_150.csv"
    elif args.mode == "hybrid_reranker":
        args.output_json = "evaluation_results_hybrid_reranker_150.json"
        args.output_csv = "evaluation_results_hybrid_reranker_150.csv"
    # ------------------------------------------------------------------------
    # Load dataset
    # ------------------------------------------------------------------------

    dataset_path = Path(
        args.dataset
    )

    if not dataset_path.exists():

        raise FileNotFoundError(
            f"Dataset not found: "
            f"{dataset_path}"
        )

    data = load_dataset(
        dataset_path
    )

    questions = validate_dataset(
        data
    )

    legal_questions_all = [
        question
        for question in questions
        if not question.get("is_oos")
    ]

    oos_questions_all = [
        question
        for question in questions
        if question.get("is_oos")
    ]

    # ------------------------------------------------------------------------
    # Apply limit
    # ------------------------------------------------------------------------

    legal_questions = legal_questions_all

    if args.limit is not None:

        if args.limit <= 0:
            raise ValueError(
                "--limit must be greater than 0."
            )

        legal_questions = (
            legal_questions_all[
                :args.limit
            ]
        )

        print(
            f"--limit {args.limit} applied: "
            f"running on "
            f"{len(legal_questions)} "
            f"legal questions only."
        )

    # ------------------------------------------------------------------------
    # Initialize retrieval system
    # ------------------------------------------------------------------------

    print()
    print(
        "Initializing retrieval system..."
    )

    init_started = time.perf_counter()

    search_service.initialize()

    initialization_ms = (
        time.perf_counter()
        - init_started
    ) * 1000

    chunk_count = len(
        getattr(
            search_service,
            "_chunks",
            [],
        )
    )

    print(
        f"Retrieval system initialized "
        f"in {initialization_ms:.1f} ms."
    )

    print(
        f"Loaded corpus chunks: "
        f"{chunk_count}"
    )

    # ------------------------------------------------------------------------
    # Select modes
    # ------------------------------------------------------------------------

    if args.mode == "all":
        modes = ALL_MODES
    else:
        modes = [args.mode]

    all_results = {}

    # ------------------------------------------------------------------------
    # Run benchmark
    # ------------------------------------------------------------------------

    for mode in modes:

        results = run_mode(
            legal_questions,
            mode,
        )

        all_results[mode] = results

    # ------------------------------------------------------------------------
    # Build output
    # ------------------------------------------------------------------------

    output = build_output(
        all_results=all_results,
        total_questions=len(
            questions
        ),
        legal_questions=len(
            legal_questions_all
        ),
        oos_questions=len(
            oos_questions_all
        ),
        initialization_ms=(
            initialization_ms
        ),
        limit=args.limit,
    )

    # ------------------------------------------------------------------------
    # Write JSON
    # ------------------------------------------------------------------------

    with open(
        args.output_json,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            output,
            f,
            indent=2,
            ensure_ascii=False,
        )

    # ------------------------------------------------------------------------
    # Write CSV
    # ------------------------------------------------------------------------

    write_csv(
        all_results,
        args.output_csv,
    )

    # ------------------------------------------------------------------------
    # Print summary
    # ------------------------------------------------------------------------

    print()
    print("=" * 72)
    print(
        "FINAL EVALUATION SUMMARY"
    )
    print("=" * 72)

    for mode in modes:

        summary = summarize_mode(
            all_results[mode]
        )

        print()
        print(
            f"Mode: {mode}"
        )

        print(
            f"  Recall@5: "
            f"{summary['recall_at_5']:.2f}% "
            f"("
            f"{sum(1 for r in all_results[mode] if r.get('recall_at_5') is True)}"
            f"/"
            f"{summary['recall_evaluable']}"
            f")"
        )

        print(
            f"  Recall@10: "
            f"{summary['recall_at_10']:.2f}% "
            f"("
            f"{sum(1 for r in all_results[mode] if r.get('recall_at_10') is True)}"
            f"/"
            f"{summary['recall_evaluable']}"
            f")"
        )

        if (
            summary["latency_p50_ms"]
            is not None
        ):

            print(
                f"  Latency P50: "
                f"{summary['latency_p50_ms']:.1f} ms"
            )

        else:

            print(
                "  Latency P50: N/A"
            )

        if (
            summary["latency_p95_ms"]
            is not None
        ):

            print(
                f"  Latency P95: "
                f"{summary['latency_p95_ms']:.1f} ms"
            )

        else:

            print(
                "  Latency P95: N/A"
            )

        print(
            f"  Recall evaluable: "
            f"{summary['recall_evaluable']}"
        )

        print(
            f"  Corpus gaps: "
            f"{summary['corpus_gaps']}"
        )

        print(
            f"  Errors: "
            f"{summary['errors']}"
        )

    print()
    print(
        f"JSON written: "
        f"{args.output_json}"
    )

    print(
        f"CSV written: "
        f"{args.output_csv}"
    )

    print()
    print(
        f"OOS questions in dataset: "
        f"{len(oos_questions_all)}"
    )

    print(
        "Note: OOS/refusal behavior is "
        "not evaluated by this "
        "retrieval-only harness."
    )


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()
    

