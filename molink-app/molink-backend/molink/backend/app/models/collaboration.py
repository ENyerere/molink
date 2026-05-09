"""
协作会话模型
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    IDLE = "idle"
    DISCONNECTED = "disconnected"


class CollaborationSession(Base):
    __tablename__ = "collaboration_sessions"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(CHAR(36), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cursor_position = Column(Text, nullable=True)  # JSON存储光标位置
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
