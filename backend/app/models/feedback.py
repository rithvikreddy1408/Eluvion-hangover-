from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class FeedbackType:
    INCORRECT = "incorrect"
    PREFER = "prefer"
    AVOID = "avoid"
    OUTDATED = "outdated"
    REPLACE = "replace"
    STRENGTHEN = "strengthen"
    FORGET = "forget"
    CORRECT = "correct"

class FeedbackRequest(BaseModel):
    memory_ids: List[str]  # memory node IDs involved in the answer
    feedback_type: str     # see FeedbackType above
    message_context: str   # the original user question
    correction: Optional[str] = None  # new correct content (for "replace" type)
    session_id: str = "default"

class FeedbackResponse(BaseModel):
    success: bool
    affected_nodes: List[str]
    action_taken: str
    message: str
    new_memory_id: Optional[str] = None  # if a correction was stored
