"""
数据库相关Schema
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

# 取值与 init-db.sql 中 databases.default_view / database_fields.field_type 的 ENUM 定义保持一致
ViewTypeLiteral = Literal["table", "board", "calendar"]
FieldTypeLiteral = Literal["text", "number", "date", "select", "multiselect", "checkbox", "url", "email", "file"]


# Database Schemas
class DatabaseCreate(BaseModel):
    workspace_id: str
    page_id: Optional[str] = None
    name: str = "新数据库"
    description: Optional[str] = None
    icon: Optional[str] = None
    default_view: ViewTypeLiteral = "table"


class DatabaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    default_view: Optional[ViewTypeLiteral] = None


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
    field_type: FieldTypeLiteral = "text"
    field_config: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class DatabaseFieldUpdate(BaseModel):
    name: Optional[str] = None
    field_type: Optional[FieldTypeLiteral] = None
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
