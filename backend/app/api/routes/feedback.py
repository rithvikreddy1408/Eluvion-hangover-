from fastapi import APIRouter, HTTPException
from app.models.feedback import FeedbackRequest, FeedbackResponse
from app.services.feedback_service import process_feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse)
def submit_feedback(request: FeedbackRequest):
    try:
        return process_feedback(request)
    except Exception as e:
        print(f"[feedback] error: {e}")
        raise HTTPException(status_code=500, detail="Feedback processing failed.")
