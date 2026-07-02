from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models.contradiction import ContradictionRecord, ContradictionResolutionRequest
from app.services import contradiction_service

router = APIRouter(prefix="/contradictions", tags=["contradictions"])


@router.get("", response_model=List[ContradictionRecord])
def get_contradictions(resolved: Optional[bool] = None):
    return contradiction_service.get_all_contradictions(resolved)


@router.post("/{contradiction_id}/resolve")
def resolve_contradiction(contradiction_id: str, req: ContradictionResolutionRequest):
    from app.services.store import active_store
    success = contradiction_service.resolve_contradiction(contradiction_id, req.resolution, active_store)
    if not success:
        raise HTTPException(status_code=404, detail="Contradiction not found")
    return {"success": True, "resolution": req.resolution}
