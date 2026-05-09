"""
块相关Schema
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class BlockCreate(BaseModel):
    page_id: str
    parent_block_id: Optional[str] = None
    block_type: str = "text"
    content: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class BlockUpdate(BaseModel):
    block_type: Optional[str] = None
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
