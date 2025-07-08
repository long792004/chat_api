import PyPDF2
import docx
import os
from pathlib import Path

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}

# Hàm kiểm tra định dạng file
def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

# Hàm trích xuất nội dung từ file PDF
def extract_pdf_content(file_path: Path) -> str:
    try:
        with open(file_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
            return text[:1000000]  # Giới hạn 1,000,000 ký tự để test
    except Exception as e:
        return f"Error extracting PDF content: {str(e)}"

# Hàm trích xuất nội dung từ file DOC/DOCX
def extract_docx_content(file_path: Path) -> str:
    try:
        doc = docx.Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs if para.text])
        return text[:1000000]  # Giới hạn 1,000,000 ký tự để test
    except Exception as e:
        return f"Error extracting DOCX content: {str(e)}"

# Hàm trích xuất nội dung từ file TXT
def extract_txt_content(file_path: Path) -> str:
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return file.read()[:1000000]  # Giới hạn 1,000,000 ký tự để test
    except Exception as e:
        return f"Error extracting TXT content: {str(e)}"
