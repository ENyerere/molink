"""
用户相关Schema
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = Field(default=None, max_length=100)


class UserLogin(BaseModel):
    # 保持 str 不用 EmailStr：email-validator 一律拒绝 .local 等保留域名，
    # 会把本地开发播种的默认管理员 admin@molink.local 锁在门外；
    # 登录本身是查库比对，格式错误的邮箱自然查无此人，无安全风险
    email: str
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    settings: Optional[dict] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[str] = None
