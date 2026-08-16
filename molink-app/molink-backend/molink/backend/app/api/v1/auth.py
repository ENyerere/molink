"""
认证相关API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database import get_db
from app.core.ratelimit import rate_limit
from app.core.redis import add_token_to_blacklist, is_token_blacklisted
from app.core.security import (
    create_access_token, verify_password, get_password_hash, verify_token, get_current_user,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# 统一使用 core/security.py 的规范实现，此处复用导出，避免两份实现漂移


@router.post("/register", response_model=Token, dependencies=[Depends(rate_limit("register", limit=3))])
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查邮箱是否已存在（中性文案，避免邮箱枚举）
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱无法用于注册"
        )
    
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 生成访问令牌
    access_token = create_access_token(data={"sub": new_user.id})
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit("login", limit=5))])
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="该账号使用第三方登录，请使用 Google 或 GitHub 登录"
        )
    
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户已被禁用"
        )
    
    # 生成访问令牌
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login/form", response_model=Token, dependencies=[Depends(rate_limit("login", limit=5))])
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """表单登录（用于Swagger UI测试）"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="该账号使用第三方登录，请使用 Google 或 GitHub 登录"
        )
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户已被禁用"
        )

    access_token = create_access_token(data={"sub": user.id})
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user)
):
    """用户登出：将当前 token 写入黑名单，TTL 为 token 剩余有效期"""
    payload = verify_token(token)
    exp = payload.get("exp") if payload else None
    if exp:
        ttl = int(exp - datetime.now(timezone.utc).timestamp())
    else:
        ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    await add_token_to_blacklist(token, ttl)
    return {"success": True, "message": "登出成功"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse.model_validate(current_user)
