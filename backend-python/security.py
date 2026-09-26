import hashlib
import hmac
import json
import base64
import time
from typing import Optional, Dict, Any
from config import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES

def hash_password(password: str) -> str:
    salt = "india_prajaseva_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# Lightweight, robust JWT implementation using Python standard library
def create_access_token(data: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    expire = int(time.time()) + (expires_delta if expires_delta else (ACCESS_TOKEN_EXPIRE_MINUTES * 60))
    
    payload = data.copy()
    payload["exp"] = expire
    payload["iat"] = int(time.time())
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    
    signature = hmac.new(
        SECRET_KEY.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(SECRET_KEY.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest()
        ).decode().rstrip('=')
        
        if not hmac.compare_digest(sig_b64, expected_sig):
            return None
        
        # Add padding back if necessary
        padded = payload_b64 + '=' * (4 - len(payload_b64) % 4 if len(payload_b64) % 4 != 0 else 0)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        
        if payload.get("exp") and payload["exp"] < int(time.time()):
            return None # Expired
            
        return payload
    except Exception:
        return None
