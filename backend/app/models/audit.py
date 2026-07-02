from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime
import uuid

class AuditEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    operation: str        # "remember" | "recall" | "improve" | "forget" | "feedback" | "version" | "preference"
    node_ids: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: float = 0.0
    reason: str = ""
    changed_fields: Dict[str, Any] = {}
    session_id: str = "default"
    success: bool = True
    metadata: Dict[str, Any] = {}
