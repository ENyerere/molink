"""
API v1 路由
"""
from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .workspaces import router as workspaces_router
from .pages import router as pages_router
from .blocks import router as blocks_router
from .databases import router as databases_router
from .files import router as files_router
from .admin import router as admin_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["认证"])
api_router.include_router(users_router, prefix="/users", tags=["用户"])
api_router.include_router(workspaces_router, prefix="/workspaces", tags=["工作空间"])
api_router.include_router(pages_router, prefix="/pages", tags=["页面"])
api_router.include_router(blocks_router, prefix="/blocks", tags=["内容块"])
api_router.include_router(databases_router, prefix="/databases", tags=["数据库"])
api_router.include_router(files_router, prefix="/files", tags=["文件"])
api_router.include_router(admin_router, prefix="/admin", tags=["管理员"])
