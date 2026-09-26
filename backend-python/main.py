from fastapi import FastAPI, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
import datetime
import os

from database import init_db, get_current_profile, get_user_by_email
from security import hash_password, verify_password, create_access_token
from routers.auth import router as auth_router
from routers.profile import router as profile_router
from routers.services import router as services_router
from routers.applications import router as applications_router
from routers.grievances import router as grievances_router
from routers.admin import router as admin_router
from routers.documents import router as documents_router

# Ensure DB schema exists; user-generated data is never seeded
try:
    init_db()
except Exception as e:
    print(f"Database initialization notice: {e}")

app = FastAPI(
    title="India PrajaSeva e-Governance API",
    description="""
# Official India PrajaSeva Citizen & Administrative Services API

High-performance e-Governance backend built with **Python & FastAPI**.

### Core Modules:
- **Authentication & RBAC**: JWT Bearer tokens with Citizen, Officer, and State Admin roles.
- **Citizen Services & Schemes**: Navaratnalu, Education, Healthcare, Revenue, Agriculture, MA&UD.
- **Application Engine**: Multi-stage workflow with automated audit timelines.
- **Spandana Grievance Redressal**: Real-time grievance lodging, SLA tracking, and nodal officer updates.
- **Document Management**: Aadhaar, income, and caste certificate storage.
- **Officer & Admin Cockpit**: Status transitions, remarks, and state-wide DBT analytics.
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Vite dev server (port 3000), Node (port 5000), and all local ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(services_router)
app.include_router(applications_router)
app.include_router(grievances_router)
app.include_router(admin_router)
app.include_router(documents_router)

# Health & System Status
@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PrajaSeva Enterprise API",
        "runtime": "Python FastAPI",
        "state": "India",
        "timestamp": datetime.datetime.now().isoformat(),
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "profile": "/api/profile",
            "services": "/api/services",
            "schemes": "/api/schemes",
            "applications": "/api/applications",
            "grievances": "/api/grievances",
            "admin": "/api/admin",
            "documents": "/api/documents/upload"
        }
    }

# Backwards compatibility flexible login (handles legacy {credential, password} from older client code)
@app.post("/api/auth/citizen-login")
def flexible_citizen_login(payload: Dict[str, Any] = Body(...)):
    credential = payload.get("credential") or payload.get("email") or payload.get("phone") or ""
    password = payload.get("password") or ""

    user = get_user_by_email(credential)
    if not user:
        raise HTTPException(status_code=401, detail="No registered account found for this credential")
    
    token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user["name"]
    })

    profile = get_current_profile(user["id"])

    return {
        "success": True,
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "profile": profile
    }
