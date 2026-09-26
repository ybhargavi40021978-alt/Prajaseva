from fastapi import APIRouter, HTTPException, status, Depends
from models import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse, RegisterResponse
from database import get_user_by_email, create_user, get_user_by_credential
from security import hash_password, verify_password, create_access_token
from dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=RegisterResponse)
def register(req: UserRegisterRequest):
    existing = get_user_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists in PrajaSeva"
        )
    
    if (req.role or "citizen").lower() != "citizen":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin and department accounts must be provisioned by an authorized administrator")

    pwd_hash = hash_password(req.password)
    new_user = create_user(
        email=req.email,
        password_hash=pwd_hash,
        name=req.name,
        phone=req.phone or "",
        role=req.role or "citizen",
        department_id=req.department_id,
        dob=req.dob or "",
        state=req.state or "",
        district=req.district or "",
        address=req.address or ""
    )

    return {
        "success": True,
        "message": "Registration successful. Please login with your registered credentials.",
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "name": new_user["name"],
            "phone": new_user.get("phone", ""),
            "role": new_user["role"],
            "department_id": new_user.get("department_id")
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest):
    login_id = (req.identifier or req.email or req.credential or req.phone or "").strip()
    user = get_user_by_credential(login_id)
    if not user:
        user = get_user_by_email(login_id)

    requested_role = (req.role or "").strip().lower()
    actual_role = "department" if user and user.get("role") == "officer" else (user.get("role") if user else "")
    if requested_role and user and requested_role != actual_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"These credentials are not authorized for the {requested_role} role"
        )

    if not user or (not verify_password(req.password, user["password_hash"])):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile/email or password."
        )

    access_token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": ("department" if user["role"] == "officer" else user["role"]),
        "name": user["name"]
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "phone": user.get("phone", ""),
            "role": ("department" if user["role"] == "officer" else user["role"]),
            "department_id": user.get("department_id")
        }
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "phone": current_user.get("phone", ""),
        "role": current_user["role"],
        "department_id": current_user.get("department_id")
    }
