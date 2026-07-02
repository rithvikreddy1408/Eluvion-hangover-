from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class MemoryNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    subject: str = ""
    type: str = "fact"  # fact | relationship | event | preference
    tags: List[str] = []
    confidence: float = 1.0
    retrieval_count: int = 0
    last_retrieved: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source: str = "user_input"
    is_outdated: bool = False
    weight: float = 1.0  # retrieval weight, used by repair engine

    # Versioning
    version: int = 1
    previous_version_id: Optional[str] = None
    superseded_by: Optional[str] = None
    change_reason: str = ""
    changed_by: str = "user"
    updated_at: Optional[datetime] = None

    # Multi-factor importance (replaces simple confidence*weight ranking)
    importance_score: float = 1.0

    # Feedback tracking
    positive_feedback: int = 0
    negative_feedback: int = 0

    # Soft delete
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_reason: str = ""

    # Pinned / Favorite
    is_pinned: bool = False
    is_favorite: bool = False

    # Explorer category
    category: str = ""  # person | project | document | task | preference | conversation | fact


class MemoryEdge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    target: str
    relationship: str = "related_to"  # related_to | updates | contradicts | supports | supersedes
    weight: float = 1.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    updated_at: Optional[datetime] = None
    superseded_at: Optional[datetime] = None
    change_reason: str = ""


class RetrievalEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    retrieved_node_ids: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    answer: str = ""


class AddMemoryRequest(BaseModel):
    content: str
    subject: str = ""
    type: str = "fact"
    tags: List[str] = []
    confidence: float = 1.0
    source: str = "manual"


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    mode: str = "auto"   # "auto" | "general" | "memory" | "hybrid"
