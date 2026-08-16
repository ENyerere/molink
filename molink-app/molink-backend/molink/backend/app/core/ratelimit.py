"""
简易内存滑动窗口限流器（按 IP + 端点）

无外部依赖，进程内 dict + 时间戳列表实现；多进程/多实例部署时不共享，
仅用于挡住单实例层面的暴力破解，够用即可。
"""
import time
import threading
from collections import defaultdict
from typing import Callable

from fastapi import Request, HTTPException, status

from .config import settings


class SlidingWindowRateLimiter:
    """滑动窗口限流器：key -> 时间戳列表"""

    def __init__(self):
        self._records: dict = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, key: str, limit: int, window_seconds: int) -> bool:
        """检查 key 在窗口内是否还有额度；有则记录本次并放行"""
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            timestamps = self._records[key]
            # 滑出窗口的旧记录丢弃
            self._records[key] = timestamps = [t for t in timestamps if t > cutoff]
            if len(timestamps) >= limit:
                return False
            timestamps.append(now)
            return True


# 全局限流器实例
rate_limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    """获取客户端 IP。

    仅当配置了 TRUSTED_PROXY（可信反向代理 IP，逗号分隔）且请求确实来自该代理时，
    才信任 X-Forwarded-For；否则一律用直连 IP，防止伪造 XFF 绕过限流。
    """
    trusted_proxies = settings.TRUSTED_PROXY_LIST
    direct_ip = request.client.host if request.client else "unknown"
    if not trusted_proxies:
        return direct_ip
    if direct_ip not in trusted_proxies:
        return direct_ip
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # 取最右侧可信链之外的第一个 IP（最靠近代理的真实客户端）
        return forwarded_for.split(",")[0].strip()
    return direct_ip


def rate_limit(endpoint: str, limit: int, window_seconds: int = 60) -> Callable:
    """生成 FastAPI 依赖：对指定端点按 IP 限流，超限返回 429"""

    async def _dependency(request: Request) -> None:
        key = f"{endpoint}:{get_client_ip(request)}"
        if not rate_limiter.is_allowed(key, limit, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="请求过于频繁，请稍后再试"
            )

    return _dependency
