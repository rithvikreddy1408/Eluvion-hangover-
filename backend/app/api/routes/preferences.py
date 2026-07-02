from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models.preference import UserPreference, AddPreferenceRequest
from app.services import preference_service

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("", response_model=List[UserPreference])
def get_preferences(category: Optional[str] = None):
    return preference_service.get_preferences(category)


@router.post("", response_model=UserPreference)
def add_preference(req: AddPreferenceRequest):
    return preference_service.add_preference(req.category, req.key, req.value, req.strength, req.source)


@router.delete("/{pref_id}")
def delete_preference(pref_id: str):
    success = preference_service.delete_preference(pref_id)
    if not success:
        raise HTTPException(status_code=404, detail="Preference not found")
    return {"success": True}
