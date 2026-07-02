from pydantic import BaseModel
from typing import Dict


class MemoryHealthReport(BaseModel):
    overall_score: float
    freshness: float
    consistency: float
    graph_connectivity: float
    contradiction_score: float
    hallucination_risk: float
    total_nodes: int
    total_edges: int
    avg_retrieval_count: float
    grade: str  # A | B | C | D | F
    orphan_nodes: int = 0
    duplicate_count: int = 0
    soft_deleted_count: int = 0
    pinned_count: int = 0
    version_count: int = 0
    avg_importance: float = 0.0
    preference_count: int = 0
    contradiction_count: int = 0


class MetricDetail(BaseModel):
    name: str
    value: float
    description: str
    status: str  # healthy | warning | critical
