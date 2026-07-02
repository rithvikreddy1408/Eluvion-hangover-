"""
Audit Log — records every memory operation with timing and metadata.
Provides observability for all remember/recall/improve/forget operations.
"""
from __future__ import annotations
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.audit import AuditEntry

_log: List[AuditEntry] = []
MAX_LOG_SIZE = 1000


def log(
    operation: str,
    node_ids: List[str],
    duration_ms: float = 0.0,
    reason: str = "",
    changed_fields: Dict[str, Any] = None,
    session_id: str = "default",
    success: bool = True,
    metadata: Dict[str, Any] = None,
) -> AuditEntry:
    entry = AuditEntry(
        operation=operation,
        node_ids=node_ids,
        duration_ms=round(duration_ms, 2),
        reason=reason,
        changed_fields=changed_fields or {},
        session_id=session_id,
        success=success,
        metadata=metadata or {},
    )
    _log.append(entry)
    if len(_log) > MAX_LOG_SIZE:
        del _log[:100]
    return entry


def get_log(limit: int = 100, operation: Optional[str] = None) -> List[AuditEntry]:
    entries = _log if not operation else [e for e in _log if e.operation == operation]
    return list(reversed(entries[-limit:]))


def get_stats() -> Dict[str, Any]:
    if not _log:
        return {"total": 0, "by_operation": {}, "avg_duration_ms": 0}
    by_op: Dict[str, int] = {}
    for e in _log:
        by_op[e.operation] = by_op.get(e.operation, 0) + 1
    avg_ms = sum(e.duration_ms for e in _log) / len(_log)
    return {
        "total": len(_log),
        "by_operation": by_op,
        "avg_duration_ms": round(avg_ms, 2),
        "success_rate": round(sum(1 for e in _log if e.success) / len(_log), 3),
    }
