from fastapi import APIRouter
from typing import Optional, List
from app.models.audit import AuditEntry
from app.services import audit_log

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=List[AuditEntry])
def get_audit_log(limit: int = 100, operation: Optional[str] = None):
    return audit_log.get_log(limit=limit, operation=operation)


@router.get("/stats")
def get_audit_stats():
    return audit_log.get_stats()
