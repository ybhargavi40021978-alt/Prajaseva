from fastapi import Depends, HTTPException, status, Header
from typing import Optional, Dict, Any
from security import decode_access_token
from database import get_user_by_id

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    try:
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        token = parts[1]
        payload = decode_access_token(token)
        if not payload or not payload.get("sub"):
            return None
        user = get_user_by_id(payload["sub"])
        return user
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or have expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_officer_or_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") not in ["officer", "department", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer or Administrator privileges required"
        )
    return current_user

def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Administrator privileges required"
        )
    return current_user
