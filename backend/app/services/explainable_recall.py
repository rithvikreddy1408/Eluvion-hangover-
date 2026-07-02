"""
Explainable Recall — annotates every recall result with:
sources, why selected, relationship paths, confidence, timeline.
Never returns unexplained answers.
"""
from __future__ import annotations
import re
from typing import List, Dict, Optional, Any
from datetime import datetime

from app.models.memory import MemoryNode, MemoryEdge


def _find_path(
    from_id: str,
    to_id: str,
    edges: List[MemoryEdge],
    max_depth: int = 3,
) -> Optional[List[str]]:
    """BFS path between two nodes. Returns list of [from_id, ..., to_id] or None."""
    if from_id == to_id:
        return [from_id]
    queue = [[from_id]]
    visited = {from_id}
    while queue:
        path = queue.pop(0)
        if len(path) > max_depth:
            continue
        current = path[-1]
        for edge in edges:
            if not edge.is_active:
                continue
            neighbor = None
            if edge.source == current:
                neighbor = edge.target
            elif edge.target == current:
                neighbor = edge.source
            if not neighbor or neighbor in visited:
                continue
            new_path = path + [neighbor]
            if neighbor == to_id:
                return new_path
            visited.add(neighbor)
            queue.append(new_path)
    return None


def _why_selected(node: MemoryNode, query: str, score: float) -> str:
    """Generate a human-readable explanation of why this memory was selected."""
    query_terms = set(re.findall(r'\b\w{3,}\b', query.lower()))
    content_terms = set(re.findall(r'\b\w{3,}\b', node.content.lower()))
    matched = query_terms & content_terms

    reasons = []
    if matched:
        reasons.append(f"matched query terms: {', '.join(list(matched)[:3])}")
    if node.retrieval_count > 3:
        reasons.append(f"retrieved {node.retrieval_count} times previously")
    if node.is_pinned:
        reasons.append("pinned by user")
    if node.positive_feedback > 0:
        reasons.append(f"{node.positive_feedback} positive feedback(s)")
    if node.confidence > 0.9:
        reasons.append(f"high confidence ({node.confidence:.0%})")
    if node.importance_score > 1.5:
        reasons.append("high importance score")
    if not reasons:
        reasons.append("graph neighborhood relevance")

    return "; ".join(reasons)


def build_explanation(
    memories: List[MemoryNode],
    query: str,
    edges: List[MemoryEdge],
    scores: List[float] = None,
) -> Dict[str, Any]:
    """
    Returns a structured explanation for the recall result.
    """
    if not memories:
        return {
            "sources": [],
            "summary": "No memories were retrieved for this query.",
            "relationship_paths": [],
            "timeline": [],
            "avg_confidence": 0.0,
        }

    scores = scores or [1.0] * len(memories)
    sources = []
    for mem, score in zip(memories, scores):
        sources.append({
            "id": mem.id,
            "content": mem.content,
            "subject": mem.subject or mem.type,
            "confidence": mem.confidence,
            "importance_score": mem.importance_score,
            "retrieval_count": mem.retrieval_count,
            "relevance_score": round(score, 3),
            "why_selected": _why_selected(mem, query, score),
            "created_at": mem.created_at.isoformat(),
            "version": mem.version,
            "is_pinned": mem.is_pinned,
            "tags": mem.tags,
        })

    # Relationship paths between top memories (if multiple)
    paths = []
    if len(memories) >= 2:
        for i in range(min(3, len(memories) - 1)):
            path = _find_path(memories[i].id, memories[i + 1].id, edges)
            if path and len(path) > 1:
                paths.append({
                    "from": memories[i].content[:40],
                    "to": memories[i + 1].content[:40],
                    "hops": len(path) - 1,
                    "path": path,
                })

    # Timeline
    timeline = sorted(
        [{"content": m.content[:60], "date": m.created_at.isoformat(), "subject": m.subject} for m in memories],
        key=lambda x: x["date"],
    )

    avg_conf = sum(m.confidence for m in memories) / len(memories)
    top = memories[0]
    summary = (
        f"Retrieved {len(memories)} memor{'y' if len(memories) == 1 else 'ies'} "
        f"(avg confidence {avg_conf:.0%}). "
        f"Top match: '{top.content[:60]}' — {_why_selected(top, query, scores[0])}."
    )

    return {
        "sources": sources,
        "summary": summary,
        "relationship_paths": paths,
        "timeline": timeline,
        "avg_confidence": round(avg_conf, 3),
        "memory_count": len(memories),
    }
