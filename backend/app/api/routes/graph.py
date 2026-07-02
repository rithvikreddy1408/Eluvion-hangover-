from fastapi import APIRouter
from app.services.store import active_store

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("")
def get_graph():
    return active_store.get_graph()
