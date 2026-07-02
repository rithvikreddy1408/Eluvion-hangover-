from datetime import datetime
from app.models.memory import MemoryNode


def days_old(node: MemoryNode) -> int:
    return max(0, (datetime.utcnow() - node.created_at).days)
