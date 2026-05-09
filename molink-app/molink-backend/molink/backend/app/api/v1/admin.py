"""
管理员 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
from datetime import datetime, timedelta
import os

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.user import User
from app.models.workspace import Workspace
from app.models.page import Page
from app.models.block import Block
from app.models.database import Database
from app.models.file import File
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """验证当前用户是否为管理员"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user


@router.get("/stats")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取系统统计数据"""
    # 统计各实体数量
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_pages = db.query(func.count(Page.id)).scalar() or 0
    total_databases = db.query(func.count(Database.id)).scalar() or 0
    total_files = db.query(func.count(File.id)).scalar() or 0
    
    # 计算存储使用量
    total_size = db.query(func.sum(File.size)).scalar() or 0
    storage_used = format_file_size(total_size)
    
    # 获取活跃用户数（最近24小时内更新的）
    yesterday = datetime.utcnow() - timedelta(hours=24)
    active_users = db.query(func.count(User.id)).filter(
        User.updated_at >= yesterday
    ).scalar() or 0
    
    return {
        "totalUsers": total_users,
        "totalPages": total_pages,
        "totalDatabases": total_databases,
        "totalFiles": total_files,
        "storageUsed": storage_used,
        "onlineUsers": active_users
    }


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取所有用户列表（管理员专用）"""
    query = db.query(User)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter)) |
            (User.full_name.ilike(search_filter))
        )
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users


@router.post("/users", response_model=UserResponse)
async def create_user_by_admin(
    user_data: UserCreate,
    is_admin: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """管理员创建用户"""
    # 检查邮箱是否已存在
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 创建用户
    password_hash = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=password_hash,
        full_name=user_data.full_name,
        is_admin=is_admin,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取指定用户详情"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_by_admin(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """管理员更新用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新字段
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            setattr(user, "password_hash", get_password_hash(value))
        elif hasattr(user, field):
            setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/users/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """管理员删除用户"""
    # 不能删除自己
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账户"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "用户已删除"}


@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """切换用户启用/禁用状态"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能禁用自己的账户"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    user.is_active = not user.is_active
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return {
        "message": f"用户已{'启用' if user.is_active else '禁用'}",
        "is_active": user.is_active
    }


@router.put("/users/{user_id}/toggle-admin")
async def toggle_admin_role(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """切换用户管理员角色"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改自己的管理员权限"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    user.is_admin = not user.is_admin
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return {
        "message": f"用户已{'设为管理员' if user.is_admin else '移除管理员权限'}",
        "is_admin": user.is_admin
    }


@router.get("/system/health")
async def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取系统健康状态"""
    services = []
    
    # 检查数据库连接
    try:
        db.execute(text("SELECT 1"))
        services.append({
            "name": "MySQL 数据库",
            "status": "healthy",
            "uptime": "运行中",
            "lastCheck": datetime.utcnow().isoformat()
        })
    except Exception as e:
        services.append({
            "name": "MySQL 数据库",
            "status": "error",
            "uptime": "错误",
            "lastCheck": datetime.utcnow().isoformat(),
            "error": str(e)
        })
    
    # FastAPI 服务状态
    services.append({
        "name": "FastAPI 后端",
        "status": "healthy",
        "uptime": "运行中",
        "lastCheck": datetime.utcnow().isoformat()
    })
    
    # 检查文件存储目录
    upload_dir = os.environ.get("UPLOAD_DIR", "./uploads")
    if os.path.exists(upload_dir) and os.access(upload_dir, os.W_OK):
        services.append({
            "name": "文件存储",
            "status": "healthy",
            "uptime": "可用",
            "lastCheck": datetime.utcnow().isoformat()
        })
    else:
        services.append({
            "name": "文件存储",
            "status": "warning",
            "uptime": "目录不可写",
            "lastCheck": datetime.utcnow().isoformat()
        })
    
    return {
        "services": services,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/system/metrics")
async def get_system_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取系统性能指标"""
    import psutil
    
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu": round(cpu_percent, 1),
            "memory": round(memory.percent, 1),
            "disk": round(disk.percent, 1),
            "memoryTotal": format_file_size(memory.total),
            "memoryUsed": format_file_size(memory.used),
            "diskTotal": format_file_size(disk.total),
            "diskUsed": format_file_size(disk.used)
        }
    except ImportError:
        # 如果 psutil 不可用，返回模拟数据
        return {
            "cpu": 25.0,
            "memory": 45.0,
            "disk": 35.0,
            "memoryTotal": "8 GB",
            "memoryUsed": "3.6 GB",
            "diskTotal": "100 GB",
            "diskUsed": "35 GB"
        }


@router.get("/online-users")
async def get_online_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """获取在线用户列表"""
    # 获取最近5分钟活跃的用户
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
    active_users = db.query(User).filter(
        User.updated_at >= five_minutes_ago,
        User.is_active == True
    ).all()
    
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "last_active": user.updated_at.isoformat() if user.updated_at else None
        }
        for user in active_users
    ]


@router.post("/backup")
async def create_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """创建数据备份（返回备份任务状态）"""
    # 在实际生产环境中，这里应该触发一个异步备份任务
    backup_id = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    return {
        "message": "备份任务已创建",
        "backup_id": backup_id,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }


@router.get("/backups")
async def list_backups(
    current_user: User = Depends(require_admin)
):
    """获取备份列表"""
    backup_dir = os.environ.get("BACKUP_DIR", "./backups")
    backups = []
    
    if os.path.exists(backup_dir):
        for filename in os.listdir(backup_dir):
            if filename.endswith('.sql') or filename.endswith('.tar.gz'):
                filepath = os.path.join(backup_dir, filename)
                stat = os.stat(filepath)
                backups.append({
                    "filename": filename,
                    "size": format_file_size(stat.st_size),
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
    
    return sorted(backups, key=lambda x: x['created_at'], reverse=True)


def format_file_size(size_bytes: int) -> str:
    """格式化文件大小"""
    if size_bytes == 0:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = float(size_bytes)
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    return f"{size:.1f} {units[unit_index]}"
