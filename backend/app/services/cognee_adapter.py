"""
Cognee adapter — uses cognee 1.2.2 native API:
  remember → cognee.remember()  (background thread, non-blocking)
  recall   → cognee.recall()    → shadow-store keyword fallback on miss
  forget   → shadow store only  (cognee.forget() only supports dataset-level prune)
  improve  → shadow store only

Local mode : VECTOR_DB_PROVIDER=lancedb + GRAPH_DATABASE_PROVIDER=ladybug  (zero external deps)
Cloud mode : set VECTOR_DB_PROVIDER=weaviate + VECTOR_DB_URL/KEY
             and GRAPH_DATABASE_PROVIDER=neo4j + GRAPH_DB_URL/KEY in .env
"""
from __future__ import annotations

import asyncio
import concurrent.futures
import os
import threading
from datetime import datetime
from typing import Dict, List, Optional

import cognee

from app.config import settings
from app.models.memory import MemoryEdge, MemoryNode, RetrievalEvent


def _configure_cognee() -> None:
    """Configure cognee before first use.  Called once at adapter init."""

    # ── LLM ──────────────────────────────────────────────────────────────
    if settings.groq_api_key:
        os.environ["LLM_API_KEY"] = settings.groq_api_key
        os.environ["GROQ_API_KEY"] = settings.groq_api_key
        # litellm openai-compat routing: provider="openai", model="groq/<model>"
        cognee.config.set_llm_provider("openai")
        cognee.config.set_llm_model("groq/llama-3.3-70b-versatile")
        cognee.config.set_llm_api_key(settings.groq_api_key)
    elif settings.gemini_api_key:
        os.environ["LLM_API_KEY"] = settings.gemini_api_key
        os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
        model = settings.llm_model
        if settings.llm_provider == "gemini" and not model.startswith("gemini/"):
            model = f"gemini/{model}"
        cognee.config.set_llm_provider("openai")
        cognee.config.set_llm_model(model)
        cognee.config.set_llm_api_key(settings.gemini_api_key)

    # ── Embeddings (fastembed — local, no API key needed) ────────────────
    os.environ["EMBEDDING_PROVIDER"] = "fastembed"
    os.environ["EMBEDDING_MODEL"] = "BAAI/bge-small-en-v1.5"
    try:
        cognee.config.set_embedding_provider("fastembed")
        cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
    except Exception:
        pass

    # ── Skip slow connection probes at startup ───────────────────────────
    os.environ["COGNEE_SKIP_CONNECTION_TEST"] = "true"

    # ── Cognee Cloud (takes over all storage when both fields are set) ────
    if settings.cognee_api_key and settings.cognee_service_url:
        os.environ["COGNEE_API_KEY"] = settings.cognee_api_key
        os.environ["COGNEE_SERVICE_URL"] = settings.cognee_service_url
        # Connect the SDK to the cloud instance; after this all remember/recall
        # calls are transparently proxied to the remote tenant.
        try:
            _run(cognee.serve(
                url=settings.cognee_service_url,
                api_key=settings.cognee_api_key,
            ))
            print(f"[cognee] Connected to cloud: {settings.cognee_service_url}")
        except Exception as e:
            print(f"[cognee] Cloud connect failed, falling back to local: {e}")
        return  # local DB config not needed when using cloud

    # ── Local DB stack (used when cloud credentials are absent) ──────────
    cognee.config.set_vector_db_provider(settings.vector_db_provider)
    if settings.vector_db_url:
        cognee.config.set_vector_db_url(settings.vector_db_url)
        cognee.config.set_vector_db_key(settings.vector_db_key)

    cognee.config.set_graph_database_provider(settings.graph_database_provider)
    if settings.graph_db_url:
        cognee.config.set_graph_db_config({
            "graph_db_url": settings.graph_db_url,
            "graph_db_key": settings.graph_db_key,
        })


def _run(coro):
    """Run an async cognee coroutine safely from sync or async context."""
    try:
        loop = asyncio.get_running_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    except RuntimeError:
        return asyncio.run(coro)


_STOP_WORDS = {
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'on',
    'at', 'for', 'with', 'by', 'from', 'as', 'it', 'its', 'this', 'that',
    'and', 'or', 'but', 'not', 'if', 'all', 'also', 'both', 'more', 'about',
    'you', 'your', 'my', 'me', 'we', 'our', 'they', 'their', 'i', 'so',
    'what', 'which', 'who', 'how', 'when', 'where', 'why', 'use', 'uses',
    'used', 'such', 'than', 'then', 'into', 'very', 'just', 'like', 'well',
}


def _extract_keywords(text: str, n: int = 12) -> List[str]:
    """Extract top N meaningful keywords from text for tagging."""
    import re
    words = re.findall(r'[a-zA-Z][a-zA-Z0-9_\-]+', text.lower())
    freq: Dict[str, int] = {}
    for w in words:
        if w not in _STOP_WORDS and len(w) > 2:
            freq[w] = freq.get(w, 0) + 1
    return sorted(freq, key=lambda k: freq[k], reverse=True)[:n]


