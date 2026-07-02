from pydantic import BaseModel
from typing import List, Optional


class MemoryDisease(BaseModel):
    id: str
    type: str  # memory_rot | contamination | fragmentation | amnesia | bias | noise
    severity: float  # 0.0 - 1.0
    confidence: float
    affected_node_ids: List[str]
    description: str
    suggestion: str
    repair_actions: List[str]  # forget | remember | improve | reconnect | boost | normalize


class DiagnosisReport(BaseModel):
    total_diseases: int
    diseases: List[MemoryDisease]
    most_critical: Optional[str]
    summary: str


class RepairRequest(BaseModel):
    disease_id: str
    action: str  # apply_suggested | forget_nodes | boost_nodes | reconnect | normalize


class RepairResult(BaseModel):
    success: bool
    action_taken: str
    affected_nodes: List[str]
    message: str
