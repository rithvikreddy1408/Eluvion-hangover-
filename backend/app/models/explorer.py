from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class ExplorerNode(BaseModel):
    id: str
    content: str
    subject: str
    type: str
    category: str
    tags: List[str]
    confidence: float
    importance_score: float
    retrieval_count: int
    version: int
    is_pinned: bool
    is_outdated: bool
    created_at: datetime
    updated_at: Optional[datetime]
    edge_count: int = 0

class ExplorerResult(BaseModel):
    category: str
    items: List[ExplorerNode]
    total: int
