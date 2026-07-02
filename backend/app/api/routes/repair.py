from fastapi import APIRouter, HTTPException
from app.models.diagnosis import RepairRequest
from app.services.store import active_store
from app.services.repair_engine import apply_repair
from app.api.routes.diagnosis import get_cached_or_fresh, get_last_report

router = APIRouter(prefix="/repair", tags=["repair"])


@router.post("")
def repair_memory(req: RepairRequest):
    # Use cached diagnosis (same UUIDs the frontend loaded); refresh if no cache
    report = get_last_report() or get_cached_or_fresh()
    disease = next((d for d in report.diseases if d.id == req.disease_id), None)

    if not disease:
        # Frontend might have stale IDs — refresh diagnosis and retry
        report = get_cached_or_fresh()
        disease = next((d for d in report.diseases if d.id == req.disease_id), None)

    if not disease:
        raise HTTPException(404, f"Disease {req.disease_id} not found. Load the Health page first to refresh diagnosis.")

    result = apply_repair(disease, active_store, req.action)
    return result.model_dump()
