"""
Continuous MRI Monitor — runs pathology + health in background.
API routes read cached reports instantly instead of blocking on a scan.
"""
from __future__ import annotations
import asyncio
from datetime import datetime
from typing import Optional, Tuple

from app.models.diagnosis import DiagnosisReport
from app.models.health import MemoryHealthReport

_health_cache: Optional[MemoryHealthReport] = None
_pathology_cache: Optional[DiagnosisReport] = None
_last_scan: Optional[datetime] = None

SCAN_INTERVAL = 30  # seconds


def get_health() -> Optional[MemoryHealthReport]:
    return _health_cache


def get_pathology() -> Optional[DiagnosisReport]:
    return _pathology_cache


def get_last_scan() -> Optional[datetime]:
    return _last_scan


def force_scan() -> Tuple[MemoryHealthReport, DiagnosisReport]:
    global _health_cache, _pathology_cache, _last_scan
    from app.services.store import active_store
    from app.services.pathology_engine import run_diagnosis
    from app.services.health_engine import compute_health

    report = run_diagnosis(active_store.nodes, active_store.edges, active_store.retrieval_log)
    health = compute_health(active_store.nodes, active_store.edges, report.diseases)
    _pathology_cache = report
    _health_cache = health
    _last_scan = datetime.utcnow()
    return health, report


async def _scan_loop():
    while True:
        try:
            force_scan()
        except Exception as e:
            print(f"[MRI] scan error: {e}")
        await asyncio.sleep(SCAN_INTERVAL)


def start_monitor():
    """Call from FastAPI startup to launch continuous background scan."""
    asyncio.create_task(_scan_loop())
