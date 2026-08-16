"""
工作空间相关Schema
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    icon: Optional[str] = Field(default=None, max_length=100)


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    icon: Optional[str] = Field(default=None, max_length=100)
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
