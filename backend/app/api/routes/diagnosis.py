from fastapi import APIRouter
from app.services import mri_monitor

router = APIRouter(prefix="/diagnosis", tags=["diagnosis"])


def get_cached_or_fresh():
    """Used by surgery and repair routes to get the latest diagnosis."""
    pathology = mri_monitor.get_pathology()
    if not pathology:
        _, pathology = mri_monitor.force_scan()
    return pathology


def get_last_report():
    return mri_monitor.get_pathology()


@router.get("")
def get_diagnosis():
    return get_cached_or_fresh().model_dump()
