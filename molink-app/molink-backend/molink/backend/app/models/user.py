"""
用户模型
"""
from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from app.core.utils import utc_now


class User(Base):
    __tablename__ = "users"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    provider = Column(String(20), nullable=True)
    provider_id = Column(String(100), nullable=True)
    full_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    settings = Column(Text, nullable=True)  # JSON存储用户设置
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # 关系
    # workspaces/files 的外键在数据库层均为 ON DELETE CASCADE，
    # passive_deletes=True 让 ORM 删除用户时只删主表行，子表交给数据库级联，
    # 避免 ORM 尝试将 NOT NULL 外键置 NULL 导致 IntegrityError
    workspaces = relationship("Workspace", back_populates="owner", passive_deletes=True)
    pages = relationship("Page", back_populates="creator")
    files = relationship("File", back_populates="user", passive_deletes=True)
