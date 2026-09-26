import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "prajaseva_enterprise.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
SECRET_KEY = os.getenv("JWT_SECRET", "prajaseva-india-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

os.makedirs(UPLOAD_DIR, exist_ok=True)
