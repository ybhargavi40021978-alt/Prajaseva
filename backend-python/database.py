import sqlite3
import json
import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from config import DB_PATH, BASE_DIR

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            role TEXT CHECK(role IN ('citizen', 'officer', 'admin')) NOT NULL DEFAULT 'citizen',
            department_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Citizen Profiles Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS citizen_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE,
            name TEXT,
            email TEXT,
            phone TEXT,
            aadhaar TEXT,
            dob TEXT,
            gender TEXT DEFAULT 'Male',
            state TEXT,
            district TEXT,
            mandal TEXT,
            address TEXT,
            avatar TEXT DEFAULT '/citizen_avatar.png',
            annual_income REAL DEFAULT 120000,
            caste_category TEXT DEFAULT 'BC',
            occupation TEXT DEFAULT 'Student / Professional',
            qualification TEXT DEFAULT 'Graduate',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    try:
        cursor.execute("ALTER TABLE citizen_profiles ADD COLUMN state TEXT")
    except Exception:
        pass

    # 3. Departments Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            icon TEXT,
            description TEXT,
            service_count INTEGER DEFAULT 0,
            grievance_sla_days INTEGER DEFAULT 7
        )
    """)

    # 4. Schemes Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schemes (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            department_id TEXT NOT NULL,
            category TEXT,
            eligibility_criteria TEXT,
            benefits TEXT,
            deadline TEXT,
            status TEXT DEFAULT 'Active',
            icon TEXT,
            required_docs TEXT,
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )
    """)

    # 5. Applications Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id TEXT PRIMARY KEY,
            scheme_id TEXT,
            scheme TEXT,
            user_id TEXT,
            applicant_name TEXT,
            aadhaar TEXT,
            mobile TEXT,
            email TEXT,
            college TEXT,
            course TEXT,
            income TEXT,
            district TEXT,
            mandal TEXT,
            submission_date TEXT,
            status TEXT DEFAULT 'Under Scrutiny',
            status_code TEXT DEFAULT 'submitted',
            step_index INTEGER DEFAULT 1,
            department TEXT,
            officer_remarks TEXT,
            assigned_officer TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 6. Application Timelines Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS application_timelines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id TEXT NOT NULL,
            step_index INTEGER,
            step_name TEXT NOT NULL,
            status TEXT NOT NULL,
            remarks TEXT,
            updated_by TEXT,
            timestamp TEXT,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )
    """)

    # 7. Grievances Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS grievances (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            department_id TEXT,
            department TEXT,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            location TEXT,
            district TEXT,
            urgency TEXT DEFAULT 'Normal',
            submission_date TEXT,
            status TEXT DEFAULT 'Registered & Assigned',
            status_code TEXT DEFAULT 'in_progress',
            assigned_officer TEXT,
            resolution_remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 8. Grievance Updates Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS grievance_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grievance_id TEXT NOT NULL,
            update_text TEXT NOT NULL,
            author_name TEXT,
            author_role TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE
        )
    """)

    # 9. Notifications Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 10. Documents Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 11. Audit Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            details TEXT
        )
    """)

    conn.commit()
    conn.close()

# ----------------- User & Auth Operations -----------------
def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_credential(credential: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cred = credential.strip()
    clean_digits = "".join(c for c in cred if c.isdigit())
    
    # 1. Match by Email
    row = conn.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (cred,)).fetchone()
    
    # 2. Match by Phone
    if not row and clean_digits:
        row = conn.execute("SELECT * FROM users WHERE phone LIKE ?", (f"%{clean_digits[-10:]}",)).fetchone()
        
    # 3. Match by Aadhaar in citizen_profiles
    if not row and clean_digits:
        row = conn.execute("""
            SELECT u.* FROM users u 
            JOIN citizen_profiles p ON u.id = p.user_id 
            WHERE REPLACE(p.aadhaar, ' ', '') = ?
        """, (clean_digits,)).fetchone()

    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def create_user(
    email: str,
    password_hash: str,
    name: str,
    phone: str = "",
    role: str = "citizen",
    department_id: str = None,
    dob: str = "",
    state: str = "",
    district: str = "",
    address: str = ""
) -> Dict[str, Any]:
    conn = get_db_connection()
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    conn.execute("""
        INSERT INTO users (id, email, password_hash, name, phone, role, department_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, email.strip().lower(), password_hash, name.strip(), phone.strip(), role, department_id))
    
    # Initialize profile for citizen with real registered data
    conn.execute("""
        INSERT OR REPLACE INTO citizen_profiles (user_id, name, email, phone, dob, state, district, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, name.strip(), email.strip().lower(), phone.strip(), dob.strip(), state.strip(), district.strip(), address.strip()))
    
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

# ----------------- Profile Operations -----------------
def get_current_profile(user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    if user_id:
        row = conn.execute("SELECT * FROM citizen_profiles WHERE user_id = ?", (user_id,)).fetchone()
    else:
        row = conn.execute("SELECT * FROM citizen_profiles ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else None

def upsert_profile(data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    if user_id:
        existing = conn.execute("SELECT id FROM citizen_profiles WHERE user_id = ?", (user_id,)).fetchone()
    else:
        existing = conn.execute("SELECT id FROM citizen_profiles ORDER BY id DESC LIMIT 1").fetchone()
    
    name = data.get("name", "")
    email = data.get("email", "")
    phone = data.get("phone", "")
    aadhaar = data.get("aadhaar", "")
    dob = data.get("dob", "")
    gender = data.get("gender", "")
    district = data.get("district", "")
    mandal = data.get("mandal", "")
    address = data.get("address", "")
    avatar = data.get("avatar", "/citizen_avatar.png")
    annual_income = data.get("annual_income", data.get("annualIncome"))
    caste_category = data.get("caste_category", data.get("casteCategory", ""))
    occupation = data.get("occupation", "")
    qualification = data.get("qualification", "")

    if existing:
        conn.execute("""
            UPDATE citizen_profiles SET
                name=?, email=?, phone=?, aadhaar=?, dob=?, gender=?,
                district=?, mandal=?, address=?, avatar=?, annual_income=?,
                caste_category=?, occupation=?, qualification=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        """, (name, email, phone, aadhaar, dob, gender, district, mandal, address, avatar,
              annual_income, caste_category, occupation, qualification, existing["id"]))
    else:
        conn.execute("""
            INSERT INTO citizen_profiles (
                user_id, name, email, phone, aadhaar, dob, gender,
                district, mandal, address, avatar, annual_income, caste_category, occupation, qualification
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, name, email, phone, aadhaar, dob, gender, district, mandal, address, avatar,
              annual_income, caste_category, occupation, qualification))

    conn.commit()
    conn.close()
    return get_current_profile(user_id)

