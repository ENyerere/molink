"""
页面管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.page import Page
from app.schemas.page import PageCreate, PageUpdate, PageResponse
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


@router.get("/", response_model=List[PageResponse])
async def list_pages(
    workspace_id: str = Query(..., description="工作空间ID"),
    parent_id: Optional[str] = Query(None, description="父页面ID"),
    is_archived: bool = Query(False, description="是否包含已归档页面"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取页面列表"""
    check_workspace_access(workspace_id, current_user.id, db)
    
    query = db.query(Page).filter(
        Page.workspace_id == workspace_id,
        Page.is_archived == is_archived
    )
    
    if parent_id:
        query = query.filter(Page.parent_id == parent_id)
    else:
        query = query.filter(Page.parent_id == None)
    
    pages = query.order_by(Page.position).all()
    return [PageResponse.model_validate(p) for p in pages]


@router.post("/", response_model=PageResponse)
async def create_page(
    page_data: PageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建页面"""
    check_workspace_access(page_data.workspace_id, current_user.id, db)
    
    # 计算位置
    max_position = db.query(Page).filter(
        Page.workspace_id == page_data.workspace_id,
        Page.parent_id == page_data.parent_id
    ).count()
    
    page = Page(
        workspace_id=page_data.workspace_id,
        parent_id=page_data.parent_id,
        title=page_data.title,
        page_type=page_data.page_type,
        icon=page_data.icon,
        position=max_position,
        created_by=current_user.id
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    
    return PageResponse.model_validate(page)


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取页面详情"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    check_workspace_access(page.workspace_id, current_user.id, db)
    
    return PageResponse.model_validate(page)


@router.put("/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: str,
    page_data: PageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新页面"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    check_workspace_access(page.workspace_id, current_user.id, db)
    
    update_data = page_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(page, field, value)
    
    db.commit()
    db.refresh(page)
    
    return PageResponse.model_validate(page)


@router.delete("/{page_id}")
async def delete_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除页面"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    check_workspace_access(page.workspace_id, current_user.id, db)
    
    db.delete(page)
    db.commit()
    
    return {"success": True, "message": "页面已删除"}


@router.get("/{page_id}/children", response_model=List[PageResponse])
async def get_page_children(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取子页面列表"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    check_workspace_access(page.workspace_id, current_user.id, db)
    
    children = db.query(Page).filter(
        Page.parent_id == page_id,
        Page.is_archived == False
    ).order_by(Page.position).all()
    
    return [PageResponse.model_validate(p) for p in children]
