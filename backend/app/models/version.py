from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from datetime import datetime
import uuid

class MemoryVersion(BaseModel):
    version_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_node_id: str
    version_number: int
    content: str
    confidence: float
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    change_reason: str = ""
    changed_by: str = "user"
    snapshot: Dict[str, Any] = {}  # full node dump at this version
