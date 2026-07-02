"""
Applies repair actions to the memory store based on a diagnosis.
"""
from __future__ import annotations

from typing import Any, Dict, List

from app.models.diagnosis import MemoryDisease, RepairResult
from app.models.memory import MemoryNode


def apply_repair(disease: MemoryDisease, store: Any, action: str) -> RepairResult:
    nodes = disease.affected_node_ids

    if action == "forget_nodes":
        forgotten = []
        for nid in nodes:
            node = store.nodes.get(nid)
            if node and node.source == "demo":
                # For demo nodes, mark as outdated rather than deleting
                node.is_outdated = True
                node.weight = 0.1
                forgotten.append(nid)
            elif node:
                store.forget(nid)
                forgotten.append(nid)
        return RepairResult(
            success=True,
            action_taken="forget_nodes",
            affected_nodes=forgotten,
            message=f"Marked {len(forgotten)} node(s) as outdated / forgotten.",
        )

    if action == "boost_nodes":
        boosted = []
        for nid in nodes:
            node = store.nodes.get(nid)
            if node:
                node.weight = min(3.0, node.weight * 2.0)
                node.retrieval_count = max(1, node.retrieval_count)
                boosted.append(nid)
        return RepairResult(
            success=True,
            action_taken="boost_nodes",
            affected_nodes=boosted,
            message=f"Boosted retrieval weight for {len(boosted)} node(s).",
        )

    if action == "reconnect":
        if len(nodes) >= 2:
            edge = store.add_edge(nodes[0], nodes[1], "related_to")
            return RepairResult(
                success=True,
                action_taken="reconnect",
                affected_nodes=nodes,
                message=f"Added 'related_to' edge between fragmented memories.",
            )
        return RepairResult(success=False, action_taken="reconnect", affected_nodes=[], message="Need at least 2 nodes.")

    if action == "disconnect_edge":
        if len(nodes) >= 2:
            removed = store.remove_edge(nodes[0], nodes[1]) or store.remove_edge(nodes[1], nodes[0])
            edge = store.add_edge(nodes[0], nodes[1], "supersedes")
            return RepairResult(
                success=True,
                action_taken="disconnect_edge",
                affected_nodes=nodes,
                message="Replaced 'contradicts' edge with 'supersedes'.",
            )

    if action == "mark_outdated":
        marked = []
        # Mark the lower-confidence one
        candidates = [store.nodes.get(nid) for nid in nodes if store.nodes.get(nid)]
        candidates.sort(key=lambda n: n.confidence)
        if candidates:
            candidates[0].is_outdated = True
            candidates[0].weight = 0.1
            marked.append(candidates[0].id)
        return RepairResult(
            success=True,
            action_taken="mark_outdated",
            affected_nodes=marked,
            message=f"Marked {len(marked)} low-confidence memory as outdated.",
        )

    if action == "normalize":
        normalized = []
        for nid in nodes:
            node = store.nodes.get(nid)
            if node:
                node.weight = 1.0
                node.retrieval_count = max(0, node.retrieval_count // 2)
                normalized.append(nid)
        return RepairResult(
            success=True,
            action_taken="normalize",
            affected_nodes=normalized,
            message=f"Normalised retrieval weight for {len(normalized)} node(s).",
        )

    if action == "apply_suggested":
        first_action = disease.repair_actions[0] if disease.repair_actions else "boost_nodes"
        return apply_repair(disease, store, first_action)

    return RepairResult(
        success=False,
        action_taken=action,
        affected_nodes=[],
        message=f"Unknown repair action: {action}",
    )
