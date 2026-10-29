"""
Molink API - 主应用入口

自托管块编辑器原型。版本号见 APP_VERSION。
多视图数据库与 WebSocket 路由仍注册，但前端未接入（见各模块文档）。
"""
import sys
import os

# 将项目根目录加入 Python 路径，防止 ModuleNotFoundError
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.core.redis import close_redis
from app.core.migration import auto_migrate
from app.core.seed import seed_admin
from app.api.v1 import api_router
from app.api.websocket import router as ws_router

# 原型版本。不要标成 1.0.0。
APP_VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时创建数据库表（只创建不存在的表，不修改已有表）
    Base.metadata.create_all(bind=engine)
    
    # 自动迁移：检测并添加缺失的列
    auto_migrate()
    
    # 播种默认管理员（需设置 ADMIN_PASSWORD，账号已存在则跳过）
    seed_admin()
    
    # 确保上传目录存在
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    yield
    
    # 关闭时清理资源
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Molink 自托管块编辑器原型 API。"
        "「数据库（未使用）」与「WebSocket（未使用）」仍挂在进程上，前端没有客户端。"
    ),
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    openapi_tags=[
        {
            "name": "数据库（未使用）",
            "description": "前端不调用。页内表格写在页面内容里，没有看板或日历。",
        },
        {
            "name": "WebSocket（未使用）",
            "description": "前端没有 WebSocket 客户端，实时协作未交付。",
        },
    ],
)

# Session 中间件（OAuth state 参数需要）
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY, max_age=600)

# CORS 配置（来源见 settings.CORS_ORIGINS_LIST）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# 注册WebSocket路由
app.include_router(ws_router, prefix="/ws", tags=["WebSocket（未使用）"])

# 静态文件服务（上传的文件）
# 先在模块级确保目录存在再挂载：挂载判断在模块加载时执行，
# 若等 lifespan 里才建目录，首次启动目录不存在会导致 /uploads 永远挂不上
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/")
async def root():
    """API根路径"""
    return {
        "name": settings.APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
