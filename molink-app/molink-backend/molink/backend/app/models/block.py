"""
内容块模型
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base


class BlockType(str, enum.Enum):
    TEXT = "text"
    H1 = "h1"
    H2 = "h2"
    H3 = "h3"
    H4 = "h4"
    H5 = "h5"
    H6 = "h6"
    UL = "ul"
    OL = "ol"
    IMAGE = "image"
    CODE = "code"
    QUOTE = "quote"
    TABLE = "table"


class Block(Base):
    __tablename__ = "blocks"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(CHAR(36), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    parent_block_id = Column(CHAR(36), ForeignKey("blocks.id", ondelete="CASCADE"), nullable=True)
    block_type = Column(
        Enum(BlockType, values_callable=lambda enum_cls: [e.value for e in enum_cls], native_enum=False),
        default=BlockType.TEXT,
    )
    content = Column(Text, nullable=True)  # JSON存储内容
    position = Column(Integer, default=0)
    meta = Column('metadata', Text, nullable=True)  # JSON存储额外元数据
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    page = relationship("Page", back_populates="blocks")

    # 自引用父子关系：
    parent = relationship("Block", remote_side=[id], back_populates="children", uselist=False)
    children = relationship(
        "Block",
        back_populates="parent",
        cascade="all, delete-orphan",
        single_parent=True,
    )
