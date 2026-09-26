from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
import os
import uuid
from typing import Optional
from config import UPLOAD_DIR
from database import record_document

router = APIRouter(tags=["Document Management"])

@router.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    entity_type: str = Form("application"),
    entity_id: str = Form("general")
):
    try:
        ext = os.path.splitext(file.filename)[1]
        safe_name = f"{uuid.uuid4().hex[:12]}{ext}"
        target_path = os.path.join(UPLOAD_DIR, safe_name)
        
        contents = await file.read()
        with open(target_path, "wb") as f:
            f.write(contents)
            
        doc_record = record_document(
            entity_type=entity_type,
            entity_id=entity_id,
            file_name=file.filename,
            file_path=f"/uploads/{safe_name}",
            file_size=len(contents),
            mime_type=file.content_type or "application/octet-stream"
        )
        return doc_record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file upload: {str(e)}"
        )

@router.get("/uploads/{filename}")
def serve_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested document not found"
        )
    return FileResponse(file_path)
