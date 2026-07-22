"""
数据库管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import json

from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.page import Page
from app.models.database import Database, DatabaseField, DatabaseRecord
from app.schemas.database import (
    DatabaseCreate, DatabaseUpdate, DatabaseResponse,
    DatabaseFieldCreate, DatabaseFieldUpdate, DatabaseFieldResponse,
    DatabaseRecordCreate, DatabaseRecordUpdate, DatabaseRecordResponse
)
from .auth import get_current_user

router = APIRouter()


def check_workspace_access(workspace_id: str, user_id: str, db: Session) -> Workspace:
    """检查用户对工作空间的访问权限"""
    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.owner_id == user_id
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限访问此工作空间"
        )
    return workspace


# Database CRUD
@router.get("/", response_model=List[DatabaseResponse])
async def list_databases(
    workspace_id: str = Query(..., description="工作空间ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取数据库列表"""
    check_workspace_access(workspace_id, current_user.id, db)
    
    # 挂载在页面上的数据库，所属页面已在回收站时不返回（LEFT JOIN pages）
    databases = db.query(Database).outerjoin(
        Page, Database.page_id == Page.id
    ).filter(
        Database.workspace_id == workspace_id,
        (Database.page_id == None) | (Page.deleted_at == None)
    ).order_by(Database.created_at.desc()).all()
    
    return [DatabaseResponse.model_validate(d) for d in databases]


