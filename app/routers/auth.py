from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from supabase import Client
from datetime import timedelta, datetime
from typing import Optional
import traceback

from app.models.security import (
    UserLogin, UserRegister, Token, SecurityUtils, 
    get_current_user, get_current_active_user, TokenData
)
from app.schemas.chat import User
from app.config.database import get_supabase

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=dict)
async def register(user_data: UserRegister, db: Client = Depends(get_supabase)):
    """
    Đăng ký tài khoản mới
    - Kiểm tra email đã tồn tại chưa
    - Hash password
    - Tạo user mới trong database
    """
    try:
        # Kiểm tra email đã tồn tại
        existing_user = db.table("users").select("email").eq("email", user_data.email).execute()
        print(existing_user.data)
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng"
            )
        
        # Hash password
        hashed_password = SecurityUtils.hash_password(user_data.password)
        
        # Tạo user mới
        result = db.table("users").insert({
            "email": user_data.email,
            "password_hash": hashed_password,
            "full_name": user_data.full_name,
            "is_active": True
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo tài khoản"
            )
        
        return {"message": "Đăng ký thành công", "user_id": result.data[0]["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi đăng ký: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Client = Depends(get_supabase)):
    """
    Đăng nhập và tạo JWT token
    - Kiểm tra email và password
    - Tạo access token
    """
    try:
        # Lấy user từ database
        result = db.table("users").select("*").eq("email", user_credentials.email).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng"
            )
        
        user = result.data[0]
        
        # Kiểm tra password
        if not SecurityUtils.verify_password(user_credentials.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng"
            )
        
        # Kiểm tra user có active không
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản đã bị vô hiệu hóa"
            )
        
        # Tạo access token
        access_token_expires = timedelta(minutes=SecurityUtils.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = SecurityUtils.create_access_token(
            data={"sub": user["id"], "email": user["email"]},
            expires_delta=access_token_expires
        )
        
        # Cập nhật last_login
        db.table("users").update({"last_login": datetime.utcnow().isoformat()}).eq("id", user["id"]).execute()
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=SecurityUtils.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # raise HTTPException(
        #     status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        #     detail=f"Lỗi đăng nhập: {str(e)}"
        # )
        print("🚨 Lỗi đăng nhập - Stack trace:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi nội bộ: {str(e)}"
        )

@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """
    Lấy thông tin user hiện tại từ token
    """
    try:
        result = db.table("users").select("*").eq("id", current_user.user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin user"
            )
        
        user_data = result.data[0]
        return User(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi lấy thông tin user: {str(e)}"
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: TokenData = Depends(get_current_user)):
    """
    Làm mới token
    """
    try:
        access_token_expires = timedelta(minutes=SecurityUtils.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = SecurityUtils.create_access_token(
            data={"sub": current_user.user_id, "email": current_user.email},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=SecurityUtils.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi làm mới token: {str(e)}"
        )

@router.post("/logout")
async def logout(current_user: TokenData = Depends(get_current_active_user)):
    """
    Đăng xuất (trong thực tế, JWT token sẽ hết hạn tự động)
    Có thể implement blacklist token nếu cần
    """
    return {"message": "Đăng xuất thành công"}