"""
内容块管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.page import Page
from app.models.block import Block
from app.schemas.block import BlockCreate, BlockUpdate, BlockResponse, BlockReorder
from .auth import get_current_user

router = APIRouter()


def check_page_access(page_id: str, user_id: str, db: Session) -> Page:
    """检查用户对页面的访问权限"""
    page = db.query(Page).filter(Page.id == page_id).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面不存在"
        )
    
    workspace = db.query(Workspace).filter(
        Workspace.id == page.workspace_id,
        Workspace.owner_id == user_id
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限访问此页面"
        )
    
    return page


@router.get("/", response_model=List[BlockResponse])
async def list_blocks(
    page_id: str = Query(..., description="页面ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取页面的所有块"""
    check_page_access(page_id, current_user.id, db)
    
    blocks = db.query(Block).filter(
        Block.page_id == page_id
    ).order_by(Block.position).all()
    
    # 解析JSON内容
    result = []
    for block in blocks:
        block_dict = {
            "id": block.id,
            "page_id": block.page_id,
            "parent_block_id": block.parent_block_id,
            "block_type": block.block_type.value if hasattr(block.block_type, 'value') else block.block_type,
            "content": json.loads(block.content) if block.content else {},
            "position": block.position,
            "created_at": block.created_at,
            "updated_at": block.updated_at
        }
        result.append(BlockResponse(**block_dict))
    
    return result


@router.post("/", response_model=BlockResponse)
async def create_block(
    block_data: BlockCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建块"""
    check_page_access(block_data.page_id, current_user.id, db)
    
    # 计算位置
    if block_data.position is None:
        max_position = db.query(Block).filter(
            Block.page_id == block_data.page_id
        ).count()
        position = max_position
    else:
        position = block_data.position
    
    block = Block(
        page_id=block_data.page_id,
        parent_block_id=block_data.parent_block_id,
        block_type=block_data.block_type,
        content=json.dumps(block_data.content or {}),
        position=position
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    
    return BlockResponse(
        id=block.id,
        page_id=block.page_id,
        parent_block_id=block.parent_block_id,
        block_type=block.block_type.value if hasattr(block.block_type, 'value') else block.block_type,
        content=json.loads(block.content) if block.content else {},
        position=block.position,
        created_at=block.created_at,
        updated_at=block.updated_at
    )


@router.get("/{block_id}", response_model=BlockResponse)
async def get_block(
    block_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取块详情"""
    block = db.query(Block).filter(Block.id == block_id).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="块不存在"
        )
    
    check_page_access(block.page_id, current_user.id, db)
    
    return BlockResponse(
        id=block.id,
        page_id=block.page_id,
        parent_block_id=block.parent_block_id,
        block_type=block.block_type.value if hasattr(block.block_type, 'value') else block.block_type,
        content=json.loads(block.content) if block.content else {},
        position=block.position,
        created_at=block.created_at,
        updated_at=block.updated_at
    )


@router.put("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: str,
    block_data: BlockUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新块"""
    block = db.query(Block).filter(Block.id == block_id).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="块不存在"
        )
    
    check_page_access(block.page_id, current_user.id, db)
    
    if block_data.block_type is not None:
        block.block_type = block_data.block_type
    if block_data.content is not None:
        block.content = json.dumps(block_data.content)
    if block_data.position is not None:
        block.position = block_data.position
    
    db.commit()
    db.refresh(block)
    
    return BlockResponse(
        id=block.id,
        page_id=block.page_id,
        parent_block_id=block.parent_block_id,
        block_type=block.block_type.value if hasattr(block.block_type, 'value') else block.block_type,
        content=json.loads(block.content) if block.content else {},
        position=block.position,
        created_at=block.created_at,
        updated_at=block.updated_at
    )


@router.delete("/{block_id}")
async def delete_block(
    block_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除块"""
    block = db.query(Block).filter(Block.id == block_id).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="块不存在"
        )
    
    check_page_access(block.page_id, current_user.id, db)
    
    db.delete(block)
    db.commit()
    
    return {"success": True, "message": "块已删除"}


@router.post("/reorder")
async def reorder_blocks(
    reorder_data: BlockReorder,
    page_id: str = Query(..., description="页面ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """重新排序块"""
    check_page_access(page_id, current_user.id, db)
    
    for index, block_id in enumerate(reorder_data.block_ids):
        block = db.query(Block).filter(
            Block.id == block_id,
            Block.page_id == page_id
        ).first()
        
        if block:
            block.position = index
    
    db.commit()
    
    return {"success": True, "message": "块已重新排序"}
