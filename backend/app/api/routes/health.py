from fastapi import APIRouter
from app.services import mri_monitor

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def get_health():
    health = mri_monitor.get_health()
    if not health:
        health, _ = mri_monitor.force_scan()
    result = health.model_dump()
    last_scan = mri_monitor.get_last_scan()
    result["last_scan"] = last_scan.isoformat() if last_scan else None
    return result
