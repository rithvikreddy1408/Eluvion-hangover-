"""
Contradiction Service — detects conflicts when new memories enter the graph.
Never silently overwrites. Creates a ContradictionRecord for user resolution.
"""
from __future__ import annotations
import re
from typing import Dict, List, Optional
from datetime import datetime

from app.models.memory import MemoryNode, MemoryEdge
from app.models.contradiction import ContradictionRecord

_contradictions: Dict[str, ContradictionRecord] = {}

NEGATION_WORDS = {"not", "never", "no", "isn't", "wasn't", "doesn't", "don't", "neither", "nor"}
REPLACE_SIGNALS = {"changed", "updated", "now", "moved", "switched", "instead", "replaced", "new"}


def _term_overlap(a: str, b: str) -> float:
    ta = set(re.findall(r'\b\w{3,}\b', a.lower()))
    tb = set(re.findall(r'\b\w{3,}\b', b.lower()))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _is_negation_contradiction(a: str, b: str) -> bool:
    a_words = set(a.lower().split())
    b_words = set(b.lower().split())
    a_neg = bool(a_words & NEGATION_WORDS)
    b_neg = bool(b_words & NEGATION_WORDS)
    return a_neg != b_neg


def check_contradiction(
    new_node: MemoryNode,
    existing_nodes: Dict[str, MemoryNode],
) -> Optional[ContradictionRecord]:
    """
    Check if new_node contradicts any existing node.
    Returns a ContradictionRecord if a conflict is found, else None.
    """
    for node in existing_nodes.values():
        if node.id == new_node.id:
            continue
        if node.subject != new_node.subject or not new_node.subject:
            continue
        if node.is_deleted or node.is_outdated:
            continue

        overlap = _term_overlap(new_node.content, node.content)
        if overlap < 0.25:
            continue

        # Check if they say opposite things
        is_contradiction = (
            _is_negation_contradiction(new_node.content, node.content)
            or any(w in new_node.content.lower() for w in REPLACE_SIGNALS)
        )
        if not is_contradiction:
            continue

        record = ContradictionRecord(
            new_node_id=new_node.id,
            existing_node_id=node.id,
            new_content=new_node.content,
            existing_content=node.content,
            subject=new_node.subject,
            overlap_score=round(overlap, 3),
        )
        _contradictions[record.id] = record
        return record

    return None


def resolve_contradiction(
    contradiction_id: str,
    resolution: str,
    store,
) -> bool:
    """
    Apply user's chosen resolution.
    resolution: "replace" | "keep_both" | "merge" | "ignore"
    """
    record = _contradictions.get(contradiction_id)
    if not record:
        return False

    new_node = store.nodes.get(record.new_node_id)
    existing_node = store.nodes.get(record.existing_node_id)

    if resolution == "replace":
        if existing_node:
            from app.services.version_service import create_version
            create_version(existing_node, reason="Replaced by contradiction resolution", changed_by="user")
            existing_node.is_outdated = True
            existing_node.superseded_by = record.new_node_id
            existing_node.weight = 0.1
            if new_node:
                store._add_edge(existing_node.id, new_node.id, "REPLACED_BY")

    elif resolution == "merge":
        if existing_node and new_node:
            # Combine content, keep higher confidence
            combined = f"{existing_node.content}. Additionally: {new_node.content}"
            from app.services.version_service import create_version
            create_version(existing_node, reason="Merged with contradicting memory", changed_by="user")
            existing_node.content = combined
            existing_node.confidence = max(existing_node.confidence, new_node.confidence)
            existing_node.updated_at = datetime.utcnow()
            store.forget(new_node.id)

    elif resolution == "ignore":
        # Just mark new as lower confidence
        if new_node:
            new_node.confidence = min(new_node.confidence, 0.5)

    # "keep_both" — no action needed, both remain

    record.resolved = True
    record.resolution = resolution
    record.resolved_at = datetime.utcnow()
    return True


def get_all_contradictions(resolved: bool = None) -> List[ContradictionRecord]:
    records = list(_contradictions.values())
    if resolved is not None:
        records = [r for r in records if r.resolved == resolved]
    return sorted(records, key=lambda r: r.detected_at, reverse=True)


def get_contradiction(contradiction_id: str) -> Optional[ContradictionRecord]:
    return _contradictions.get(contradiction_id)
