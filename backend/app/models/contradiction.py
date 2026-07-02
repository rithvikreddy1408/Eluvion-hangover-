from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class ContradictionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    new_node_id: str
    existing_node_id: str
    new_content: str
    existing_content: str
    subject: str
    overlap_score: float
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False
    resolution: Optional[str] = None  # "replace" | "keep_both" | "merge" | "ignore"
    resolved_at: Optional[datetime] = None

class ContradictionResolutionRequest(BaseModel):
    resolution: str  # "replace" | "keep_both" | "merge" | "ignore"
