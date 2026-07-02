from fastapi import APIRouter
from app.models.memory import ChatRequest
from app.services import agent_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
async def send_message(req: ChatRequest):
    from app.config import settings
    if not settings.gemini_api_key and not settings.groq_api_key:
        return agent_service.chat_no_key(req.message, req.session_id)
    try:
        return await agent_service.chat_async(req.message, req.session_id, req.mode)
    except Exception as e:
        err = str(e)
        print(f"[chat] error: {err[:200]}")
        if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
            result = agent_service.chat_no_key(req.message, req.session_id)
            result["warning"] = "Quota exceeded — showing raw memory recall."
            return result
        raise
