from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime



class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None



# Rate limiting model
class RateLimitConfig(BaseModel):
    max_requests: int = 100
    window_seconds: int = 3600  # 1 hour
    
class APIKeyModel(BaseModel):
    key: str
    user_id: str
    name: Optional[str] = None
    is_active: bool = True
    rate_limit: Optional[RateLimitConfig] = None
    created_at: datetime
    last_used: Optional[datetime] = None