"""
文件管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Query
from sqlalchemy.orm import Session
from typing import List
import io
import os
import uuid
import aiofiles
from PIL import Image

from app.core.database import get_db
from app.core.config import settings
from app.core.utils import utc_now
from app.models.user import User
from app.models.file import File
from app.schemas.file import FileResponse, FileUploadResponse
from .auth import get_current_user

router = APIRouter()

# 需要做内容校验的图片扩展名
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def generate_unique_filename(original_filename: str) -> str:
    """生成唯一文件名"""
    ext = get_file_extension(original_filename)
    unique_name = f"{uuid.uuid4().hex}_{utc_now().strftime('%Y%m%d%H%M%S')}"
    return f"{unique_name}.{ext}" if ext else unique_name


def is_valid_image(content: bytes) -> bool:
    """用 PIL 验证内容是否为真实图片（防止伪造扩展名上传）"""
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        return True
    except Exception:
        return False


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上传文件"""
    # ASGI 规范允许 filename 为 None（如 multipart 无 filename 的字段）
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少文件名"
        )

    # 检查文件扩展名（无扩展名直接拒绝，不允许绕过白名单）
    ext = get_file_extension(file.filename)
    if not ext or ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {ext or '无扩展名'}"
        )

    # 读取文件内容检查大小
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件大小超过限制 ({settings.MAX_FILE_SIZE / 1024 / 1024}MB)"
        )

    # 图片类型校验真实内容，防止伪造扩展名
    if ext in IMAGE_EXTENSIONS and not is_valid_image(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件内容不是有效的图片"
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

    # 创建数据库记录（只存相对路径，避免 Host 头注入污染数据；
    # 前端按同源相对路径使用，vite 代理与生产 nginx 均有 /uploads 路由。
    # 存量绝对 URL 记录不做迁移，读取时按库存值原样返回即可兼容）
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
    limit: int = Query(50, le=200),
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
    
    # 先删数据库记录并提交，成功后再删物理文件：
    # 若先删盘上文件而 DB 提交失败，记录会指向已消失的文件
    db.delete(file)
    db.commit()

    file_path = os.path.join(settings.UPLOAD_DIR, file.name)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        # 物理文件删除失败只留孤儿文件，不影响接口语义
        pass

    return {"success": True, "message": "文件已删除"}
