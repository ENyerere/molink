"""
工作空间模型
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from app.core.utils import utc_now


class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    owner_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    icon = Column(String(100), nullable=True)
    settings = Column(Text, nullable=True)  # JSON存储工作空间设置
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # 关系
    owner = relationship("User", back_populates="workspaces")
    pages = relationship("Page", back_populates="workspace", cascade="all, delete-orphan")
    databases = relationship("Database", back_populates="workspace", cascade="all, delete-orphan")
