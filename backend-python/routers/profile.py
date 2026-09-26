from fastapi import APIRouter, Depends
from typing import Optional, Dict, Any
from models import ProfileUpdateRequest
from database import get_current_profile, upsert_profile, get_user_notifications
from dependencies import get_current_user_optional

router = APIRouter(prefix="/api/profile", tags=["Citizen Profile"])

@router.get("")
def read_profile(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else None
    profile = get_current_profile(user_id)
    return profile

@router.put("")
def update_profile(req: ProfileUpdateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else None
    update_data = req.model_dump(exclude_unset=True)
    updated = upsert_profile(update_data, user_id)
    return updated

@router.get("/notifications")
def read_notifications(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else None
    return get_user_notifications(user_id)