def _extract_text(item) -> Optional[str]:
    for attr in ("text", "chunk_text", "answer", "context"):
        val = getattr(item, attr, None)
        if val and str(val).strip() not in ("", "None"):
            return str(val).strip()
    raw = str(item).strip()
    return raw if raw and raw != "None" else None


def _to_node(item) -> Optional[MemoryNode]:
    content = _extract_text(item)
    if not content:
        return None
    words = content.split()
    subject = next((w.strip(".,!?") for w in words if w and w[0].isupper()), "")
    return MemoryNode(
        content=content,
        subject=subject,
        tags=[subject] if subject else [],
        confidence=0.90,
        retrieval_count=1,
        last_retrieved=datetime.utcnow(),
        source="cognee",
    )


def _content_fingerprint(content: str) -> str:
    """Stable hash of lowercased, whitespace-normalized content."""
    import hashlib
    return hashlib.md5(content.lower().split().__str__().encode()).hexdigest()


class CogneeAdapter:
    def __init__(self):
        _configure_cognee()
        # Shadow store — mirrors content for graph viz + pathology engine
        self.nodes: Dict[str, MemoryNode] = {}
        self.edges: List[MemoryEdge] = []
        self.retrieval_log: List[RetrievalEvent] = []
        self._seeded = False
        # Blacklist of forgotten content fingerprints — persists across
        # cloud-recall cycles so forgotten memories never resurface.
        self._forgotten_fingerprints: set = set()

    # ── Core interface ───────────────────────────────────────────────────

    def remember(self, content: str, subject: str = "", tags: List[str] = None,
                 node_type: str = "fact", confidence: float = 1.0,
                 source: str = "user_input") -> MemoryNode:
        tags = list(tags or [])
        if subject and subject not in tags:
            tags.insert(0, subject)
        # Auto-enrich tags with top content keywords so _score_local can find
        # this node via keyword match even before cloud indexing completes.
        kw_tags = _extract_keywords(content)
        for kw in kw_tags:
            if kw not in tags:
                tags.append(kw)

        # Fire cognee.remember in a background thread — KG extraction can
        # take several seconds; don't block the chat response.
        def _bg():
            try:
                _run(cognee.remember(content, dataset_name=settings.cognee_dataset))
            except Exception as e:
                print(f"[cognee.remember] {e}")

        threading.Thread(target=_bg, daemon=True).start()

        node = MemoryNode(
            content=content,
            subject=subject,
            tags=tags,
            type=node_type,
            confidence=confidence,
            source=source,
        )
        self.nodes[node.id] = node

        # Auto-link to existing nodes sharing the same subject
        for existing in list(self.nodes.values()):
            if existing.id == node.id:
                continue
            if subject and subject in existing.tags:
                if set(tags) & set(existing.tags):
                    rel = "updates" if existing.created_at < node.created_at else "related_to"
                    self._add_edge(existing.id, node.id, rel)

        return node

    def recall(self, query: str, limit: int = 8) -> List[MemoryNode]:
        """Always combine shadow-store keyword recall with cloud recall.

        Shadow store is checked first — it holds freshly saved items that the
        cloud KG may not have indexed yet (cognify is async/background).
        Cloud results are then merged in, adding any semantically relevant
        nodes not already present in the shadow store.
        """
        # 1. Shadow store — always searched (handles just-saved items)
        shadow_scored = self._score_local(query)
        result_map: Dict[str, MemoryNode] = {
            node.id: node for _, node in shadow_scored
        }

        # 2. Cloud — merged on top (semantic search for older indexed items)
        try:
            results = _run(cognee.recall(
                query_text=query,
                datasets=[settings.cognee_dataset],
            ))
            for item in (results or []):
                node = _to_node(item)
                if node and node.id not in result_map:
                    if _content_fingerprint(node.content) in self._forgotten_fingerprints:
                        continue  # never re-admit forgotten content
                    self.nodes.setdefault(node.id, node)
                    result_map[node.id] = node
        except Exception as e:
            print(f"[cognee.recall] {e}")

        # Filter out anything the user has explicitly forgotten
        filtered = {
            nid: node for nid, node in result_map.items()
            if _content_fingerprint(node.content) not in self._forgotten_fingerprints
        }

        top = list(filtered.values())[:limit]
        for n in top:
            n.retrieval_count += 1
            n.last_retrieved = datetime.utcnow()
        return top

    def forget(self, node_id: str) -> bool:
        """Remove from shadow store and permanently blacklist the content.

        Also cascade-forgets any shadow-store nodes whose content is highly
        similar to the forgotten one (e.g. auto-stored assistant paraphrases),
        so the knowledge truly disappears from all recall paths.
        """
        import re
        node = self.nodes.get(node_id)
        if not node:
            return False

        # Keywords from the forgotten content used for similarity cascade
        forgotten_words = set(re.findall(r'\w+', node.content.lower())) - _STOP_WORDS

        # Collect all nodes to forget: the target + high-overlap similar ones
        to_forget = {node_id: node}
        for nid, n in list(self.nodes.items()):
            if nid == node_id:
                continue
            other_words = set(re.findall(r'\w+', n.content.lower())) - _STOP_WORDS
            if not other_words:
                continue
            overlap = len(forgotten_words & other_words) / len(forgotten_words | other_words)
            if overlap >= 0.45:  # >45% Jaccard = same topic / paraphrase
                to_forget[nid] = n

        # Blacklist all fingerprints and remove from shadow store
        for nid, n in to_forget.items():
            self._forgotten_fingerprints.add(_content_fingerprint(n.content))
            self.nodes.pop(nid, None)

        self.edges = [e for e in self.edges
                      if e.source not in to_forget and e.target not in to_forget]

        # Try cognee.forget() for cloud purge (best-effort, 1.2.2 API)
        content_snapshot = node.content
        def _bg():
            try:
                _run(cognee.forget(data=content_snapshot,
                                   dataset_name=settings.cognee_dataset))
            except Exception as e:
                print(f"[cognee.forget] {e}")
        threading.Thread(target=_bg, daemon=True).start()

        return True

    def improve(self, node_id: str, updates: dict) -> Optional[MemoryNode]:
        """Update shadow store; cognee KG is updated lazily on next cognify."""
        node = self.nodes.get(node_id)
        if not node:
            return None
        for k, v in updates.items():
            if hasattr(node, k):
                setattr(node, k, v)
        return node

    # ── Graph helpers ────────────────────────────────────────────────────

    def _add_edge(self, source: str, target: str, relationship: str,
                  weight: float = 1.0) -> MemoryEdge:
        for e in self.edges:
            if e.source == source and e.target == target:
                e.relationship = relationship
                return e
        edge = MemoryEdge(source=source, target=target,
                          relationship=relationship, weight=weight)
        self.edges.append(edge)
        return edge

    def add_edge(self, source: str, target: str, relationship: str) -> MemoryEdge:
        return self._add_edge(source, target, relationship)

    def remove_edge(self, source: str, target: str) -> bool:
        before = len(self.edges)
        self.edges = [e for e in self.edges
                      if not (e.source == source and e.target == target)]
        return len(self.edges) < before

    def log_retrieval(self, query: str, node_ids: List[str], answer: str = ""):
        self.retrieval_log.append(
            RetrievalEvent(query=query, retrieved_node_ids=node_ids, answer=answer)
        )

    def get_graph(self) -> dict:
        return {
            "nodes": [n.model_dump() for n in self.nodes.values()],
            "edges": [e.model_dump() for e in self.edges],
        }

    def get_timeline(self) -> List[dict]:
        events = []
        for node in sorted(self.nodes.values(), key=lambda n: n.created_at):
            events.append({
                "id": node.id, "type": "memory_added",
                "content": node.content, "subject": node.subject,
                "timestamp": node.created_at.isoformat(), "tags": node.tags,
            })
        for ev in sorted(self.retrieval_log, key=lambda e: e.timestamp):
            events.append({
                "id": ev.id, "type": "memory_retrieved",
                "content": f"Query: {ev.query}",
                "timestamp": ev.timestamp.isoformat(),
                "node_count": len(ev.retrieved_node_ids),
            })
        return sorted(events, key=lambda e: e["timestamp"])

    def seed_demo(self):
        if self._seeded:
            return
        self._seeded = True
        from app.services.memory_store import MemoryStore
        tmp = MemoryStore()
        tmp.seed_demo()
        self.nodes = tmp.nodes
        self.edges = tmp.edges
        self.retrieval_log = tmp.retrieval_log

    # ── Shadow-store keyword search ──────────────────────────────────────

    def _score_local(self, query: str) -> List[tuple]:
        """Score all shadow-store nodes against query. No side effects."""
        import re
        q = set(re.findall(r'\w+', query.lower()))
        if not q:
            return []
        scored = []
        for node in self.nodes.values():
            if node.is_outdated:
                continue
            terms = set(re.findall(r'\w+', node.content.lower()))
            terms |= set(re.findall(r'\w+', ' '.join(node.tags).lower()))
            hit = q & terms
            if hit:
                scored.append((len(hit) / len(q | terms), node))
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored

    def _local_recall(self, query: str, limit: int) -> List[MemoryNode]:
        """Thin wrapper used by legacy callers."""
        results = [n for _, n in self._score_local(query)[:limit]]
        for n in results:
            n.retrieval_count += 1
            n.last_retrieved = datetime.utcnow()
        return results
