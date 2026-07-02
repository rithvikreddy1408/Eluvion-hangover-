"""
Memory Pathology Engine — detects memory diseases in the graph.
Each detector returns a list of MemoryDisease objects.
"""
from __future__ import annotations

import re
import uuid
from typing import Dict, List

from app.models.diagnosis import DiagnosisReport, MemoryDisease
from app.models.memory import MemoryEdge, MemoryNode
from app.services.memory_utils import days_old as _days_old


def _overlap(a: MemoryNode, b: MemoryNode) -> float:
    ta = set(t.lower() for t in a.tags)
    tb = set(t.lower() for t in b.tags)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


# ── Individual detectors ─────────────────────────────────────────────────────

def detect_memory_rot(nodes: Dict[str, MemoryNode],
                      edges: List[MemoryEdge]) -> List[MemoryDisease]:
    diseases = []
    subject_groups: Dict[str, List[MemoryNode]] = {}

    for node in nodes.values():
        key = node.subject or (node.tags[0] if node.tags else None)
        if not key:
            continue
        subject_groups.setdefault(key, []).append(node)

    for subject, group in subject_groups.items():
        if len(group) < 2:
            continue
        sorted_g = sorted(group, key=lambda n: n.created_at)
        older = sorted_g[0]
        newer = sorted_g[-1]

        if older.retrieval_count <= 0:
            continue
        if _days_old(older) < 14:
            continue

        ratio = older.retrieval_count / max(1, newer.retrieval_count)
        if ratio < 1.5:
            continue

        severity = min(0.99, (ratio - 1) * 0.25)
        diseases.append(MemoryDisease(
            id=str(uuid.uuid4()),
            type="memory_rot",
            severity=round(severity, 2),
            confidence=round(min(0.99, 0.6 + severity * 0.4), 2),
            affected_node_ids=[older.id, newer.id],
            description=(
                f"Outdated memory about '{subject}' dominates retrieval "
                f"({older.retrieval_count}x) over the newer verified memory ({newer.retrieval_count}x)."
            ),
            suggestion=f"Forget the stale '{subject}' memory and boost the newer one.",
            repair_actions=["forget_nodes", "boost_nodes"],
        ))

    return diseases


def detect_contamination(nodes: Dict[str, MemoryNode],
                         edges: List[MemoryEdge]) -> List[MemoryDisease]:
    diseases = []
    contradiction_pairs = set()

    for edge in edges:
        if edge.relationship != "contradicts":
            continue
        src = nodes.get(edge.source)
        tgt = nodes.get(edge.target)
        if not src or not tgt:
            continue
        pair_key = tuple(sorted([src.id, tgt.id]))
        if pair_key in contradiction_pairs:
            continue
        contradiction_pairs.add(pair_key)

        severity = round(1.0 - min(src.confidence, tgt.confidence), 2)
        diseases.append(MemoryDisease(
            id=str(uuid.uuid4()),
            type="contamination",
            severity=max(0.3, severity),
            confidence=0.90,
            affected_node_ids=[src.id, tgt.id],
            description=(
                f"Contradicting memories are cross-linked: "
                f"'{src.content[:50]}…' vs '{tgt.content[:50]}…'"
            ),
            suggestion="Disconnect conflicting edge and mark lower-confidence memory as outdated.",
            repair_actions=["disconnect_edge", "mark_outdated"],
        ))

    # Also scan unlinked contradictions by keyword heuristic
    node_list = list(nodes.values())
    for i, a in enumerate(node_list):
        for b in node_list[i + 1:]:
            if a.subject != b.subject or not a.subject:
                continue
            already = any(
                (e.source == a.id and e.target == b.id) or
                (e.source == b.id and e.target == a.id)
                for e in edges
            )
            if already:
                continue
            neg_words = {"not", "never", "no", "isn't", "wasn't", "doesn't"}
            a_neg = bool(set(a.content.lower().split()) & neg_words)
            b_neg = bool(set(b.content.lower().split()) & neg_words)
            if a_neg != b_neg and _overlap(a, b) > 0.4:
                diseases.append(MemoryDisease(
                    id=str(uuid.uuid4()),
                    type="contamination",
                    severity=0.55,
                    confidence=0.65,
                    affected_node_ids=[a.id, b.id],
                    description=f"Potential hidden contradiction between memories about '{a.subject}'.",
                    suggestion="Review and resolve the conflicting statements.",
                    repair_actions=["mark_outdated"],
                ))

    return diseases


def detect_fragmentation(nodes: Dict[str, MemoryNode],
                         edges: List[MemoryEdge]) -> List[MemoryDisease]:
    diseases = []
    edge_pairs = {(e.source, e.target) for e in edges} | \
                 {(e.target, e.source) for e in edges}

    node_list = list(nodes.values())
    for i, a in enumerate(node_list):
        for b in node_list[i + 1:]:
            if (a.id, b.id) in edge_pairs:
                continue
            ov = _overlap(a, b)
            if ov < 0.35:
                continue
            diseases.append(MemoryDisease(
                id=str(uuid.uuid4()),
                type="fragmentation",
                severity=round(ov * 0.7, 2),
                confidence=round(0.5 + ov * 0.4, 2),
                affected_node_ids=[a.id, b.id],
                description=(
                    f"Related memories are disconnected — "
                    f"'{a.content[:40]}…' and '{b.content[:40]}…' share {int(ov*100)}% tag overlap but have no edge."
                ),
                suggestion="Reconnect these memories so the agent can traverse the knowledge graph.",
                repair_actions=["reconnect"],
            ))

    return diseases


