"""
WebSocket API for real-time collaboration
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Set
import json

from app.core.database import get_db, SessionLocal
from app.core.redis import is_token_blacklisted
from app.core.security import verify_token
from app.core.utils import utc_now
from app.models.user import User

router = APIRouter()


class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # page_id -> set of WebSocket connections
        self.page_connections: Dict[str, Set[WebSocket]] = {}
        # WebSocket -> user info
        self.connection_info: Dict[WebSocket, dict] = {}
        # user_id -> set of WebSocket（同一用户多标签页各有连接，不能互相覆盖）
        self.user_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect_to_page(self, websocket: WebSocket, page_id: str, user_info: dict):
        """连接到页面进行协作编辑"""
        await websocket.accept()
        
        if page_id not in self.page_connections:
            self.page_connections[page_id] = set()
        
        self.page_connections[page_id].add(websocket)
        self.connection_info[websocket] = {
            "page_id": page_id,
            "user": user_info
        }
        
        # 广播用户加入消息
        await self.broadcast_to_page(page_id, {
            "type": "user_joined",
            "user": user_info,
            "timestamp": utc_now().isoformat()
        }, exclude=websocket)
    
    async def disconnect_from_page(self, websocket: WebSocket):
        """断开页面连接"""
        if websocket in self.connection_info:
            info = self.connection_info[websocket]
            page_id = info["page_id"]
            user_info = info["user"]
            
            if page_id in self.page_connections:
                self.page_connections[page_id].discard(websocket)
                if not self.page_connections[page_id]:
                    del self.page_connections[page_id]
            
            del self.connection_info[websocket]
            
            # 广播用户离开消息
            await self.broadcast_to_page(page_id, {
                "type": "user_left",
                "user": user_info,
                "timestamp": utc_now().isoformat()
            })
    
    async def broadcast_to_page(self, page_id: str, message: dict, exclude: WebSocket = None):
        """向页面的所有连接广播消息"""
        if page_id in self.page_connections:
            disconnected = []
            for connection in self.page_connections[page_id]:
                if connection != exclude:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        disconnected.append(connection)
            
            # 清理断开的连接
            for conn in disconnected:
                await self.disconnect_from_page(conn)
    
    async def connect_user_status(self, websocket: WebSocket, user_id: str):
        """连接用户状态WebSocket"""
        await websocket.accept()
        self.user_connections.setdefault(user_id, set()).add(websocket)

    async def disconnect_user_status(self, websocket: WebSocket, user_id: str):
        """断开用户状态连接（只移除本连接，不影响同用户的其他标签页）"""
        conns = self.user_connections.get(user_id)
        if conns is not None:
            conns.discard(websocket)
            if not conns:
                del self.user_connections[user_id]
    
    def get_online_users(self) -> List[str]:
        """获取在线用户列表"""
        return list(self.user_connections.keys())
    
    def get_page_users(self, page_id: str) -> List[dict]:
        """获取页面上的用户列表"""
        users = []
        if page_id in self.page_connections:
            for ws in self.page_connections[page_id]:
                if ws in self.connection_info:
                    users.append(self.connection_info[ws]["user"])
        return users


manager = ConnectionManager()


async def get_user_from_token(token: str) -> dict:
    """从token获取用户信息（已 logout 吊销的 token 拒绝建连）"""
    if await is_token_blacklisted(token):
        return None
    payload = verify_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        # 禁用用户不允许建立 WebSocket 连接
        if user and user.is_active:
            return {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url
            }
    finally:
        db.close()
    
    return None


def check_page_access(page_id: str, user_id: str) -> bool:
    """校验用户是否有权访问页面（与 REST 一致：页面所属工作空间的 owner）"""
    # 延迟导入以避免循环依赖
    from app.models.page import Page
    from app.models.workspace import Workspace

    db = SessionLocal()
    try:
        page = (
            db.query(Page)
            .join(Workspace, Page.workspace_id == Workspace.id)
            .filter(Page.id == page_id, Workspace.owner_id == user_id, Page.deleted_at == None)
            .first()
        )
        return page is not None
    finally:
        db.close()


@router.websocket("/editor/{page_id}")
async def websocket_editor(
    websocket: WebSocket,
    page_id: str,
    token: str = Query(...)
):
    """编辑器实时协作WebSocket"""
    # 验证用户
    user_info = await get_user_from_token(token)
    if not user_info:
        await websocket.close(code=4001, reason="认证失败")
        return
    
    # 校验页面访问权限，防止越权加入他人协作房间
    if not check_page_access(page_id, user_info["id"]):
        await websocket.close(code=4003, reason="无权限访问此页面")
        return
    
    await manager.connect_to_page(websocket, page_id, user_info)

    # try/finally 保证任何异常（含畸形 JSON）都会清理连接，避免管理器泄漏
    try:
        # 发送当前页面上的其他用户
        current_users = manager.get_page_users(page_id)
        await websocket.send_json({
            "type": "current_users",
            "users": [u for u in current_users if u["id"] != user_info["id"]]
        })

        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                # 畸形消息等非断开异常：忽略本条继续收，不让连接悬挂
                continue

            # 处理不同类型的消息
            msg_type = data.get("type")
            
            if msg_type == "cursor_move":
                # 光标移动
                await manager.broadcast_to_page(page_id, {
                    "type": "cursor_update",
                    "user": user_info,
                    "cursor": data.get("cursor"),
                    "timestamp": utc_now().isoformat()
                }, exclude=websocket)
            
            elif msg_type == "content_change":
                # 内容变更
                await manager.broadcast_to_page(page_id, {
                    "type": "content_update",
                    "user": user_info,
                    "block_id": data.get("block_id"),
                    "content": data.get("content"),
                    "timestamp": utc_now().isoformat()
                }, exclude=websocket)
            
            elif msg_type == "block_create":
                # 创建块
                await manager.broadcast_to_page(page_id, {
                    "type": "block_created",
                    "user": user_info,
                    "block": data.get("block"),
                    "timestamp": utc_now().isoformat()
                }, exclude=websocket)
            
            elif msg_type == "block_delete":
                # 删除块
                await manager.broadcast_to_page(page_id, {
                    "type": "block_deleted",
                    "user": user_info,
                    "block_id": data.get("block_id"),
                    "timestamp": utc_now().isoformat()
                }, exclude=websocket)
            
            elif msg_type == "block_reorder":
                # 块重排序
                await manager.broadcast_to_page(page_id, {
                    "type": "blocks_reordered",
                    "user": user_info,
                    "block_ids": data.get("block_ids"),
                    "timestamp": utc_now().isoformat()
                }, exclude=websocket)
            
            elif msg_type == "ping":
                # 心跳
                await websocket.send_json({"type": "pong"})

    except Exception:
        # 兜底：任何未预期异常也要走 finally 清理
        pass
    finally:
        await manager.disconnect_from_page(websocket)


@router.websocket("/user-status")
async def websocket_user_status(
    websocket: WebSocket,
    token: str = Query(...)
):
    """用户在线状态WebSocket"""
    user_info = await get_user_from_token(token)
    if not user_info:
        await websocket.close(code=4001, reason="认证失败")
        return

    await manager.connect_user_status(websocket, user_info["id"])

    try:
        # 发送当前在线用户
        await websocket.send_json({
            "type": "online_users",
            "users": manager.get_online_users()
        })

        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                continue

            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except Exception:
        pass
    finally:
        await manager.disconnect_user_status(websocket, user_info["id"])
