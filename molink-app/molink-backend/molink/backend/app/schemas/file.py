"""
文件相关Schema
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FileResponse(BaseModel):
    id: str
    name: str
    original_name: str
    url: str
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    size: Optional[int] = None
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class FileUploadResponse(BaseModel):
    success: bool
    file: Optional[FileResponse] = None
    error: Optional[str] = None
