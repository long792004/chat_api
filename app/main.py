from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

from app.routers import auth, chat, uploadfile
from app.config.database import db_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up Chat API...")
    print(f"Supabase connection initialized: {bool(db_config.client)}")
    yield
    # Shutdown
    print("Shutting down Chat API...")

app = FastAPI(
    title="Secure Chat API",
    description="API bảo mật để quản lý chat với Supabase và JWT Authentication",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production, chỉ định cụ thể domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(uploadfile.router)

# Health check
@app.get("/health")
async def health_check():
    """Kiểm tra trạng thái API"""
    return {
        "status": "healthy", 
        "timestamp": datetime.now(),
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint với thông tin API"""
    return {
        "message": "Secure Chat API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }

