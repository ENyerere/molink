"""
Redis连接管理
"""
import hashlib
import logging
import redis.asyncio as redis
from typing import Optional
from .config import settings

logger = logging.getLogger(__name__)

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


# ---------------------------------------------------------------------------
# Token 黑名单（logout 吊销）：key 为 token 的 sha256，TTL = token 剩余有效期
# Redis 不可用时降级放行，仅记录警告，不把可用性绑死在 Redis 上
# ---------------------------------------------------------------------------
TOKEN_BLACKLIST_PREFIX = "token_blacklist:"


def _blacklist_key(token: str) -> str:
    """计算 token 的黑名单 key（只存哈希，不存原始 token）"""
    return TOKEN_BLACKLIST_PREFIX + hashlib.sha256(token.encode()).hexdigest()


async def add_token_to_blacklist(token: str, ttl_seconds: int) -> None:
    """将 token 加入黑名单，TTL 到期后自动清除"""
    try:
        client = await get_redis()
        await client.set(_blacklist_key(token), "1", ex=max(ttl_seconds, 1))
    except Exception as e:
        logger.warning("Redis 不可用，token 黑名单写入失败: %s", e)


async def is_token_blacklisted(token: str) -> bool:
    """检查 token 是否已被吊销；Redis 不可用时放行"""
    try:
        client = await get_redis()
        return await client.exists(_blacklist_key(token)) > 0
    except Exception as e:
        logger.warning("Redis 不可用，跳过 token 黑名单检查: %s", e)
        return False