def detect_amnesia(nodes: Dict[str, MemoryNode],
                   edges: List[MemoryEdge]) -> List[MemoryDisease]:
    diseases = []
    for node in nodes.values():
        age = _days_old(node)
        if age < 30 or node.retrieval_count > 0:
            continue
        diseases.append(MemoryDisease(
            id=str(uuid.uuid4()),
            type="amnesia",
            severity=round(min(0.9, age / 365), 2),
            confidence=0.80,
            affected_node_ids=[node.id],
            description=(
                f"Memory '{node.content[:60]}…' has never been retrieved "
                f"despite being {age} days old."
            ),
            suggestion="Boost retrieval weight so the memory becomes discoverable.",
            repair_actions=["boost_nodes"],
        ))
    return diseases


def detect_bias(nodes: Dict[str, MemoryNode],
                edges: List[MemoryEdge]) -> List[MemoryDisease]:
    if not nodes:
        return []
    counts = [n.retrieval_count for n in nodes.values()]
    mean = sum(counts) / len(counts)
    if mean == 0:
        return []

    diseases = []
    for node in nodes.values():
        if node.retrieval_count < 5:
            continue
        ratio = node.retrieval_count / mean
        if ratio < 3.0:
            continue
        severity = round(min(0.95, (ratio - 3) * 0.1 + 0.4), 2)
        diseases.append(MemoryDisease(
            id=str(uuid.uuid4()),
            type="bias",
            severity=severity,
            confidence=0.85,
            affected_node_ids=[node.id],
            description=(
                f"Memory '{node.content[:60]}…' is retrieved {ratio:.1f}× more often than average, "
                f"biasing the agent's responses."
            ),
            suggestion="Normalise retrieval weight to reduce over-reliance on this memory.",
            repair_actions=["normalize"],
        ))
    return diseases


def detect_noise(nodes: Dict[str, MemoryNode],
                 retrieval_log: list) -> List[MemoryDisease]:
    if not retrieval_log:
        return []

    from collections import defaultdict
    noise_counts: Dict[str, int] = defaultdict(int)
    retrieve_counts: Dict[str, int] = defaultdict(int)

    for event in retrieval_log:
        query_terms = set(re.findall(r'\w+', event.query.lower()))
        for nid in event.retrieved_node_ids:
            node = nodes.get(nid)
            if not node:
                continue
            retrieve_counts[nid] += 1
            node_terms = set(re.findall(r'\w+', node.content.lower()))
            node_terms |= set(re.findall(r'\w+', ' '.join(node.tags).lower()))
            overlap = len(query_terms & node_terms) / max(1, len(query_terms))
            if overlap < 0.15:
                noise_counts[nid] += 1

    diseases = []
    for nid, noise in noise_counts.items():
        total = retrieve_counts.get(nid, 1)
        ratio = noise / total
        if ratio < 0.5:
            continue
        node = nodes.get(nid)
        if not node:
            continue
        diseases.append(MemoryDisease(
            id=str(uuid.uuid4()),
            type="noise",
            severity=round(ratio * 0.7, 2),
            confidence=0.70,
            affected_node_ids=[nid],
            description=(
                f"Memory '{node.content[:60]}…' was retrieved as noise in {int(ratio*100)}% of its retrievals."
            ),
            suggestion="Reduce retrieval weight or add precise tags to prevent noise retrieval.",
            repair_actions=["normalize"],
        ))
    return diseases


# ── Master diagnosis ─────────────────────────────────────────────────────────

def run_diagnosis(nodes: Dict[str, MemoryNode],
                  edges: List[MemoryEdge],
                  retrieval_log: list) -> DiagnosisReport:
    all_diseases: List[MemoryDisease] = []
    all_diseases.extend(detect_memory_rot(nodes, edges))
    all_diseases.extend(detect_contamination(nodes, edges))
    all_diseases.extend(detect_fragmentation(nodes, edges))
    all_diseases.extend(detect_amnesia(nodes, edges))
    all_diseases.extend(detect_bias(nodes, edges))
    all_diseases.extend(detect_noise(nodes, retrieval_log))

    all_diseases.sort(key=lambda d: d.severity, reverse=True)
    most_critical = all_diseases[0].type if all_diseases else None

    summaries = {
        "memory_rot": "Outdated memories are overshadowing newer facts.",
        "contamination": "Contradictory memories are cross-contaminating the graph.",
        "fragmentation": "Related knowledge clusters are disconnected.",
        "amnesia": "Important memories are unreachable.",
        "bias": "Certain memories dominate retrieval unfairly.",
        "noise": "Irrelevant memories pollute recall results.",
    }
    summary = summaries.get(most_critical, "Memory system is healthy.") if most_critical else \
              "No significant pathologies detected."

    return DiagnosisReport(
        total_diseases=len(all_diseases),
        diseases=all_diseases,
        most_critical=most_critical,
        summary=summary,
    )
