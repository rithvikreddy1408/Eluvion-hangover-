"""
Evolution Service — autonomous background memory improvement.
Runs during idle periods (no requests for 60s). Non-destructive.
Jobs: merge duplicates, decay stale memories, strengthen frequently-retrieved ones.
"""
from __future__ import annotations
import asyncio
import re
from datetime import datetime, timedelta
from typing import Dict, Optional

_status: Dict = {
    "running": False,
    "current_job": None,
    "last_merge": None,
    "last_decay": None,
    "last_strengthen": None,
    "total_merged": 0,
    "total_decayed": 0,
    "total_strengthened": 0,
    "last_importance_recalc": None,
    "last_contradiction_scan": None,
    "last_edge_repair": None,
    "total_importance_recalcs": 0,
    "total_contradictions_found": 0,
    "total_edges_repaired": 0,
}

_IDLE_THRESHOLD = 60  # seconds idle before evolution activates
_last_request_time: Optional[datetime] = None


def mark_request():
    """Reset idle clock — call from any active API request."""
    global _last_request_time
    _last_request_time = datetime.utcnow()


def get_status() -> Dict:
    return {
        **_status,
        "last_merge": _status["last_merge"].isoformat() if _status["last_merge"] else None,
        "last_decay": _status["last_decay"].isoformat() if _status["last_decay"] else None,
        "last_strengthen": _status["last_strengthen"].isoformat() if _status["last_strengthen"] else None,
        "last_importance_recalc": _status["last_importance_recalc"].isoformat() if _status["last_importance_recalc"] else None,
        "last_contradiction_scan": _status["last_contradiction_scan"].isoformat() if _status["last_contradiction_scan"] else None,
        "last_edge_repair": _status["last_edge_repair"].isoformat() if _status["last_edge_repair"] else None,
    }


def run_merge() -> Dict:
    """Find near-duplicate nodes (>75% term overlap, same subject) and merge them."""
    from app.services.store import active_store
    node_list = list(active_store.nodes.values())
    merged_ids: set = set()
    merged = 0

    for i, a in enumerate(node_list):
        if a.id in merged_ids:
            continue
        for b in node_list[i + 1:]:
            if b.id in merged_ids:
                continue
            if a.subject != b.subject or not a.subject:
                continue
            a_terms = set(re.findall(r'\w+', a.content.lower()))
            b_terms = set(re.findall(r'\w+', b.content.lower()))
            if not a_terms or not b_terms:
                continue
            overlap = len(a_terms & b_terms) / len(a_terms | b_terms)
            if overlap < 0.75:
                continue
            # Keep higher-confidence node
            keep, drop = (a, b) if a.confidence >= b.confidence else (b, a)
            keep.retrieval_count += drop.retrieval_count
            keep.confidence = round(min(1.0, max(keep.confidence, drop.confidence)), 3)
            # Redirect edges
            for edge in active_store.edges:
                if edge.source == drop.id:
                    edge.source = keep.id
                if edge.target == drop.id:
                    edge.target = keep.id
            active_store.nodes.pop(drop.id, None)
            merged_ids.add(drop.id)
            merged += 1

    _status["last_merge"] = datetime.utcnow()
    _status["total_merged"] += merged
    return {"merged": merged}


def run_decay() -> Dict:
    """Gently reduce confidence of memories not retrieved in >30 days."""
    from app.services.store import active_store
    cutoff = datetime.utcnow() - timedelta(days=30)
    decayed = 0

    for node in active_store.nodes.values():
        if node.last_retrieved and node.last_retrieved > cutoff:
            continue
        if node.created_at > cutoff:
            continue
        if node.retrieval_count > 5:
            continue
        days = max(1, (datetime.utcnow() - node.created_at).days)
        node.confidence = round(max(0.05, node.confidence * (0.99 ** days)), 3)
        decayed += 1

    _status["last_decay"] = datetime.utcnow()
    _status["total_decayed"] += decayed
    return {"decayed": decayed}


def run_strengthen() -> Dict:
    """Boost confidence of the top 20% most-retrieved memories."""
    from app.services.store import active_store
    counts = [n.retrieval_count for n in active_store.nodes.values() if n.retrieval_count > 0]
    if not counts:
        return {"strengthened": 0}

    threshold = sorted(counts)[-max(1, len(counts) // 5)]
    strengthened = 0

    for node in active_store.nodes.values():
        if node.retrieval_count >= threshold and node.retrieval_count >= 3:
            node.confidence = round(min(1.0, node.confidence * 1.05), 3)
            strengthened += 1

    _status["last_strengthen"] = datetime.utcnow()
    _status["total_strengthened"] += strengthened
    return {"strengthened": strengthened}


def run_importance_recalc() -> Dict:
    """Recalculate importance scores across all nodes."""
    try:
        from app.services.importance_engine import recalculate_all
        from app.services.store import active_store
        updated = recalculate_all(active_store)
        return {"updated": updated}
    except Exception as e:
        return {"updated": 0, "error": str(e)}


def run_contradiction_scan() -> Dict:
    """Scan for undetected contradictions in existing nodes."""
    from app.services.store import active_store
    from app.services.contradiction_service import check_contradiction
    node_list = [n for n in active_store.nodes.values() if not n.is_deleted and not n.is_outdated]
    found = 0
    for i, a in enumerate(node_list):
        for b in node_list[i + 1:]:
            if a.subject != b.subject or not a.subject:
                continue
            record = check_contradiction(b, {a.id: a})
            if record:
                found += 1
    _status["last_contradiction_scan"] = datetime.utcnow()
    _status["total_contradictions_found"] += found
    return {"contradictions_found": found}


def run_broken_edge_repair() -> Dict:
    """Remove edges pointing to deleted or non-existent nodes."""
    from app.services.store import active_store
    before = len(active_store.edges)
    active_store.edges = [
        e for e in active_store.edges
        if e.source in active_store.nodes
        and e.target in active_store.nodes
        and not active_store.nodes[e.source].is_deleted
        and not active_store.nodes[e.target].is_deleted
    ]
    repaired = before - len(active_store.edges)
    return {"edges_repaired": repaired}


async def _evolution_loop():
    _status["running"] = True
    while True:
        await asyncio.sleep(60)

        # Only run when system is idle
        if _last_request_time:
            idle = (datetime.utcnow() - _last_request_time).total_seconds()
            if idle < _IDLE_THRESHOLD:
                continue

        try:
            from app.services.store import active_store
            if len(active_store.nodes) < 3:
                continue

            _status["current_job"] = "merge"
            run_merge()

            _status["current_job"] = "strengthen"
            run_strengthen()

            _status["current_job"] = "decay"
            run_decay()

            _status["current_job"] = "importance_recalc"
            r = run_importance_recalc()
            _status["total_importance_recalcs"] += r.get("updated", 0)
            _status["last_importance_recalc"] = datetime.utcnow()

            _status["current_job"] = "edge_repair"
            r2 = run_broken_edge_repair()
            _status["total_edges_repaired"] += r2.get("edges_repaired", 0)
            _status["last_edge_repair"] = datetime.utcnow()

            _status["current_job"] = None

            from app.services import mri_monitor
            mri_monitor.force_scan()

        except Exception as e:
            print(f"[evolution] error: {e}")
            _status["current_job"] = None


def start_evolution():
    """Call from FastAPI startup to launch the evolution background loop."""
    asyncio.create_task(_evolution_loop())
