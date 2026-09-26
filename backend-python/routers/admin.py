from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, Dict, Any, List
from models import ApplicationStatusUpdateRequest, GrievanceStatusUpdateRequest
from database import (
    get_admin_stats, get_all_applications, get_application_by_id, update_application_status,
    get_all_grievances, get_grievance_by_id, update_grievance_status
)
from dependencies import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Officer & Admin Workflow"])

def verify_officer_access(current_user: Dict[str, Any]) -> str:
    role = current_user.get("role")
    if role not in ["officer", "department", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Department Officer or Administrator privileges required"
        )
    return current_user.get("name", "Authorized Officer")

@router.get("/stats")
def fetch_admin_stats(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    verify_officer_access(current_user)
    return get_admin_stats(current_user.get("department_id") if current_user.get("role") in ["officer", "department"] else None)

@router.get("/applications")
def fetch_all_applications(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    verify_officer_access(current_user)
    return get_all_applications(None, current_user.get("department_id") if current_user.get("role") in ["officer", "department"] else None)

@router.put("/applications/{app_id}/status")
def review_application(
    app_id: str,
    req: ApplicationStatusUpdateRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    officer_name = verify_officer_access(current_user)
    existing = get_application_by_id(app_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application #{app_id} not found")
    if current_user.get("role") in ["officer", "department"] and existing.get("department") != current_user.get("department_id") and current_user.get("department_id") not in str(existing.get("department", "")).lower():
        # Department IDs may map to human-readable department names.
        dept_id = str(current_user.get("department_id") or "").replace("dept_", "").replace("_", " ").lower()
        if dept_id not in str(existing.get("department", "")).lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This application is outside your department.")
    updated = update_application_status(
        app_id=app_id,
        new_status=req.status,
        new_status_code=req.status_code,
        step_index=req.step_index,
        officer_remarks=req.officer_remarks,
        officer_name=officer_name
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application #{app_id} not found"
        )
    return updated

@router.get("/grievances")
def fetch_all_grievances(current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    verify_officer_access(current_user)
    return get_all_grievances(None, current_user.get("department_id") if current_user.get("role") in ["officer", "department"] else None)

@router.put("/grievances/{grv_id}/status")
def resolve_grievance(
    grv_id: str,
    req: GrievanceStatusUpdateRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    officer_name = verify_officer_access(current_user)
    existing = get_grievance_by_id(grv_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Grievance #{grv_id} not found")
    if current_user.get("role") in ["officer", "department"] and existing.get("department_id") != current_user.get("department_id"):
        dept_id = str(current_user.get("department_id") or "").replace("dept_", "").replace("_", " ").lower()
        if dept_id not in str(existing.get("department", "")).lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This grievance is outside your department.")
    updated = update_grievance_status(
        grv_id=grv_id,
        new_status=req.status,
        status_code=req.status_code,
        resolution_remarks=req.resolution_remarks,
        officer_name=officer_name
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grievance #{grv_id} not found"
        )
    return updated
