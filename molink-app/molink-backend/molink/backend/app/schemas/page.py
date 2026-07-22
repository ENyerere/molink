"""
页面相关Schema
"""
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


class PageCreate(BaseModel):
    workspace_id: str
    parent_id: Optional[str] = None
    title: str = "无标题"
    # 取值与 init-db.sql 中 pages.page_type 的 ENUM 定义保持一致
    page_type: Literal["page", "database"] = "page"
    icon: Optional[str] = None


class PageUpdate(BaseModel):
    title: Optional[str] = None
    parent_id: Optional[str] = None
    icon: Optional[str] = None
    cover_image: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None
    deleted_at: Optional[datetime] = None
    position: Optional[int] = None


class PageResponse(BaseModel):
    id: str
    workspace_id: str
    parent_id: Optional[str] = None
    title: str
    page_type: str
    icon: Optional[str] = None
    cover_image: Optional[str] = None
    is_favorite: bool
    is_archived: bool
    deleted_at: Optional[datetime] = None
    position: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageListResponse(BaseModel):
    pages: List[PageResponse]
    total: int
