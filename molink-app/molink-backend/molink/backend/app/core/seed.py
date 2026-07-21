"""
初始数据播种
"""
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash


def seed_admin():
    """播种默认管理员：仅当设置了 ADMIN_PASSWORD 且账号不存在时创建"""
    if not settings.ADMIN_PASSWORD:
        return

    # 延迟导入以避免循环依赖
    from app.models.user import User

    db = SessionLocal()
    try:
        exists = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if exists:
            return

        admin = User(
            email=settings.ADMIN_EMAIL,
            password_hash=get_password_hash(settings.ADMIN_PASSWORD),
            full_name="系统管理员",
            is_admin=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"✅ 已创建默认管理员: {settings.ADMIN_EMAIL}")
    finally:
        db.close()
