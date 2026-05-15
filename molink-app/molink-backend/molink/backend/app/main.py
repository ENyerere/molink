"""
Molink API - 主应用入口
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
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.core.redis import close_redis
from app.core.migration import auto_migrate
from app.api.v1 import api_router
from app.api.websocket import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时创建数据库表（只创建不存在的表，不修改已有表）
    Base.metadata.create_all(bind=engine)
    
    # 自动迁移：检测并添加缺失的列
    auto_migrate()
    
    # 确保上传目录存在
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    yield
    
    # 关闭时清理资源
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    description="Molink - 现代化内容编辑与协作平台 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Session 中间件（OAuth state 参数需要）
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY, max_age=600)

# CORS配置
origins = [
    "http://localhost:5173",    # Vite 开发服务器默认端口
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 调试中间件：打印所有请求头
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"Request: {request.method} {request.url}")
    print(f"Headers: {request.headers}")
    response = await call_next(request)
    return response

# 注册API路由
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# 注册WebSocket路由
app.include_router(ws_router, prefix="/ws", tags=["WebSocket"])

# 静态文件服务（上传的文件）
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/")
async def root():
    """API根路径"""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
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
