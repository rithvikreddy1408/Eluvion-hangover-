"""
Computes aggregate Memory Health from node/edge statistics and pathology report.
"""
from __future__ import annotations

from typing import Dict, List

from app.models.health import MemoryHealthReport
from app.models.memory import MemoryEdge, MemoryNode
from app.services.memory_utils import days_old


def compute_health(nodes: Dict[str, MemoryNode],
                   edges: List[MemoryEdge],
                   diseases: list) -> MemoryHealthReport:
    n = len(nodes)
    if n == 0:
        return MemoryHealthReport(
            overall_score=100.0, freshness=100.0, consistency=100.0,
            graph_connectivity=100.0, contradiction_score=0.0,
            hallucination_risk=0.0, total_nodes=0, total_edges=0,
            avg_retrieval_count=0.0, grade="A",
        )

    # Freshness — penalise old nodes that are still being retrieved
    fresh_scores = []
    for node in nodes.values():
        age = days_old(node)
        f = max(0.0, 1.0 - age / 365.0)
        if node.retrieval_count > 0:
            fresh_scores.append(f)
    freshness = round((sum(fresh_scores) / len(fresh_scores) * 100) if fresh_scores else 100.0, 1)

    # Consistency — penalise contradicting edges and low-confidence nodes
    contradicting_edges = sum(1 for e in edges if e.relationship == "contradicts")
    consistency = round(max(0.0, 100.0 - contradicting_edges * 15), 1)

    # Graph Connectivity — ratio of actual edges to possible edges
    max_edges = n * (n - 1) / 2
    connectivity_raw = len(edges) / max_edges if max_edges > 0 else 0.0
    graph_connectivity = round(min(100.0, connectivity_raw * 500), 1)  # scale up for readability

    # Contradiction Score
    contradiction_score = round(min(100.0, contradicting_edges * 20.0), 1)

    # Hallucination Risk — weighted combination of pathology severities
    rot_diseases = [d for d in diseases if d.type == "memory_rot"]
    cont_diseases = [d for d in diseases if d.type == "contamination"]
    frag_diseases = [d for d in diseases if d.type == "fragmentation"]

    rot_risk = sum(d.severity for d in rot_diseases) / max(1, len(rot_diseases)) if rot_diseases else 0
    cont_risk = sum(d.severity for d in cont_diseases) / max(1, len(cont_diseases)) if cont_diseases else 0
    frag_risk = sum(d.severity for d in frag_diseases) / max(1, len(frag_diseases)) if frag_diseases else 0

    hallucination_risk = round(min(100.0, (rot_risk * 0.4 + cont_risk * 0.4 + frag_risk * 0.2) * 100), 1)

    # Overall score
    overall = round(
        freshness * 0.25
        + consistency * 0.25
        + (100 - hallucination_risk) * 0.30
        + (100 - contradiction_score) * 0.10
        + min(graph_connectivity, 100) * 0.10,
        1,
    )
    overall = max(0.0, min(100.0, overall))

    grade = "A" if overall >= 90 else "B" if overall >= 75 else "C" if overall >= 60 else "D" if overall >= 45 else "F"

    retrieval_counts = [node.retrieval_count for node in nodes.values()]
    avg_retrieval = round(sum(retrieval_counts) / len(retrieval_counts), 2)

    # New metrics
    orphan_nodes = sum(1 for nd in nodes.values() if not nd.is_deleted and
                       not any(e.source == nd.id or e.target == nd.id for e in edges))
    soft_deleted_count = sum(1 for nd in nodes.values() if nd.is_deleted)
    pinned_count = sum(1 for nd in nodes.values() if nd.is_pinned and not nd.is_deleted)
    active_nodes = [nd for nd in nodes.values() if not nd.is_deleted]
    avg_importance = round(sum(nd.importance_score for nd in active_nodes) / max(1, len(active_nodes)), 3)

    try:
        from app.services.contradiction_service import get_all_contradictions
        contradiction_count = len(get_all_contradictions(resolved=False))
    except Exception:
        contradiction_count = 0

    try:
        from app.services.preference_service import get_preferences
        preference_count = len(get_preferences())
    except Exception:
        preference_count = 0

    return MemoryHealthReport(
        overall_score=overall,
        freshness=freshness,
        consistency=consistency,
        graph_connectivity=graph_connectivity,
        contradiction_score=contradiction_score,
        hallucination_risk=hallucination_risk,
        total_nodes=n,
        total_edges=len(edges),
        avg_retrieval_count=avg_retrieval,
        grade=grade,
        orphan_nodes=orphan_nodes,
        soft_deleted_count=soft_deleted_count,
        pinned_count=pinned_count,
        avg_importance=avg_importance,
        contradiction_count=contradiction_count,
        preference_count=preference_count,
    )
