"""
页面管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
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
        Page.is_archived == is_archived,
        Page.deleted_at == None
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


@router.get("/trash/list", response_model=List[PageResponse])
async def list_trash_pages(
    workspace_id: str = Query(..., description="工作空间ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取回收站中的页面列表"""
    check_workspace_access(workspace_id, current_user.id, db)
    
    pages = db.query(Page).filter(
        Page.workspace_id == workspace_id,
        Page.deleted_at != None
    ).order_by(Page.deleted_at.desc()).all()
    
    return [PageResponse.model_validate(p) for p in pages]


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

    # 修改父页面时校验合法性，防止页面树成环
    if "parent_id" in update_data:
        new_parent_id = update_data["parent_id"]
        if new_parent_id is not None and new_parent_id != page.parent_id:
            if new_parent_id == page.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="不能将页面移动到自己下面"
                )
            new_parent = db.query(Page).filter(Page.id == new_parent_id).first()
            if not new_parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="父页面不存在"
                )
            if new_parent.workspace_id != page.workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="不能移动页面到其他工作空间的页面下"
                )
            if new_parent.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="不能移动页面到回收站中的页面下"
                )
            # 沿新父页面的祖先链向上检查：若链上遇到当前页面，说明新父页面是
            # 当前页面的后代，移动后会成环；visited 集合防止已有环数据导致死循环
            visited = set()
            cursor = new_parent
            while cursor is not None:
                if cursor.id in visited:
                    break
                visited.add(cursor.id)
                if cursor.id == page.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="不能将页面移动到自己的子页面下"
                    )
                if cursor.parent_id is None:
                    break
                cursor = db.query(Page).filter(Page.id == cursor.parent_id).first()

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
    """软删除页面（移入回收站），同一事务内级联软删除整棵子树"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    check_workspace_access(page.workspace_id, current_user.id, db)
    
    # 同批删除的页面共享同一个 deleted_at 时间戳，作为"删除批次"标识，
    # 恢复时据此区分"随本页同批删除"与"更早单独删除"的后代
    deleted_at = datetime.utcnow()
    page.deleted_at = deleted_at
    
    def mark_descendants(parent_id: str):
        # 只处理未删除的后代，已被单独删除的子树保持原状
        children = db.query(Page).filter(
            Page.parent_id == parent_id,
            Page.deleted_at == None
        ).all()
        for child in children:
            child.deleted_at = deleted_at
            mark_descendants(child.id)
    
    mark_descendants(page.id)
    db.commit()
    
    return {"success": True, "message": "页面已移入回收站"}


@router.post("/{page_id}/restore", response_model=PageResponse)
async def restore_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """从回收站恢复页面（仅恢复与本页同批删除的后代页面）"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    check_workspace_access(page.workspace_id, current_user.id, db)
    
    # 删除时同批页面共享同一时间戳：只恢复 deleted_at 与本页完全相同的后代，
    # 早于本页单独删除的后代保持删除态；整个恢复一次提交
    batch_deleted_at = page.deleted_at
    page.deleted_at = None
    
    if batch_deleted_at is not None:
        def restore_descendants(parent_id: str):
            children = db.query(Page).filter(Page.parent_id == parent_id).all()
            for child in children:
                if child.deleted_at is not None and child.deleted_at == batch_deleted_at:
                    child.deleted_at = None
                    restore_descendants(child.id)
        
        restore_descendants(page.id)
    
    db.commit()
    db.refresh(page)
    
    return PageResponse.model_validate(page)


@router.delete("/{page_id}/permanent")
async def permanent_delete_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """永久删除页面"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    check_workspace_access(page.workspace_id, current_user.id, db)
    
    def delete_descendants(parent_id: str):
        children = db.query(Page).filter(Page.parent_id == parent_id).all()
        for child in children:
            delete_descendants(child.id)
            db.delete(child)
    
    delete_descendants(page.id)
    db.delete(page)
    db.commit()
    
    return {"success": True, "message": "页面已永久删除"}


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
        Page.is_archived == False,
        Page.deleted_at == None
    ).order_by(Page.position).all()
    
    return [PageResponse.model_validate(p) for p in children]
