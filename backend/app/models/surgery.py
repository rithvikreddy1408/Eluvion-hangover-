from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid


class RepairOperation(BaseModel):
    op_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    op_type: str              # forget | boost | normalize | reconnect | mark_outdated
    node_id: str
    description: str
    before_state: Dict[str, Any] = {}


class RepairPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    disease_id: str
    disease_type: str
    operations: List[RepairOperation]
    estimated_improvement: float
    risk_level: str           # low | medium | high
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DiffEntry(BaseModel):
    node_id: str
    change_type: str          # modified | removed | added
    field: str
    before: Any
    after: Any


class RepairSimulation(BaseModel):
    plan_id: str
    diff: List[DiffEntry]
    predicted_score_change: float
    risks: List[str]
    safe_to_execute: bool


class RepairSnapshot(BaseModel):
    snapshot_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    nodes_snapshot: Dict[str, Any]
    edges_snapshot: List[Any]
    health_before: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SurgeryResult(BaseModel):
    success: bool
    plan_id: str
    snapshot_id: str
    operations_applied: int
    message: str
    health_before: float
    health_after: Optional[float] = None
