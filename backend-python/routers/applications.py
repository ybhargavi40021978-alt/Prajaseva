from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, Dict, Any, List
from models import ApplicationCreateRequest
from database import get_all_applications, get_application_by_id, create_application
from dependencies import get_current_user_optional

router = APIRouter(prefix="/api/applications", tags=["Applications"])

@router.get("", response_model=List[Dict[str, Any]])
def list_applications(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = None
    if current_user and current_user.get("role") == "citizen":
        user_id = current_user["id"]
    return get_all_applications(user_id)

@router.post("", status_code=status.HTTP_201_CREATED)
def submit_application(req: ApplicationCreateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    app_data = req.model_dump(exclude_unset=True)
    if current_user:
        app_data["user_id"] = current_user["id"]
        if not app_data.get("applicantName"):
            app_data["applicantName"] = current_user.get("name")
        if not app_data.get("email"):
            app_data["email"] = current_user.get("email")
        if not app_data.get("mobile"):
            app_data["mobile"] = current_user.get("phone")

    created = create_application(app_data)
    return created

@router.get("/{app_id}")
def get_single_application(app_id: str):
    app = get_application_by_id(app_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application #{app_id} not found"
        )
    return app

@router.get("/track/{app_id}")
def track_application_public(app_id: str):
    app = get_application_by_id(app_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application tracking ID #{app_id} not found in PrajaSeva directory"
        )
    return app
