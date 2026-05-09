"""
工作空间相关Schema
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WorkspaceCreate(BaseModel):
    name: str
    icon: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    settings: Optional[dict] = None


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    icon: Optional[str] = None
    settings: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
