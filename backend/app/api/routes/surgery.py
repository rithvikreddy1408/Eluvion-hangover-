from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.surgery_service import (
    plan_surgery, simulate_surgery, execute_surgery,
    rollback_surgery, get_plans, get_plan,
)
from app.api.routes.diagnosis import get_last_report, get_cached_or_fresh

router = APIRouter(prefix="/surgery", tags=["surgery"])


class PlanRequest(BaseModel):
    disease_id: str


class SimulateRequest(BaseModel):
    plan_id: str


class ExecuteRequest(BaseModel):
    plan_id: str


class RollbackRequest(BaseModel):
    snapshot_id: str


@router.post("/plan")
def create_plan(req: PlanRequest):
    report = get_last_report() or get_cached_or_fresh()
    disease = next((d for d in report.diseases if d.id == req.disease_id), None)
    if not disease:
        raise HTTPException(404, "Disease not found — load /diagnosis first")
    plan = plan_surgery(disease)
    return plan.model_dump()


@router.post("/simulate")
def simulate_plan(req: SimulateRequest):
    sim = simulate_surgery(req.plan_id)
    if not sim:
        raise HTTPException(404, "Plan not found")
    return sim.model_dump()


@router.post("/execute")
def execute_plan(req: ExecuteRequest):
    result = execute_surgery(req.plan_id)
    if not result:
        raise HTTPException(404, "Plan not found")
    return result.model_dump()


@router.post("/rollback")
def rollback_plan(req: RollbackRequest):
    success = rollback_surgery(req.snapshot_id)
    if not success:
        raise HTTPException(404, "Snapshot not found")
    return {"success": True, "message": "Memory restored from pre-surgery snapshot."}


@router.get("/plans")
def list_plans():
    return {"plans": [p.model_dump() for p in get_plans()]}
