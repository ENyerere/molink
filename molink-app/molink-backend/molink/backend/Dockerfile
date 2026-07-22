# syntax=docker/dockerfile:1
# Molink Backend Dockerfile
FROM python:3.13-slim

# 构建参数：pip 镜像源，默认官方 PyPI；国内网络可传清华源加速，如
# PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple（compose 已透传，可写进 .env）
ARG PIP_INDEX_URL=""

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
# BuildKit 缓存挂载：requirements 变更时只需下载新增包；缓存存于构建缓存
# 而非镜像层，镜像体积不受影响（因此不再需要 --no-cache-dir）
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install ${PIP_INDEX_URL:+--index-url "$PIP_INDEX_URL"} -r requirements.txt

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