# ----------------- Departments & Schemes Operations -----------------
def get_departments() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM departments ORDER BY name ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_schemes(department_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if department_id:
        rows = conn.execute("SELECT s.*, d.name as department_name FROM schemes s JOIN departments d ON s.department_id = d.id WHERE s.department_id = ? ORDER BY s.title ASC", (department_id,)).fetchall()
    else:
        rows = conn.execute("SELECT s.*, d.name as department_name FROM schemes s JOIN departments d ON s.department_id = d.id ORDER BY s.title ASC").fetchall()
    conn.close()
    
    schemes = []
    for r in rows:
        d = dict(r)
        d["eligibility_criteria"] = json.loads(d["eligibility_criteria"]) if d.get("eligibility_criteria") else {}
        d["required_docs"] = json.loads(d["required_docs"]) if d.get("required_docs") else []
        schemes.append(d)
    return schemes

def check_scheme_eligibility(scheme_id: str, citizen_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM schemes WHERE id = ? OR code = ?", (scheme_id, scheme_id)).fetchone()
    conn.close()
    
    if not row:
        return {"eligible": False, "reason": "Scheme not found", "score": 0}

    scheme = dict(row)
    criteria = json.loads(scheme["eligibility_criteria"]) if scheme.get("eligibility_criteria") else {}
    
    income = float(citizen_data.get("annual_income", citizen_data.get("income", 120000)))
    max_income = float(criteria.get("max_annual_income", 250000))
    allowed_castes = criteria.get("caste_categories", ["OC", "BC", "SC", "ST", "Minority"])
    user_caste = citizen_data.get("caste_category", "BC")
    min_age = int(criteria.get("min_age", 18))
    max_age = int(criteria.get("max_age", 65))
    
    age = int(citizen_data.get("age", 25))
    
    reasons = []
    is_eligible = True
    
    if income > max_income:
        is_eligible = False
        reasons.append(f"Annual income ₹{income:,} exceeds maximum permissible limit of ₹{max_income:,}")
        
    if allowed_castes and user_caste not in allowed_castes:
        is_eligible = False
        reasons.append(f"Caste category '{user_caste}' not eligible for this specific benefit")
        
    if age < min_age or age > max_age:
        is_eligible = False
        reasons.append(f"Age {age} falls outside the eligible bracket of {min_age}-{max_age} years")

    return {
        "scheme_id": scheme["id"],
        "scheme_title": scheme["title"],
        "eligible": is_eligible,
        "criteria": criteria,
        "benefits": scheme.get("benefits"),
        "reasons": reasons if not is_eligible else ["All preliminary statutory conditions satisfied! Please proceed with online application."]
    }

# ----------------- Application Operations -----------------
def get_all_applications(user_id: Optional[str] = None, department_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if user_id and department_id:
        rows = conn.execute("SELECT * FROM applications WHERE user_id = ? AND department = ? ORDER BY created_at DESC", (user_id, department_id)).fetchall()
    elif user_id:
        rows = conn.execute("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    elif department_id:
        rows = conn.execute(
            "SELECT * FROM applications WHERE LOWER(department) = LOWER(?) OR LOWER(department) LIKE ? ORDER BY created_at DESC",
            (department_id, f"%{str(department_id).replace('dept_', '').replace('_', ' ')}%")
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM applications ORDER BY created_at DESC").fetchall()
    
    apps = []
    for r in rows:
        app_dict = dict(r)
        # Fetch timeline steps
        timeline_rows = conn.execute(
            "SELECT * FROM application_timelines WHERE application_id = ? ORDER BY step_index ASC", 
            (app_dict["id"],)
        ).fetchall()
        
        timeline = []
        for t in timeline_rows:
            td = dict(t)
            timeline.append({
                "step": td["step_name"],
                "status": td["status"],
                "remarks": td["remarks"],
                "date": td["timestamp"]
            })
            
        app_dict["timeline"] = timeline
        # Provide camelCase aliases for seamless frontend compatibility
        app_dict["applicantName"] = app_dict.get("applicant_name")
        app_dict["submissionDate"] = app_dict.get("submission_date")
        app_dict["statusCode"] = app_dict.get("status_code")
        app_dict["stepIndex"] = app_dict.get("step_index")
        app_dict["officerRemarks"] = app_dict.get("officer_remarks")
        app_dict["assignedOfficer"] = app_dict.get("assigned_officer")
        apps.append(app_dict)
        
    conn.close()
    return apps

def get_application_by_id(app_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM applications WHERE LOWER(id) = LOWER(?)", (app_id.strip(),)).fetchone()
    if not row:
        conn.close()
        return None
        
    app_dict = dict(row)
    timeline_rows = conn.execute(
        "SELECT * FROM application_timelines WHERE application_id = ? ORDER BY step_index ASC", 
        (app_dict["id"],)
    ).fetchall()
    conn.close()
    
    timeline = []
    for t in timeline_rows:
        td = dict(t)
        timeline.append({
            "step": td["step_name"],
            "status": td["status"],
            "remarks": td["remarks"],
            "date": td["timestamp"]
        })
        
    app_dict["timeline"] = timeline
    app_dict["applicantName"] = app_dict.get("applicant_name")
    app_dict["submissionDate"] = app_dict.get("submission_date")
    app_dict["statusCode"] = app_dict.get("status_code")
    app_dict["stepIndex"] = app_dict.get("step_index")
    app_dict["officerRemarks"] = app_dict.get("officer_remarks")
    app_dict["assignedOfficer"] = app_dict.get("assigned_officer")
    return app_dict

def create_application(app_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    app_id = app_data.get("id") or f"AP-2026-{uuid.uuid4().hex[:6].upper()}"
    today = datetime.now().strftime("%d %b %Y, %I:%M %p")
    
    conn.execute("""
        INSERT INTO applications (
            id, scheme_id, scheme, user_id, applicant_name, aadhaar, mobile, email,
            college, course, income, district, mandal, submission_date, status,
            status_code, step_index, department, officer_remarks, assigned_officer
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        app_id,
        app_data.get("scheme_id"),
        app_data.get("scheme", ""),
        app_data.get("user_id"),
        app_data.get("applicantName", app_data.get("applicant_name", "")),
        app_data.get("aadhaar", ""),
        app_data.get("mobile", ""),
        app_data.get("email", ""),
        app_data.get("college", ""),
        app_data.get("course", ""),
        str(app_data.get("income", "")),
        app_data.get("district", ""),
        app_data.get("mandal", ""),
        app_data.get("submissionDate", today),
        app_data.get("status", "Under Scrutiny"),
        app_data.get("statusCode", "submitted"),
        int(app_data.get("stepIndex", 1)),
        app_data.get("department", ""),
        app_data.get("officerRemarks", ""),
        app_data.get("assignedOfficer", "")
    ))

    custom_timeline = app_data.get("timeline") or []
    for idx, item in enumerate(custom_timeline, 1):
        conn.execute("""
            INSERT INTO application_timelines (application_id, step_index, step_name, status, remarks, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (app_id, idx, item.get("step", f"Step {idx}"), item.get("status", "pending"), item.get("remarks", ""), item.get("date", today)))

    # Create Notification
    conn.execute("""
        INSERT INTO notifications (user_id, title, message, category)
        VALUES (?, ?, ?, ?)
    """, (
        app_data.get("user_id"),
        "Application Lodged Successfully",
        f"Your application #{app_id} for {app_data.get('scheme', 'State Scheme')} has been registered.",
        "application"
    ))

    conn.commit()
    conn.close()
    return get_application_by_id(app_id)

def update_application_status(app_id: str, new_status: str, new_status_code: str, step_index: int, officer_remarks: str, officer_name: str = "Authorized Officer") -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
    
    conn.execute("""
        UPDATE applications SET
            status = ?, status_code = ?, step_index = ?,
            officer_remarks = ?, updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(id) = LOWER(?)
    """, (new_status, new_status_code, step_index, officer_remarks, app_id.strip()))

    # Update or add timeline step
    conn.execute("""
        UPDATE application_timelines SET status = 'completed'
        WHERE application_id = ? AND step_index < ?
    """, (app_id, step_index))

    conn.execute("""
        UPDATE application_timelines SET status = 'active', remarks = ?, timestamp = ?, updated_by = ?
        WHERE application_id = ? AND step_index = ?
    """, (officer_remarks, now_str, officer_name, app_id, step_index))

    if new_status_code == 'approved':
        conn.execute("""
            UPDATE application_timelines SET status = 'completed', timestamp = ?
            WHERE application_id = ?
        """, (now_str, app_id))

    conn.commit()
    conn.close()
    return get_application_by_id(app_id)

# ----------------- Grievance Operations -----------------
def get_all_grievances(user_id: Optional[str] = None, department_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if user_id and department_id:
        rows = conn.execute("SELECT * FROM grievances WHERE user_id = ? AND department_id = ? ORDER BY created_at DESC", (user_id, department_id)).fetchall()
    elif user_id:
        rows = conn.execute("SELECT * FROM grievances WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    elif department_id:
        rows = conn.execute(
            "SELECT * FROM grievances WHERE department_id = ? OR LOWER(department) LIKE ? ORDER BY created_at DESC",
            (department_id, f"%{str(department_id).replace('dept_', '').replace('_', ' ')}%")
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM grievances ORDER BY created_at DESC").fetchall()
        
    grvs = []
    for r in rows:
        g_dict = dict(r)
        # Fetch updates
        update_rows = conn.execute(
            "SELECT * FROM grievance_updates WHERE grievance_id = ? ORDER BY created_at ASC", 
            (g_dict["id"],)
        ).fetchall()
        
        updates = []
        for u in update_rows:
            ud = dict(u)
            updates.append({
                "time": ud["created_at"],
                "text": ud["update_text"],
                "author": f"{ud['author_name']} ({ud['author_role']})" if ud.get("author_role") else ud.get("author_name", "Officer")
            })
            
        g_dict["updates"] = updates
        g_dict["assignedOfficer"] = g_dict.get("assigned_officer")
        g_dict["submissionDate"] = g_dict.get("submission_date")
        g_dict["statusCode"] = g_dict.get("status_code")
        g_dict["resolutionRemarks"] = g_dict.get("resolution_remarks")
        grvs.append(g_dict)
        
    conn.close()
    return grvs

def get_grievance_by_id(grv_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM grievances WHERE LOWER(id) = LOWER(?)", (grv_id.strip(),)).fetchone()
    if not row:
        conn.close()
        return None
        
    g_dict = dict(row)
    update_rows = conn.execute(
        "SELECT * FROM grievance_updates WHERE grievance_id = ? ORDER BY created_at ASC", 
        (g_dict["id"],)
    ).fetchall()
    conn.close()
    
    updates = []
    for u in update_rows:
        ud = dict(u)
        updates.append({
            "time": ud["created_at"],
            "text": ud["update_text"],
            "author": f"{ud['author_name']} ({ud['author_role']})" if ud.get("author_role") else ud.get("author_name", "Officer")
        })
        
    g_dict["updates"] = updates
    g_dict["assignedOfficer"] = g_dict.get("assigned_officer")
    g_dict["submissionDate"] = g_dict.get("submission_date")
    g_dict["statusCode"] = g_dict.get("status_code")
    g_dict["resolutionRemarks"] = g_dict.get("resolution_remarks")
    return g_dict

def create_grievance(grv_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    grv_id = grv_data.get("id") or f"GRV-2026-{uuid.uuid4().hex[:5].upper()}"
    today = datetime.now().strftime("%d %b %Y, %I:%M %p")
    
    conn.execute("""
        INSERT INTO grievances (
            id, user_id, department_id, department, subject, description,
            location, district, urgency, submission_date, status, status_code,
            assigned_officer, resolution_remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        grv_id,
        grv_data.get("user_id"),
        grv_data.get("department_id"),
        grv_data.get("department", ""),
        grv_data.get("subject", ""),
        grv_data.get("description", ""),
        grv_data.get("location", ""),
        grv_data.get("district", ""),
        grv_data.get("urgency", ""),
        grv_data.get("submissionDate", today),
        grv_data.get("status", "Registered & Assigned"),
        grv_data.get("statusCode", "in_progress"),
        grv_data.get("assignedOfficer", ""),
        grv_data.get("resolutionRemarks", "")
    ))

    # Add initial update
    conn.execute("""
        INSERT INTO grievance_updates (grievance_id, update_text, author_name, author_role)
        VALUES (?, ?, ?, ?)
    """, (
        grv_id,
        f"Grievance #{grv_id} acknowledged and assigned to Municipal Ward Secretariat.",
        "System Dispatcher",
        "Spandana Cell"
    ))

    # Add notification
    conn.execute("""
        INSERT INTO notifications (user_id, title, message, category)
        VALUES (?, ?, ?, ?)
    """, (
        grv_data.get("user_id"),
        "Grievance Registered",
        f"Grievance #{grv_id} has been logged under Spandana with SLA: 7 days.",
        "grievance"
    ))

    conn.commit()
    conn.close()
    return get_grievance_by_id(grv_id)

def update_grievance_status(grv_id: str, new_status: str, status_code: str, resolution_remarks: str, officer_name: str = "Ward Secretariat Officer") -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    conn.execute("""
        UPDATE grievances SET
            status = ?, status_code = ?, resolution_remarks = ?, updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(id) = LOWER(?)
    """, (new_status, status_code, resolution_remarks, grv_id.strip()))

    conn.execute("""
        INSERT INTO grievance_updates (grievance_id, update_text, author_name, author_role)
        VALUES (?, ?, ?, ?)
    """, (grv_id, resolution_remarks, officer_name, "Nodal Officer"))

    conn.commit()
    conn.close()
    return get_grievance_by_id(grv_id)

# ----------------- Admin Analytics -----------------
def get_admin_stats(department_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    app_where = ""
    grv_where = ""
    params = ()
    if department_id:
        app_where = " WHERE LOWER(department) = LOWER(?) OR LOWER(department) LIKE ?"
        key = str(department_id).replace("dept_", "").replace("_", " ")
        params = (department_id, f"%{key}%")
        grv_where = " WHERE department_id = ? OR LOWER(department) LIKE ?"

    total_apps = conn.execute("SELECT COUNT(*) FROM applications" + app_where, params).fetchone()[0]
    approved_apps = conn.execute("SELECT COUNT(*) FROM applications" + (app_where + " AND " if app_where else " WHERE ") + "(LOWER(status_code) = 'approved' OR LOWER(status) LIKE '%approved%')" if app_where else "SELECT COUNT(*) FROM applications WHERE LOWER(status_code) = 'approved' OR LOWER(status) LIKE '%approved%'").fetchone()[0] if not app_where else conn.execute("SELECT COUNT(*) FROM applications WHERE (LOWER(department)=LOWER(?) OR LOWER(department) LIKE ?) AND (LOWER(status_code)='approved' OR LOWER(status) LIKE '%approved%')", params).fetchone()[0]
    pending_apps = conn.execute("SELECT COUNT(*) FROM applications WHERE (LOWER(department)=LOWER(?) OR LOWER(department) LIKE ?) AND LOWER(status_code) IN ('submitted','under_review','pending')" if app_where else "SELECT COUNT(*) FROM applications WHERE LOWER(status_code) IN ('submitted','under_review','pending')", params if app_where else ()).fetchone()[0]
    rejected_apps = conn.execute("SELECT COUNT(*) FROM applications WHERE (LOWER(department)=LOWER(?) OR LOWER(department) LIKE ?) AND (LOWER(status_code)='rejected' OR LOWER(status) LIKE '%rejected%')" if app_where else "SELECT COUNT(*) FROM applications WHERE LOWER(status_code)='rejected' OR LOWER(status) LIKE '%rejected%'", params if app_where else ()).fetchone()[0]

    total_grvs = conn.execute("SELECT COUNT(*) FROM grievances" + grv_where, params).fetchone()[0]
    resolved_grvs = conn.execute("SELECT COUNT(*) FROM grievances WHERE (department_id = ? OR LOWER(department) LIKE ?) AND (LOWER(status_code)='resolved' OR LOWER(status) LIKE '%resolved%')" if grv_where else "SELECT COUNT(*) FROM grievances WHERE LOWER(status_code)='resolved' OR LOWER(status) LIKE '%resolved%'", params if grv_where else ()).fetchone()[0]
    pending_grvs = total_grvs - resolved_grvs

    total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] if not department_id else conn.execute("SELECT COUNT(*) FROM users WHERE department_id = ?", (department_id,)).fetchone()[0]
    total_schemes = conn.execute("SELECT COUNT(*) FROM schemes").fetchone()[0]

    # Department breakdown
    dept_rows = conn.execute("""
        SELECT department, COUNT(*) as count 
        FROM applications 
        GROUP BY department 
        ORDER BY count DESC LIMIT 5
    """).fetchall()
    
    dept_breakdown = [{"department": r["department"], "count": r["count"]} for r in dept_rows]

    conn.close()
    return {
        "applications": {
            "total": total_apps,
            "approved": approved_apps,
            "pending": pending_apps,
            "rejected": rejected_apps,
            "approvalRate": f"{round((approved_apps / total_apps * 100), 1)}%" if total_apps > 0 else "100%"
        },
        "grievances": {
            "total": total_grvs,
            "resolved": resolved_grvs,
            "pending": pending_grvs,
            "resolutionRate": f"{round((resolved_grvs / total_grvs * 100), 1)}%" if total_grvs > 0 else "100%"
        },
        "system": {
            "totalUsers": total_users,
            "activeSchemes": total_schemes,
            "slaAdherence": "98.4%",
            "dbtTransferredCrores": "₹ 1,420.80 Cr"
        },
        "topDepartments": dept_breakdown
    }

# ----------------- Document & Notifications -----------------
def record_document(entity_type: str, entity_id: str, file_name: str, file_path: str, file_size: int, mime_type: str) -> Dict[str, Any]:
    conn = get_db_connection()
    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    conn.execute("""
        INSERT INTO documents (id, entity_type, entity_id, file_name, file_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (doc_id, entity_type, entity_id, file_name, file_path, file_size, mime_type))
    conn.commit()
    conn.close()
    return {
        "id": doc_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "file_name": file_name,
        "file_path": file_path,
        "file_size": file_size,
        "mime_type": mime_type
    }

def get_user_notifications(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if user_id:
        rows = conn.execute("SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 20", (user_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20").fetchall()
    conn.close()
    return [dict(r) for r in rows]
