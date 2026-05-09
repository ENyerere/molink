"""
数据库相关Schema
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# Database Schemas
class DatabaseCreate(BaseModel):
    workspace_id: str
    name: str = "新数据库"
    description: Optional[str] = None
    icon: Optional[str] = None
    default_view: str = "table"


class DatabaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    default_view: Optional[str] = None


class DatabaseResponse(BaseModel):
    id: str
    workspace_id: str
    page_id: Optional[str] = None
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    default_view: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# DatabaseField Schemas
class DatabaseFieldCreate(BaseModel):
    database_id: str
    name: str = "新字段"
    field_type: str = "text"
    field_config: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class DatabaseFieldUpdate(BaseModel):
    name: Optional[str] = None
    field_type: Optional[str] = None
    field_config: Optional[Dict[str, Any]] = None
    position: Optional[int] = None
    is_visible: Optional[bool] = None


class DatabaseFieldResponse(BaseModel):
    id: str
    database_id: str
    name: str
    field_type: str
    field_config: Optional[Dict[str, Any]] = None
    position: int
    is_visible: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# DatabaseRecord Schemas
class DatabaseRecordCreate(BaseModel):
    database_id: str
    properties: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class DatabaseRecordUpdate(BaseModel):
    properties: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class DatabaseRecordResponse(BaseModel):
    id: str
    database_id: str
    properties: Optional[Dict[str, Any]] = None
    position: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
