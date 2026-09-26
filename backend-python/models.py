from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

# Auth Models
class UserRegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    name: str
    phone: Optional[str] = ""
    role: Optional[str] = "citizen"
    department_id: Optional[str] = None
    dob: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""
    address: Optional[str] = ""

class RegisterResponse(BaseModel):
    success: bool
    message: str
    user: "UserResponse"

class UserLoginRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
    phone: Optional[str] = None
    credential: Optional[str] = None
    password: str
    role: Optional[str] = "citizen"

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = ""
    role: str
    department_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Profile Models
class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    aadhaar: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    district: Optional[str] = None
    mandal: Optional[str] = None
    address: Optional[str] = None
    avatar: Optional[str] = "/citizen_avatar.png"
    annual_income: Optional[float] = None
    caste_category: Optional[str] = None
    occupation: Optional[str] = None
    qualification: Optional[str] = None

# Eligibility Check Model
class EligibilityCheckRequest(BaseModel):
    scheme_id: str
    annual_income: Optional[float] = None
    caste_category: Optional[str] = None
    age: Optional[int] = 25
    district: Optional[str] = None

# Application Models
class ApplicationCreateRequest(BaseModel):
    id: Optional[str] = None
    scheme_id: Optional[str] = None
    scheme: Optional[str] = None
    applicantName: Optional[str] = None
    applicant_name: Optional[str] = None
    aadhaar: Optional[str] = ""
    mobile: Optional[str] = ""
    email: Optional[str] = ""
    college: Optional[str] = ""
    course: Optional[str] = ""
    income: Optional[str] = ""
    district: Optional[str] = None
    mandal: Optional[str] = None
    submissionDate: Optional[str] = None
    department: Optional[str] = None
    timeline: Optional[List[Dict[str, Any]]] = None

class ApplicationStatusUpdateRequest(BaseModel):
    status: str
    status_code: str
    step_index: int = 1
    officer_remarks: str

# Grievance Models
class GrievanceCreateRequest(BaseModel):
    id: Optional[str] = None
    department_id: Optional[str] = None
    department: Optional[str] = None
    subject: str
    description: str
    location: Optional[str] = ""
    district: Optional[str] = None
    urgency: Optional[str] = None
    submissionDate: Optional[str] = None

class GrievanceStatusUpdateRequest(BaseModel):
    status: str
    status_code: str
    resolution_remarks: str
