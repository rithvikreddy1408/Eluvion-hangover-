"""
Local in-memory graph store — mirrors the Cognee Cloud interface.
"""
from __future__ import annotations

import re
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from app.models.memory import AddMemoryRequest, MemoryEdge, MemoryNode, RetrievalEvent


class MemoryStore:
    def __init__(self):
        self.nodes: Dict[str, MemoryNode] = {}
        self._edge_index: Dict[tuple, MemoryEdge] = {}   # (source, target) → edge
        self.retrieval_log: List[RetrievalEvent] = []
        self._seeded = False
        self._pending_contradictions: List[str] = []

    @property
    def edges(self) -> List[MemoryEdge]:
        return list(self._edge_index.values())

    # ── Cognee-compatible interface ──────────────────────────────────────

    def remember(self, content: str, subject: str = "", tags: List[str] = None,
                 node_type: str = "fact", confidence: float = 1.0,
                 source: str = "user_input", category: str = "") -> MemoryNode:
        t_start = time.time()
        tags = tags or []
        if subject and subject not in tags:
            tags.insert(0, subject)

        node = MemoryNode(
            content=content,
            subject=subject,
            type=node_type,
            tags=tags,
            confidence=confidence,
            source=source,
            category=category or self._infer_category(node_type, tags, subject),
        )
        self.nodes[node.id] = node

        # Auto-link to existing nodes about same subject
        for existing in list(self.nodes.values()):
            if existing.id == node.id or existing.is_deleted:
                continue
            if subject and subject in existing.tags:
                overlap = set(tags) & set(existing.tags)
                if overlap:
                    rel = "updates" if existing.created_at < node.created_at else "related_to"
                    self._add_edge(existing.id, node.id, rel)

        # Contradiction detection
        try:
            from app.services.contradiction_service import check_contradiction
            record = check_contradiction(node, self.nodes)
            if record:
                self._pending_contradictions.append(record.id)
        except Exception:
            pass

        # Compute initial importance score
        try:
            from app.services.importance_engine import compute_importance
            node.importance_score = compute_importance(node, self.nodes, self.edges)
        except Exception:
            pass

        # Audit
        try:
            from app.services import audit_log
            audit_log.log(
                operation="remember",
                node_ids=[node.id],
                duration_ms=(time.time() - t_start) * 1000,
                reason=f"source:{source}",
            )
        except Exception:
            pass

        return node

    def recall(self, query: str, limit: int = 8) -> List[MemoryNode]:
        t_start = time.time()

        # Try graph-enhanced recall first
        try:
            from app.services.graph_reasoning import recall_with_graph
            scored = recall_with_graph(query, self.nodes, self.edges, limit=limit)
            results = [n for _, n in scored]
        except Exception:
            # Fallback: original Jaccard recall
            results = self._jaccard_recall(query, limit)
            scored = [(1.0, n) for n in results]

        # Apply user preferences to re-rank
        try:
            from app.services.preference_service import apply_to_recall
            results = apply_to_recall(results, query)
        except Exception:
            pass

        # Update retrieval stats
        for node in results:
            node.retrieval_count += 1
            node.last_retrieved = datetime.utcnow()

        self.log_retrieval(query=query, node_ids=[n.id for n in results])

        # Audit
        try:
            from app.services import audit_log
            audit_log.log(
                operation="recall",
                node_ids=[n.id for n in results],
                duration_ms=(time.time() - t_start) * 1000,
                reason=f"query:{query[:60]}",
                metadata={"result_count": len(results)},
            )
        except Exception:
            pass

        return results

    def _jaccard_recall(self, query: str, limit: int = 8) -> List[MemoryNode]:
        """Fallback keyword-only recall."""
        query_terms = set(re.findall(r'\w+', query.lower()))
        scored: List[Tuple[float, MemoryNode]] = []
        for node in self.nodes.values():
            if node.is_deleted or node.is_outdated:
                continue
            content_terms = set(re.findall(r'\w+', node.content.lower()))
            tag_terms = set(re.findall(r'\w+', ' '.join(node.tags).lower()))
            all_terms = content_terms | tag_terms
            intersection = query_terms & all_terms
            if not intersection:
                continue
            jaccard = len(intersection) / len(query_terms | all_terms)
            days_old = max(0, (datetime.utcnow() - node.created_at).days)
            recency = 1.0 / (1 + days_old * 0.05)
            score = jaccard * recency * node.weight
            scored.append((score, node))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [n for _, n in scored[:limit]]

    def forget(self, node_id: str, permanent: bool = False, reason: str = "") -> bool:
        if node_id not in self.nodes:
            return False
        t_start = time.time()
        node = self.nodes[node_id]

        if permanent:
            del self.nodes[node_id]
            self._edge_index = {
                k: e for k, e in self._edge_index.items()
                if e.source != node_id and e.target != node_id
            }
        else:
            # Soft delete — preserves history
            try:
                from app.services.version_service import create_version
                create_version(node, reason=f"soft_delete:{reason}", changed_by="user")
            except Exception:
                pass
            node.is_deleted = True
            node.deleted_at = datetime.utcnow()
            node.deleted_reason = reason or "user_deleted"

        try:
            from app.services import audit_log
            audit_log.log(
                operation="forget",
                node_ids=[node_id],
                duration_ms=(time.time() - t_start) * 1000,
                reason=f"{'permanent' if permanent else 'soft'}_delete:{reason}",
            )
        except Exception:
            pass
        return True

    def restore_memory(self, node_id: str) -> bool:
        node = self.nodes.get(node_id)
        if not node or not node.is_deleted:
            return False
        node.is_deleted = False
        node.deleted_at = None
        node.deleted_reason = ""
        node.updated_at = datetime.utcnow()
        return True

    def improve(self, node_id: str, updates: dict) -> Optional[MemoryNode]:
        node = self.nodes.get(node_id)
        if not node:
            return None
        t_start = time.time()
        try:
            from app.services.version_service import create_version
            create_version(node, reason="improve() call", changed_by="system")
        except Exception:
            pass
        for k, v in updates.items():
            if hasattr(node, k):
                setattr(node, k, v)
        node.updated_at = datetime.utcnow()
        try:
            from app.services.importance_engine import compute_importance
            node.importance_score = compute_importance(node, self.nodes, self.edges)
        except Exception:
            pass
        try:
            from app.services import audit_log
            audit_log.log(
                operation="improve",
                node_ids=[node_id],
                duration_ms=(time.time() - t_start) * 1000,
                changed_fields=updates,
            )
        except Exception:
            pass
        return node

    def pin_memory(self, node_id: str) -> bool:
        node = self.nodes.get(node_id)
        if not node:
            return False
        node.is_pinned = True
        node.updated_at = datetime.utcnow()
        return True

    def unpin_memory(self, node_id: str) -> bool:
        node = self.nodes.get(node_id)
        if not node:
            return False
        node.is_pinned = False
        node.updated_at = datetime.utcnow()
        return True

    # ── Graph helpers ────────────────────────────────────────────────────

    def _add_edge(self, source: str, target: str, relationship: str,
                  weight: float = 1.0) -> MemoryEdge:
        key = (source, target)
        if key in self._edge_index:
            edge = self._edge_index[key]
            edge.relationship = relationship
            edge.updated_at = datetime.utcnow()
            return edge
        edge = MemoryEdge(source=source, target=target,
                          relationship=relationship, weight=weight)
        self._edge_index[key] = edge
        return edge

    def add_edge(self, source: str, target: str, relationship: str) -> MemoryEdge:
        return self._add_edge(source, target, relationship)

    def remove_edge(self, source: str, target: str) -> bool:
        key = (source, target)
        if key in self._edge_index:
            del self._edge_index[key]
            return True
        return False

    def log_retrieval(self, query: str, node_ids: List[str], answer: str = ""):
        self.retrieval_log.append(
            RetrievalEvent(query=query, retrieved_node_ids=node_ids, answer=answer)
        )

    def get_graph(self) -> dict:
        visible_nodes = [n for n in self.nodes.values() if not n.is_deleted]
        return {
            "nodes": [n.model_dump() for n in visible_nodes],
            "edges": [e.model_dump() for e in self.edges if e.is_active],
        }

    def get_timeline(self) -> List[dict]:
        events = []
        for node in sorted(self.nodes.values(), key=lambda n: n.created_at):
            if node.is_deleted:
                continue
            events.append({
                "id": node.id,
                "type": "memory_added",
                "content": node.content,
                "subject": node.subject,
                "timestamp": node.created_at.isoformat(),
                "tags": node.tags,
                "category": node.category,
                "version": node.version,
            })
        for event in sorted(self.retrieval_log, key=lambda e: e.timestamp):
            events.append({
                "id": event.id,
                "type": "memory_retrieved",
                "content": f"Query: {event.query}",
                "timestamp": event.timestamp.isoformat(),
                "node_count": len(event.retrieved_node_ids),
            })
        return sorted(events, key=lambda e: e["timestamp"])

    def get_explorer_items(self, category: str = None) -> List[MemoryNode]:
        items = [n for n in self.nodes.values() if not n.is_deleted]
        if category:
            items = [n for n in items if n.category == category or
                     (not n.category and category == 'fact')]
        return sorted(items, key=lambda n: n.importance_score, reverse=True)

    def _infer_category(self, type: str, tags: List[str], subject: str) -> str:
        tags_lower = ' '.join(tags).lower()
        subject_lower = subject.lower()
        if type == "preference" or "prefer" in tags_lower or "avoid" in tags_lower:
            return "preference"
        if "project" in tags_lower or "project" in subject_lower:
            return "project"
        if "task" in tags_lower or "task" in subject_lower:
            return "task"
        if "user_profile" in tags_lower or "person" in tags_lower or "user_profile" in subject_lower:
            return "person"
        if type in ("conversation", "chat"):
            return "conversation"
        return "fact"

    # ── Demo dataset ─────────────────────────────────────────────────────

    def seed_demo(self):
        if self._seeded:
            return
        self._seeded = True

        base = datetime.utcnow()

        def _ago(days: int) -> datetime:
            return base - timedelta(days=days)

        raw = [
            # Alice — location chain (demonstrates Memory Rot)
            ("alice_paris", "Alice moved to Paris", "Alice", ["Alice", "location", "Paris"], "fact", 0.95, 180, 8, "person"),
            ("alice_tokyo", "Alice now lives in Tokyo", "Alice", ["Alice", "location", "Tokyo"], "fact", 0.99, 30, 1, "person"),
            ("alice_remote", "Alice works remotely", "Alice", ["Alice", "work", "remote"], "fact", 0.90, 120, 5, "person"),

            # Bob — contradictions (demonstrates Memory Contamination)
            ("bob_engineer", "Bob is a software engineer", "Bob", ["Bob", "profession"], "fact", 0.95, 90, 4, "person"),
            ("bob_designer", "Bob is a UI designer", "Bob", ["Bob", "profession"], "fact", 0.60, 60, 3, "person"),
            ("bob_company", "Bob works at Acme Corp", "Bob", ["Bob", "employer", "Acme"], "fact", 0.85, 75, 3, "person"),

            # Carol — fragmented memories (demonstrates Memory Fragmentation)
            ("carol_python", "Carol is an expert in Python", "Carol", ["Carol", "skill", "Python"], "fact", 0.98, 45, 2, "person"),
            ("carol_ml", "Carol specialises in machine learning", "Carol", ["Carol", "skill", "ML"], "fact", 0.95, 40, 2, "person"),
            ("carol_torch", "Carol uses PyTorch for deep learning", "Carol", ["Carol", "skill", "PyTorch", "ML"], "fact", 0.92, 35, 1, "person"),

            # Dave — amnesic memory (demonstrates Memory Amnesia)
            ("dave_project", "Dave is leading Project Orion", "Dave", ["Dave", "project", "Orion"], "fact", 0.88, 200, 0, "project"),
            ("dave_deadline", "Project Orion deadline is December 2025", "Dave", ["Dave", "project", "Orion", "deadline"], "fact", 0.85, 195, 0, "project"),

            # Eve — biased retrieval (demonstrates Memory Bias)
            ("eve_likes_coffee", "Eve likes coffee", "Eve", ["Eve", "preference", "coffee"], "preference", 0.70, 10, 15, "preference"),
            ("eve_allergic", "Eve is allergic to peanuts", "Eve", ["Eve", "health", "allergy"], "fact", 0.99, 20, 2, "person"),
            ("eve_role", "Eve is a product manager", "Eve", ["Eve", "profession"], "fact", 0.95, 15, 2, "person"),
        ]

        id_map = {}
        for slug, content, subject, tags, typ, conf, days_ago, ret_count, cat in raw:
            node = MemoryNode(
                content=content,
                subject=subject,
                tags=tags,
                type=typ,
                confidence=conf,
                retrieval_count=ret_count,
                created_at=_ago(days_ago),
                source="demo",
                category=cat,
                importance_score=round(conf * (1 + ret_count * 0.05), 3),
            )
            self.nodes[node.id] = node
            id_map[slug] = node.id

        # Edges
        edge_defs = [
            (id_map["alice_paris"], id_map["alice_tokyo"], "supersedes"),
            (id_map["alice_remote"], id_map["alice_tokyo"], "related_to"),
            (id_map["bob_engineer"], id_map["bob_designer"], "contradicts"),
            (id_map["bob_engineer"], id_map["bob_company"], "related_to"),
            # Carol — NO edge between python and ml (fragmentation gap)
            (id_map["carol_ml"], id_map["carol_torch"], "related_to"),
            (id_map["dave_project"], id_map["dave_deadline"], "supports"),
            (id_map["eve_likes_coffee"], id_map["eve_role"], "related_to"),
        ]
        for src, tgt, rel in edge_defs:
            self._add_edge(src, tgt, rel)

        # Simulate some retrieval history
        self.retrieval_log.append(RetrievalEvent(
            query="Where does Alice live?",
            retrieved_node_ids=[id_map["alice_paris"], id_map["alice_remote"]],
            answer="Alice lives in Paris and works remotely.",
        ))
        self.retrieval_log.append(RetrievalEvent(
            query="What does Bob do?",
            retrieved_node_ids=[id_map["bob_engineer"], id_map["bob_designer"]],
            answer="Bob is a software engineer.",
        ))


memory_store = MemoryStore()
