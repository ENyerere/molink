"""
Redis连接管理
"""
import redis.asyncio as redis
from typing import Optional
from .config import settings

redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """获取Redis连接"""
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_client


async def close_redis():
    """关闭Redis连接"""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
