"""
页面相关Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class PageCreate(BaseModel):
    workspace_id: str
    parent_id: Optional[str] = None
    title: str = Field(default="无标题", max_length=500)
    # 取值与 init-db.sql 中 pages.page_type 的 ENUM 定义保持一致
    page_type: Literal["page", "database"] = "page"
    icon: Optional[str] = Field(default=None, max_length=100)


class PageUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    parent_id: Optional[str] = None
    icon: Optional[str] = Field(default=None, max_length=100)
    cover_image: Optional[str] = Field(default=None, max_length=500)
    is_favorite: Optional[bool] = None
    position: Optional[int] = None
    # 注意：deleted_at / is_archived 不开放客户端设置，删除/恢复走专用端点，
    # 否则会破坏回收站的批次恢复逻辑


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
