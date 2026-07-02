"""
Graph Reasoning — combines keyword search with BFS graph traversal.
Recall uses: Jaccard similarity + graph neighborhood + relationship weights + importance.
"""
from __future__ import annotations
import re
from typing import Dict, List, Set, Tuple
from app.models.memory import MemoryNode, MemoryEdge

# Edge relationship weights: more semantically meaningful = higher weight
RELATIONSHIP_WEIGHTS = {
    "REPLACED_BY": 0.9,
    "DECISION_FOR": 0.85,
    "DEPENDS_ON": 0.8,
    "CAUSES": 0.75,
    "BELONGS_TO": 0.7,
    "WORKED_WITH": 0.65,
    "REFERENCES": 0.6,
    "supersedes": 0.8,
    "updates": 0.75,
    "related_to": 0.5,
    "contradicts": 0.3,  # low weight — contradiction is suspicious
    "supports": 0.7,
    "RELATED_TO": 0.5,
    "CREATED": 0.6,
    "UPDATED": 0.7,
    "SUPERSEDED": 0.9,
}


def _term_score(query_terms: Set[str], node: MemoryNode) -> float:
    content_terms = set(re.findall(r'\w+', node.content.lower()))
    tag_terms = set(re.findall(r'\w+', ' '.join(node.tags).lower()))
    all_terms = content_terms | tag_terms
    intersection = query_terms & all_terms
    if not intersection:
        return 0.0
    return len(intersection) / len(query_terms | all_terms)


def _get_neighbors(node_id: str, edges: List[MemoryEdge], depth: int = 2) -> Dict[str, float]:
    """BFS graph traversal: returns {node_id: relevance_decay} up to `depth` hops."""
    visited: Dict[str, float] = {node_id: 1.0}
    queue = [(node_id, 1.0, 0)]

    while queue:
        current_id, current_weight, current_depth = queue.pop(0)
        if current_depth >= depth:
            continue
        for edge in edges:
            if not edge.is_active:
                continue
            neighbor_id = None
            if edge.source == current_id:
                neighbor_id = edge.target
            elif edge.target == current_id:
                neighbor_id = edge.source
            if not neighbor_id or neighbor_id in visited:
                continue
            rel_weight = RELATIONSHIP_WEIGHTS.get(edge.relationship, 0.5)
            propagated = current_weight * rel_weight * 0.6  # decay per hop
            if propagated < 0.05:
                continue
            visited[neighbor_id] = propagated
            queue.append((neighbor_id, propagated, current_depth + 1))

    return visited


def recall_with_graph(
    query: str,
    nodes: Dict[str, MemoryNode],
    edges: List[MemoryEdge],
    limit: int = 8,
) -> List[Tuple[float, MemoryNode]]:
    """
    Multi-factor recall:
    score = (0.40 * jaccard) + (0.30 * importance) + (0.30 * graph_proximity)
    """
    if not query.strip():
        return []

    query_terms = set(re.findall(r'\w+', query.lower()))
    if not query_terms:
        return []

    # Phase 1: keyword candidates
    candidates: Dict[str, float] = {}
    for node in nodes.values():
        if node.is_deleted or node.is_outdated:
            continue
        score = _term_score(query_terms, node)
        if score > 0:
            candidates[node.id] = score

    # Phase 2: for each candidate, get graph neighbors
    all_candidates: Dict[str, float] = dict(candidates)
    for nid, seed_score in list(candidates.items()):
        neighbors = _get_neighbors(nid, edges, depth=2)
        for neighbor_id, proximity in neighbors.items():
            if neighbor_id in all_candidates:
                all_candidates[neighbor_id] = max(all_candidates[neighbor_id], seed_score * proximity)
            else:
                all_candidates[neighbor_id] = seed_score * proximity * 0.5  # discount graph-only hits

    # Phase 3: final scoring with importance
    scored: List[Tuple[float, MemoryNode]] = []
    for nid, base_score in all_candidates.items():
        node = nodes.get(nid)
        if not node or node.is_deleted or node.is_outdated:
            continue
        keyword_component = _term_score(query_terms, node)
        importance_component = min(1.0, node.importance_score / 2.0)
        graph_component = min(1.0, base_score)
        final = (0.40 * keyword_component) + (0.30 * importance_component) + (0.30 * graph_component)
        if final > 0.01:
            scored.append((final, node))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:limit]
