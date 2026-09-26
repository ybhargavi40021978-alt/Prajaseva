from fastapi import APIRouter, Query
from typing import Optional
from models import EligibilityCheckRequest
from database import get_departments, get_schemes, check_scheme_eligibility

router = APIRouter(tags=["Services & Schemes"])

@router.get("/api/departments")
def list_departments():
    return get_departments()

@router.get("/api/schemes")
def list_schemes(department_id: Optional[str] = Query(None)):
    return get_schemes(department_id)

@router.post("/api/schemes/check-eligibility")
def verify_eligibility(req: EligibilityCheckRequest):
    citizen_data = {
        "annual_income": req.annual_income,
        "caste_category": req.caste_category,
        "age": req.age,
        "district": req.district
    }
    return check_scheme_eligibility(req.scheme_id, citizen_data)

@router.get("/api/services")
def list_services():
    depts = get_departments()
    schemes = get_schemes()
    return {
        "departments": depts,
        "schemes": schemes,
        "totalServices": len(schemes) + sum(d.get("service_count", 0) for d in depts)
    }
