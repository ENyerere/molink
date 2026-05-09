"""
数据库相关模型
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Boolean, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class ViewType(str, enum.Enum):
    TABLE = "table"
    BOARD = "board"
    CALENDAR = "calendar"


class FieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    SELECT = "select"
    MULTISELECT = "multiselect"
    CHECKBOX = "checkbox"
    URL = "url"
    EMAIL = "email"
    FILE = "file"


class Database(Base):
    __tablename__ = "databases"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(CHAR(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    page_id = Column(CHAR(36), ForeignKey("pages.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    icon = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    default_view = Column(
        Enum(ViewType, values_callable=lambda enum_cls: [e.value for e in enum_cls], native_enum=False),
        default=ViewType.TABLE,
    )
    created_by = Column(CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    workspace = relationship("Workspace", back_populates="databases")
    fields = relationship("DatabaseField", back_populates="database", cascade="all, delete-orphan")
    records = relationship("DatabaseRecord", back_populates="database", cascade="all, delete-orphan")


class DatabaseField(Base):
    __tablename__ = "database_fields"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    database_id = Column(CHAR(36), ForeignKey("databases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    field_type = Column(
        Enum(FieldType, values_callable=lambda enum_cls: [e.value for e in enum_cls], native_enum=False),
        default=FieldType.TEXT,
    )
    field_config = Column(Text, nullable=True)  # JSON存储字段配置
    position = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    database = relationship("Database", back_populates="fields")


class DatabaseRecord(Base):
    __tablename__ = "database_records"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    database_id = Column(CHAR(36), ForeignKey("databases.id", ondelete="CASCADE"), nullable=False)
    properties = Column(Text, nullable=True)  # JSON存储记录数据
    position = Column(Integer, default=0)
    created_by = Column(CHAR(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    database = relationship("Database", back_populates="records")
