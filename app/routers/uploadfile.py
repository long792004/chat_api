from fastapi import FastAPI, File, UploadFile, HTTPException, APIRouter, Depends
from fastapi.responses import JSONResponse
from pathlib import Path
import shutil

from app.models.file_processor import *
from app.models.security import get_current_active_user, TokenData

router = APIRouter(prefix="/file", tags=["file"])


@router.post("/upload-file/")
async def upload_file(file: UploadFile = File(...),
        current_user: TokenData = Depends(get_current_active_user)):
    try:
        # Định nghĩa kích thước tối đa (5MB)
        MAX_SIZE = 5 * 1024 * 1024  # 5MB

        # Kiểm tra kích thước file
        if file.size > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size is {MAX_SIZE / (1024 * 1024)}MB."
            )

        # Kiểm tra định dạng file
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only .pdf, .doc, .docx, and .txt are allowed."
            )

        # Tạo thư mục uploads
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        # Lưu file
        file_path = upload_dir / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Trích xuất nội dung
        content = ""
        if file_path.suffix.lower() == ".pdf":
            content = extract_pdf_content(file_path)
        elif file_path.suffix.lower() in [".doc", ".docx"]:
            content = extract_docx_content(file_path)
        elif file_path.suffix.lower() == ".txt":
            content = extract_txt_content(file_path)
        
        # Thông tin file
        file_info = {
            "filename": file.filename,
            "size": file_path.stat().st_size,
            "content_type": file.content_type,
            "path": str(file_path),
            "extracted_content": content
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "File uploaded successfully",
                "file_info": file_info
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    
    finally:
        await file.close()

@router.get("/health")
async def health_check():
    return {"status": "API is running"}