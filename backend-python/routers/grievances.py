from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, Dict, Any, List
from models import GrievanceCreateRequest
from database import get_all_grievances, get_grievance_by_id, create_grievance
from dependencies import get_current_user_optional

router = APIRouter(prefix="/api/grievances", tags=["Spandana Grievances"])

@router.get("", response_model=List[Dict[str, Any]])
def list_grievances(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = None
    if current_user and current_user.get("role") == "citizen":
        user_id = current_user["id"]
    return get_all_grievances(user_id)

@router.post("", status_code=status.HTTP_201_CREATED)
def lodge_grievance(req: GrievanceCreateRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    grv_data = req.model_dump(exclude_unset=True)
    if current_user:
        grv_data["user_id"] = current_user["id"]

    created = create_grievance(grv_data)
    return created

@router.get("/{grv_id}")
def get_single_grievance(grv_id: str):
    grv = get_grievance_by_id(grv_id)
    if not grv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grievance token #{grv_id} not found"
        )
    return grv

@router.get("/track/{grv_id}")
def track_grievance_public(grv_id: str):
    grv = get_grievance_by_id(grv_id)
    if not grv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Spandana grievance token #{grv_id} not found in public database"
        )
    return grv
