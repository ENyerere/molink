"""
页面模型
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Boolean, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class PageType(str, enum.Enum):
    PAGE = "page"
    DATABASE = "database"


class Page(Base):
    __tablename__ = "pages"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(CHAR(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(CHAR(36), ForeignKey("pages.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(500), nullable=False, default="无标题")
    page_type = Column(
        Enum(PageType, values_callable=lambda enum_cls: [e.value for e in enum_cls], native_enum=False),
        default=PageType.PAGE,
    )
    icon = Column(String(100), nullable=True)
    cover_image = Column(String(500), nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    position = Column(Integer, default=0)
    created_by = Column(CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    workspace = relationship("Workspace", back_populates="pages")
    creator = relationship("User", back_populates="pages")
    blocks = relationship("Block", back_populates="page", cascade="all, delete-orphan")

    # 自引用父子关系：
    parent = relationship("Page", remote_side=[id], back_populates="children", uselist=False)
    children = relationship(
        "Page",
        back_populates="parent",
        cascade="all, delete-orphan",
        single_parent=True,
    )
