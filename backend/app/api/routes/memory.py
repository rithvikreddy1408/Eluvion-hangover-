from fastapi import APIRouter, HTTPException
from app.models.memory import AddMemoryRequest
from app.services.store import active_store

router = APIRouter(prefix="/memories", tags=["memory"])


@router.get("")
def list_memories():
    return {"memories": [n.model_dump() for n in active_store.nodes.values()]}


@router.post("")
def add_memory(req: AddMemoryRequest):
    node = active_store.remember(
        content=req.content, subject=req.subject, tags=req.tags,
        node_type=req.type, confidence=req.confidence, source=req.source,
    )
    return node.model_dump()


@router.delete("")
def clear_all_memories():
    ids = list(active_store.nodes.keys())
    for node_id in ids:
        active_store.forget(node_id)
    return {"success": True, "deleted": len(ids)}


@router.delete("/{node_id}")
def forget_memory(node_id: str):
    success = active_store.forget(node_id)
    if not success:
        raise HTTPException(404, "Memory not found")
    return {"success": True, "id": node_id}


@router.get("/timeline")
def get_timeline():
    return {"events": active_store.get_timeline()}


@router.post("/seed")
def seed_demo():
    active_store.seed_demo()
    return {"success": True, "node_count": len(active_store.nodes)}


@router.post("/{node_id}/pin")
def pin_memory(node_id: str):
    if hasattr(active_store, 'pin_memory'):
        success = active_store.pin_memory(node_id)
    else:
        node = active_store.nodes.get(node_id)
        if node:
            node.is_pinned = True
            success = True
        else:
            success = False
    if not success:
        raise HTTPException(404, "Memory not found")
    return {"success": True, "id": node_id}


@router.post("/{node_id}/unpin")
def unpin_memory(node_id: str):
    if hasattr(active_store, 'unpin_memory'):
        success = active_store.unpin_memory(node_id)
    else:
        node = active_store.nodes.get(node_id)
        if node:
            node.is_pinned = False
            success = True
        else:
            success = False
    if not success:
        raise HTTPException(404, "Memory not found")
    return {"success": True, "id": node_id}


@router.post("/{node_id}/restore")
def restore_memory(node_id: str):
    if hasattr(active_store, 'restore_memory'):
        success = active_store.restore_memory(node_id)
    else:
        success = False
    if not success:
        raise HTTPException(404, "Memory not found or not deleted")
    return {"success": True, "id": node_id}
