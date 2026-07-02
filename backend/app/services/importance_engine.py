"""
Importance Engine — multi-factor importance scoring.
Replaces simple confidence*weight with a richer composite score.
Score is dynamic: recalculated as the graph evolves.
"""
from __future__ import annotations
import math
from typing import Dict, List
from datetime import datetime

from app.models.memory import MemoryNode, MemoryEdge


def compute_importance(
    node: MemoryNode,
    all_nodes: Dict[str, MemoryNode],
    edges: List[MemoryEdge],
) -> float:
    """
    Composite importance: retrieval_freq + recency + feedback + pinned + graph_degree + confidence
    Returns 0.0–2.0 (normalized around 1.0)
    """
    factors = []

    # 1. Retrieval frequency (logarithmic, normalized by max)
    max_retrievals = max((n.retrieval_count for n in all_nodes.values()), default=1)
    if max_retrievals > 0 and node.retrieval_count > 0:
        freq_score = math.log1p(node.retrieval_count) / math.log1p(max_retrievals)
    else:
        freq_score = 0.0
    factors.append(freq_score * 0.25)

    # 2. Recency (exponential decay over 180 days)
    days_old = max(0, (datetime.utcnow() - node.created_at).days)
    recency_score = math.exp(-days_old / 180.0)
    factors.append(recency_score * 0.20)

    # 3. Feedback signal (explicit user feedback)
    total_feedback = node.positive_feedback + node.negative_feedback
    if total_feedback > 0:
        feedback_score = node.positive_feedback / total_feedback
    else:
        feedback_score = 0.5  # neutral
    factors.append(feedback_score * 0.15)

    # 4. Confidence
    factors.append(node.confidence * 0.15)

    # 5. Pinned / favorite bonus
    pin_bonus = 0.0
    if node.is_pinned:
        pin_bonus += 0.08
    if node.is_favorite:
        pin_bonus += 0.07
    factors.append(pin_bonus)

    # 6. Graph centrality (degree-based)
    degree = sum(1 for e in edges if e.source == node.id or e.target == node.id)
    max_degree = max((
        sum(1 for e in edges if e.source == n.id or e.target == n.id)
        for n in all_nodes.values()
    ), default=1)
    centrality = degree / max(max_degree, 1)
    factors.append(centrality * 0.10)

    # 7. Penalty for outdated / negative feedback dominated
    penalty = 0.0
    if node.is_outdated:
        penalty += 0.15
    if total_feedback > 2 and node.negative_feedback > node.positive_feedback:
        penalty += 0.10

    raw = sum(factors) - penalty
    return round(max(0.01, min(2.0, raw * 2.0)), 4)


def recalculate_all(store) -> int:
    """Recalculate importance scores for all non-deleted nodes. Returns count updated."""
    nodes = store.nodes
    edges = store.edges
    updated = 0
    for node in nodes.values():
        if node.is_deleted:
            continue
        new_score = compute_importance(node, nodes, edges)
        if abs(new_score - node.importance_score) > 0.001:
            node.importance_score = new_score
            updated += 1
    return updated
