from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class UserPreference(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # "library" | "architecture" | "style" | "communication" | "technology" | "avoid" | "general"
    key: str       # e.g. "database", "framework", "response_style"
    value: str     # e.g. "FastAPI", "verbose"
    strength: float = 1.0  # 0.0 - 2.0
    source: str = "explicit"  # "explicit" | "inferred"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class AddPreferenceRequest(BaseModel):
    category: str
    key: str
    value: str
    strength: float = 1.0
    source: str = "explicit"
