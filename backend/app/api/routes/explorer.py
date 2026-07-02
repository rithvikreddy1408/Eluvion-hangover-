from fastapi import APIRouter
from typing import List, Optional
from app.models.explorer import ExplorerResult, ExplorerNode
from datetime import datetime

router = APIRouter(prefix="/explorer", tags=["explorer"])

CATEGORIES = ["person", "project", "task", "document", "preference", "conversation", "fact"]


def _get_items(store, category: str):
    """Get memory items by category — works for both MemoryStore and CogneeAdapter."""
    if hasattr(store, 'get_explorer_items'):
        return store.get_explorer_items(category)
    # Fallback: filter nodes dict by category field or type
    try:
        nodes = [n for n in store.nodes.values()
                 if not getattr(n, 'is_deleted', False)]
        if category != 'fact':
            nodes = [n for n in nodes
                     if getattr(n, 'category', '') == category
                     or n.type == category]
        return sorted(nodes, key=lambda n: getattr(n, 'importance_score', n.confidence), reverse=True)
    except Exception:
        return []


@router.get("", response_model=List[ExplorerResult])
def get_explorer(category: Optional[str] = None):
    from app.services.store import active_store
    results = []
    cats = [category] if category else CATEGORIES

    edge_counts = {}
    try:
        for edge in active_store.edges:
            edge_counts[edge.source] = edge_counts.get(edge.source, 0) + 1
            edge_counts[edge.target] = edge_counts.get(edge.target, 0) + 1
    except Exception:
        pass

    for cat in cats:
        items = _get_items(active_store, cat)
        if not items:
            continue
        nodes = []
        for n in items:
            try:
                nodes.append(ExplorerNode(
                    id=n.id,
                    content=n.content,
                    subject=getattr(n, 'subject', ''),
                    type=getattr(n, 'type', 'fact'),
                    category=getattr(n, 'category', cat) or cat,
                    tags=getattr(n, 'tags', []),
                    confidence=getattr(n, 'confidence', 1.0),
                    importance_score=getattr(n, 'importance_score', 1.0),
                    retrieval_count=getattr(n, 'retrieval_count', 0),
                    version=getattr(n, 'version', 1),
                    is_pinned=getattr(n, 'is_pinned', False),
                    is_outdated=getattr(n, 'is_outdated', False),
                    created_at=getattr(n, 'created_at', datetime.utcnow()),
                    updated_at=getattr(n, 'updated_at', None),
                    edge_count=edge_counts.get(n.id, 0),
                ))
            except Exception:
                continue
        if nodes:
            results.append(ExplorerResult(category=cat, items=nodes, total=len(nodes)))
    return results
