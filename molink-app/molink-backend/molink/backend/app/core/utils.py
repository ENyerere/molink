"""
通用工具函数
"""
from datetime import datetime, timezone


def utc_now() -> datetime:
    """返回当前 UTC 时间（naive）

    MySQL DATETIME 列不带时区，统一返回 naive 对象，
    避免与数据库读出的 naive datetime 比较时抛 TypeError
    （datetime.utcnow() 已弃用，JWT 等需要 aware 的场景请直接用 datetime.now(timezone.utc)）
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
