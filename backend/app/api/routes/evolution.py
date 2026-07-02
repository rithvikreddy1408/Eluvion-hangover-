from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.evolution_service import (
    get_status, run_merge, run_decay, run_strengthen,
    run_importance_recalc, run_contradiction_scan, run_broken_edge_repair,
)

router = APIRouter(prefix="/evolution", tags=["evolution"])

VALID_JOBS = {"merge", "decay", "strengthen", "all", "importance_recalc", "edge_repair", "contradiction_scan"}


class TriggerRequest(BaseModel):
    job: str  # merge | decay | strengthen | all | importance_recalc | edge_repair | contradiction_scan


@router.get("/status")
def evolution_status():
    return get_status()


@router.post("/trigger")
def trigger_evolution(req: TriggerRequest):
    if req.job not in VALID_JOBS:
        raise HTTPException(400, f"Unknown job '{req.job}'. Use: {' | '.join(sorted(VALID_JOBS))}")

    results = {}
    if req.job in ("merge", "all"):
        results["merge"] = run_merge()
    if req.job in ("strengthen", "all"):
        results["strengthen"] = run_strengthen()
    if req.job in ("decay", "all"):
        results["decay"] = run_decay()
    if req.job in ("importance_recalc", "all"):
        results["importance_recalc"] = run_importance_recalc()
    if req.job in ("edge_repair", "all"):
        results["edge_repair"] = run_broken_edge_repair()
    if req.job in ("contradiction_scan", "all"):
        results["contradiction_scan"] = run_contradiction_scan()

    from app.services import mri_monitor
    mri_monitor.force_scan()

    return {"success": True, "results": results}
