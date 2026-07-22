"""
块相关Schema
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

# 取值与 init-db.sql 中 blocks.block_type 的 ENUM 定义保持一致
BlockTypeLiteral = Literal["text", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "image", "code", "quote", "table"]


class BlockCreate(BaseModel):
    page_id: str
    parent_block_id: Optional[str] = None
    block_type: BlockTypeLiteral = "text"
    content: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class BlockUpdate(BaseModel):
    block_type: Optional[BlockTypeLiteral] = None
    content: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class BlockResponse(BaseModel):
    id: str
    page_id: str
    parent_block_id: Optional[str] = None
    block_type: str
    content: Optional[Dict[str, Any]] = None
    position: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BlockReorder(BaseModel):
    block_ids: List[str]  # 按顺序排列的块ID列表
