# Molink Backend Dockerfile
FROM python:3.13-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安装系统依赖（只留 curl 供 healthcheck 使用；
# requirements 全部为纯 Python 或官方 wheel，无需 gcc/libmariadb-dev/pkg-config 编译工具链）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建上传目录与非 root 运行用户，并把 /app 归属给它
# 注意：已有的 uploads_data 命名卷如是 root 属主，重建后需手动 chown 一次
RUN mkdir -p /app/uploads \
    && useradd --create-home --shell /usr/sbin/nologin app \
    && chown -R app:app /app

# 以非 root 用户运行
USER app

# 暴露端口
EXPOSE 8000

# 启动命令（必须保持单 worker：WebSocket 连接管理器是内存态，
# 多 worker 会导致同房间连接分散在不同进程、广播断裂；
# 扩 worker 前需先接入 Redis pub/sub 做跨进程消息分发）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
