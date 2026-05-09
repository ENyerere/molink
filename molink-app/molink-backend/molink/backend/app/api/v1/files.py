"""
文件管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import aiofiles
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.file import File
from app.schemas.file import FileResponse, FileUploadResponse
from .auth import get_current_user

router = APIRouter()


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def generate_unique_filename(original_filename: str) -> str:
    """生成唯一文件名"""
    ext = get_file_extension(original_filename)
    unique_name = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    return f"{unique_name}.{ext}" if ext else unique_name


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上传文件"""
    # 检查文件扩展名
    ext = get_file_extension(file.filename)
    if ext and ext not in settings.ALLOWED_EXTENSIONS:
        return FileUploadResponse(
            success=False,
            error=f"不支持的文件类型: {ext}"
        )
    
    # 读取文件内容检查大小
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        return FileUploadResponse(
            success=False,
            error=f"文件大小超过限制 ({settings.MAX_FILE_SIZE / 1024 / 1024}MB)"
        )
    
    # 生成唯一文件名
    unique_filename = generate_unique_filename(file.filename)
    
    # 确保上传目录存在
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    # 保存文件
    file_path = os.path.join(upload_dir, unique_filename)
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # 创建数据库记录
    file_record = File(
        name=unique_filename,
        original_name=file.filename,
        url=f"/uploads/{unique_filename}",
        file_type=ext,
        mime_type=file.content_type,
        size=len(content),
        user_id=current_user.id
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)
    
    return FileUploadResponse(
        success=True,
        file=FileResponse.model_validate(file_record)
    )


@router.get("/", response_model=List[FileResponse])
async def list_files(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取文件列表"""
    files = db.query(File).filter(
        File.user_id == current_user.id
    ).order_by(File.created_at.desc()).offset(skip).limit(limit).all()
    
    return [FileResponse.model_validate(f) for f in files]


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取文件详情"""
    file = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    return FileResponse.model_validate(file)


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除文件"""
    file = db.query(File).filter(
        File.id == file_id,
        File.user_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 删除物理文件
    file_path = os.path.join(settings.UPLOAD_DIR, file.name)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # 删除数据库记录
    db.delete(file)
    db.commit()
    
    return {"success": True, "message": "文件已删除"}
