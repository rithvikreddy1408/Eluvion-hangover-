"""
Version Service — every memory edit creates a version snapshot.
Supports viewing history and rolling back to any previous version.
Never loses historical information.
"""
from __future__ import annotations
import copy
from typing import Dict, List, Optional
from datetime import datetime

from app.models.version import MemoryVersion

# version_id → MemoryVersion
_versions: Dict[str, MemoryVersion] = {}
# node_id → list of version_ids (ordered oldest→newest)
_node_version_index: Dict[str, List[str]] = {}


def create_version(node, reason: str = "", changed_by: str = "user") -> MemoryVersion:
    """Snapshot the current state of a node before modifying it."""
    history = _node_version_index.setdefault(node.id, [])
    version_number = len(history) + 1

    version = MemoryVersion(
        original_node_id=node.id,
        version_number=version_number,
        content=node.content,
        confidence=node.confidence,
        change_reason=reason,
        changed_by=changed_by,
        snapshot=node.model_dump(),
    )
    _versions[version.version_id] = version
    history.append(version.version_id)
    return version


def get_versions(node_id: str) -> List[MemoryVersion]:
    """Get all versions of a node, oldest first."""
    ids = _node_version_index.get(node_id, [])
    return [_versions[vid] for vid in ids if vid in _versions]


def get_version(version_id: str) -> Optional[MemoryVersion]:
    return _versions.get(version_id)


def rollback_to_version(node_id: str, version_id: str, store) -> Optional[object]:
    """Restore a node to a previous version. Saves current state as a new version first."""
    version = _versions.get(version_id)
    if not version or version.original_node_id != node_id:
        return None
    node = store.nodes.get(node_id)
    if not node:
        return None

    # Save current state before rollback
    create_version(node, reason=f"Pre-rollback snapshot", changed_by="system")

    # Restore fields from snapshot (preserve id and created_at)
    snap = version.snapshot
    for k, v in snap.items():
        if k not in ("id", "created_at") and hasattr(node, k):
            setattr(node, k, v)
    node.updated_at = datetime.utcnow()
    node.change_reason = f"Rolled back to version {version.version_number}"
    return node