@router.post("/", response_model=DatabaseResponse)
async def create_database(
    db_data: DatabaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建数据库"""
    check_workspace_access(db_data.workspace_id, current_user.id, db)
    
    # 挂载到页面时，校验页面属于当前工作空间且未被删除
    if db_data.page_id is not None:
        page = db.query(Page).filter(Page.id == db_data.page_id).first()
        if not page or page.workspace_id != db_data.workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="页面不存在或不属于当前工作空间"
            )
        if page.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="页面已在回收站中，不能挂载数据库"
            )
    
    database = Database(
        workspace_id=db_data.workspace_id,
        page_id=db_data.page_id,
        name=db_data.name,
        description=db_data.description,
        icon=db_data.icon,
        default_view=db_data.default_view,
        created_by=current_user.id
    )
    db.add(database)
    db.commit()
    db.refresh(database)
    
    return DatabaseResponse.model_validate(database)


def get_visible_database(database_id: str, db: Session) -> Database:
    """获取数据库；若其挂载的页面已在回收站中，与列表行为一致视为不存在"""
    database = db.query(Database).filter(Database.id == database_id).first()
    
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="数据库不存在"
        )
    
    if database.page_id is not None:
        page = db.query(Page).filter(Page.id == database.page_id).first()
        if page is not None and page.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="数据库不存在"
            )
    
    return database


@router.get("/{database_id}", response_model=DatabaseResponse)
async def get_database(
    database_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取数据库详情"""
    database = get_visible_database(database_id, db)
    
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    return DatabaseResponse.model_validate(database)


@router.put("/{database_id}", response_model=DatabaseResponse)
async def update_database(
    database_id: str,
    db_data: DatabaseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新数据库"""
    database = get_visible_database(database_id, db)
    
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    update_data = db_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(database, field, value)
    
    db.commit()
    db.refresh(database)
    
    return DatabaseResponse.model_validate(database)


@router.delete("/{database_id}")
async def delete_database(
    database_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除数据库"""
    database = get_visible_database(database_id, db)
    
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    db.delete(database)
    db.commit()
    
    return {"success": True, "message": "数据库已删除"}


# Database Fields
@router.get("/{database_id}/fields", response_model=List[DatabaseFieldResponse])
async def list_fields(
    database_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取数据库字段列表"""
    database = db.query(Database).filter(Database.id == database_id).first()
    
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="数据库不存在"
        )
    
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    fields = db.query(DatabaseField).filter(
        DatabaseField.database_id == database_id
    ).order_by(DatabaseField.position).all()
    
    result = []
    for field in fields:
        field_dict = {
            "id": field.id,
            "database_id": field.database_id,
            "name": field.name,
            "field_type": field.field_type.value if hasattr(field.field_type, 'value') else field.field_type,
            "field_config": json.loads(field.field_config) if field.field_config else {},
            "position": field.position,
            "is_visible": field.is_visible,
            "created_at": field.created_at,
            "updated_at": field.updated_at
        }
        result.append(DatabaseFieldResponse(**field_dict))
    
    return result


@router.post("/{database_id}/fields", response_model=DatabaseFieldResponse)
async def create_field(
    database_id: str,
    field_data: DatabaseFieldCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建数据库字段"""
    database = db.query(Database).filter(Database.id == database_id).first()
    
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="数据库不存在"
        )
    
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    # 计算位置：用 max(position)+1 而非 count()，避免删除行后 position 撞车
    if field_data.position is None:
        max_position = db.query(func.max(DatabaseField.position)).filter(
            DatabaseField.database_id == database_id
        ).scalar()
        position = (max_position + 1) if max_position is not None else 0
    else:
        position = field_data.position
    
    field = DatabaseField(
        database_id=database_id,
        name=field_data.name,
        field_type=field_data.field_type,
        field_config=json.dumps(field_data.field_config or {}),
        position=position
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    
    return DatabaseFieldResponse(
        id=field.id,
        database_id=field.database_id,
        name=field.name,
        field_type=field.field_type.value if hasattr(field.field_type, 'value') else field.field_type,
        field_config=json.loads(field.field_config) if field.field_config else {},
        position=field.position,
        is_visible=field.is_visible,
        created_at=field.created_at,
        updated_at=field.updated_at
    )


@router.put("/fields/{field_id}", response_model=DatabaseFieldResponse)
async def update_field(
    field_id: str,
    field_data: DatabaseFieldUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新数据库字段"""
    field = db.query(DatabaseField).filter(DatabaseField.id == field_id).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="字段不存在"
        )
    
    database = db.query(Database).filter(Database.id == field.database_id).first()
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    if field_data.name is not None:
        field.name = field_data.name
    if field_data.field_type is not None:
        field.field_type = field_data.field_type
    if field_data.field_config is not None:
        field.field_config = json.dumps(field_data.field_config)
    if field_data.position is not None:
        field.position = field_data.position
    if field_data.is_visible is not None:
        field.is_visible = field_data.is_visible
    
    db.commit()
    db.refresh(field)
    
    return DatabaseFieldResponse(
        id=field.id,
        database_id=field.database_id,
        name=field.name,
        field_type=field.field_type.value if hasattr(field.field_type, 'value') else field.field_type,
        field_config=json.loads(field.field_config) if field.field_config else {},
        position=field.position,
        is_visible=field.is_visible,
        created_at=field.created_at,
        updated_at=field.updated_at
    )


@router.delete("/fields/{field_id}")
async def delete_field(
    field_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除数据库字段"""
    field = db.query(DatabaseField).filter(DatabaseField.id == field_id).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="字段不存在"
        )
    
    database = db.query(Database).filter(Database.id == field.database_id).first()
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    db.delete(field)
    db.commit()
    
    return {"success": True, "message": "字段已删除"}


# Database Records
@router.get("/{database_id}/records", response_model=List[DatabaseRecordResponse])
async def list_records(
    database_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取数据库记录列表"""
    database = db.query(Database).filter(Database.id == database_id).first()
    
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="数据库不存在"
        )
    
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    records = db.query(DatabaseRecord).filter(
        DatabaseRecord.database_id == database_id
    ).order_by(DatabaseRecord.position).all()
    
    result = []
    for record in records:
        record_dict = {
            "id": record.id,
            "database_id": record.database_id,
            "properties": json.loads(record.properties) if record.properties else {},
            "position": record.position,
            "created_by": record.created_by,
            "created_at": record.created_at,
            "updated_at": record.updated_at
        }
        result.append(DatabaseRecordResponse(**record_dict))
    
    return result


@router.post("/{database_id}/records", response_model=DatabaseRecordResponse)
async def create_record(
    database_id: str,
    record_data: DatabaseRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建数据库记录"""
    database = db.query(Database).filter(Database.id == database_id).first()
    
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="数据库不存在"
        )
    
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    # 计算位置：用 max(position)+1 而非 count()，避免删除行后 position 撞车
    if record_data.position is None:
        max_position = db.query(func.max(DatabaseRecord.position)).filter(
            DatabaseRecord.database_id == database_id
        ).scalar()
        position = (max_position + 1) if max_position is not None else 0
    else:
        position = record_data.position
    
    record = DatabaseRecord(
        database_id=database_id,
        properties=json.dumps(record_data.properties or {}),
        position=position,
        created_by=current_user.id
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    return DatabaseRecordResponse(
        id=record.id,
        database_id=record.database_id,
        properties=json.loads(record.properties) if record.properties else {},
        position=record.position,
        created_by=record.created_by,
        created_at=record.created_at,
        updated_at=record.updated_at
    )


@router.put("/records/{record_id}", response_model=DatabaseRecordResponse)
async def update_record(
    record_id: str,
    record_data: DatabaseRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新数据库记录"""
    record = db.query(DatabaseRecord).filter(DatabaseRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在"
        )
    
    database = db.query(Database).filter(Database.id == record.database_id).first()
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    if record_data.properties is not None:
        record.properties = json.dumps(record_data.properties)
    if record_data.position is not None:
        record.position = record_data.position
    
    db.commit()
    db.refresh(record)
    
    return DatabaseRecordResponse(
        id=record.id,
        database_id=record.database_id,
        properties=json.loads(record.properties) if record.properties else {},
        position=record.position,
        created_by=record.created_by,
        created_at=record.created_at,
        updated_at=record.updated_at
    )


@router.delete("/records/{record_id}")
async def delete_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除数据库记录"""
    record = db.query(DatabaseRecord).filter(DatabaseRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="记录不存在"
        )
    
    database = db.query(Database).filter(Database.id == record.database_id).first()
    check_workspace_access(database.workspace_id, current_user.id, db)
    
    db.delete(record)
    db.commit()
    
    return {"success": True, "message": "记录已删除"}
