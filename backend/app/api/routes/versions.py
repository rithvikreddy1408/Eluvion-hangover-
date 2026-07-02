from fastapi import APIRouter, HTTPException
from typing import List
from app.models.version import MemoryVersion
from app.services import version_service

router = APIRouter(prefix="/memories", tags=["versions"])
# Note: shares /memories prefix with memory.py — FastAPI routes by full path, no conflict


@router.get("/{node_id}/versions", response_model=List[MemoryVersion])
def get_memory_versions(node_id: str):
    return version_service.get_versions(node_id)


@router.post("/{node_id}/rollback/{version_id}")
def rollback_memory(node_id: str, version_id: str):
    from app.services.store import active_store
    node = version_service.rollback_to_version(node_id, version_id, active_store)
    if not node:
        raise HTTPException(status_code=404, detail="Version or node not found")
    return {"success": True, "node": node.model_dump()}
