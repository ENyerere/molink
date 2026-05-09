# Molink 本地开发启动指南

> 本文档说明如何在本地环境中（非 Docker 容器内）启动 Molink 后端服务，便于开发和调试。
>
> 如果你只想快速跑起来，请直接使用 [backend-启动指南.md](./backend-启动指南.md) 中的一键 Docker 方案。

---

## 前置条件

在开始之前，请确保已安装以下软件：

- **Python 3.13+**
- **Node.js 18+** & **npm**
- **Docker Desktop**（仅用于运行 MySQL 和 Redis 容器）

---

## 1. 启动基础服务（MySQL & Redis）

我们使用 Docker 来运行数据库和缓存，避免在本地直接安装 MySQL。

```powershell
# 进入后端 docker-compose 所在目录
cd molink-backend/molink

# 只启动 MySQL 和 Redis（不启动后端和前端容器）
docker compose up -d mysql redis
```

验证服务状态：
- MySQL：`localhost:3306`
- Redis：`localhost:16379`（Docker 映射的非标准端口，避免与本地 Redis 冲突）

---

## 2. 启动后端（Backend）

### 2.1 环境配置

本地开发时，后端需要连接 `localhost` 上的数据库，而不是 Docker 容器名。

检查配置文件（`molink-backend/molink/backend/app/core/config.py`）：

```python
# 数据库配置（默认值）
MYSQL_HOST: str = "localhost"
MYSQL_PORT: int = 3306
MYSQL_USER: str = "molink"
MYSQL_PASSWORD: str = "molink_password"
MYSQL_DATABASE: str = "molink_db"

# Redis 配置（默认值）
REDIS_HOST: str = "localhost"
REDIS_PORT: int = 16379   # 对应 Docker 映射的本地端口
```

> 提示：项目支持通过 `.env` 文件覆盖上述默认值。如需修改，在 `molink-backend/molink/backend/` 目录下创建 `.env` 文件即可。

### 2.2 安装依赖

建议使用 Python 虚拟环境：

```powershell
# 进入后端代码目录
cd molink-backend/molink/backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境（Windows）
.\venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 2.3 启动服务

确保虚拟环境已激活，然后在 `backend` 目录下运行：

```powershell
# 方式一：直接运行（和 Docker 内的启动命令一致）
python app/main.py

# 方式二：使用 uvicorn（推荐，支持 --reload 热重载）
uvicorn app.main:app --reload --port 8000
```

成功启动后，你会看到：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

访问地址：
- **API 文档**：http://localhost:8000/api/docs
- **健康检查**：http://localhost:8000/health

---

## 3. 启动前端（Frontend）

在**项目根目录**（`molink-app/`）下执行：

```powershell
# 项目根目录
cd molink-app

# 安装依赖（如已安装可跳过）
npm install

# 启动开发服务器
npm run dev
```

成功启动后，终端会显示访问地址：
- **前端访问**：http://localhost:5173

前端会通过代理自动连接后端 `http://localhost:8000`，无需额外配置。

---

## 4. 开发模式目录速查

```
molink-app/                          ← 项目根目录
│
├── src/                             ← 前端 React 源码
│   ├── App.tsx
│   ├── Editor.tsx
│   └── ...
│
├── docs/                            ← 项目文档
│   └── ...
│
└── molink-backend/
    └── molink/
        ├── docker-compose.yml       ← 启动 MySQL/Redis 用
        ├── init-db.sql              ← 数据库初始化
        └── backend/                 ← 后端源码
            ├── app/
            │   ├── main.py          ← FastAPI 入口
            │   ├── core/
            │   │   ├── config.py    ← 配置文件
            │   │   └── ...
            │   └── ...
            ├── requirements.txt
            └── venv/                ← Python 虚拟环境（自动生成）
```

---

## 5. 常见问题排查

### 5.1 数据库连接失败（OperationalError: 2003）

**原因**：后端尝试连接的主机名不正确，或 Docker 中的 MySQL 未启动。

**解决**：
1. 确认 MySQL 容器正在运行：`docker compose ps mysql`
2. 检查 `config.py` 或 `.env` 中 `MYSQL_HOST` 是否为 `localhost`
3. 确认端口 `3306` 未被本地其他 MySQL 占用

### 5.2 ModuleNotFoundError: No module named 'app'

**原因**：运行时的当前工作目录不正确。

**解决**：
- 确保在 `molink-backend/molink/backend/` 目录下运行命令
- 或在 VS Code 的 `launch.json` 中设置 `"cwd": "${workspaceFolder}/molink-backend/molink/backend"`

### 5.3 端口冲突

| 端口 | 用途 | 冲突处理 |
|------|------|---------|
| 3306 | MySQL | 如果本地已有 MySQL，修改 `docker-compose.yml` 端口映射为 `"3307:3306"` |
| 16379 | Redis | 已使用非标准端口，一般无冲突 |
| 8000 | 后端 | 如果被占用，启动时加 `--port 8001` |
| 5173 | 前端 Vite | 如果被占用，Vite 会自动递增端口 |

### 5.4 修改代码后后端没有自动重启

**原因**：没有使用 `--reload` 参数。

**解决**：使用 `uvicorn app.main:app --reload --port 8000` 启动。

---

## 6. 与 Docker 开发模式对比

| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **本地手动启动**（本文档） | 频繁修改后端代码 | 启动快、IDE 调试方便、热重载灵敏 | 需要本地安装 Python、配置虚拟环境 |
| **Docker 开发模式** | 快速验证 / 团队协作 | 环境一致、一键启动、无需本地 Python | 首次 build 较慢、容器内调试稍麻烦 |

建议：
- **主力开发**：使用本文档的本地手动方式
- **验证部署 / 测试 Docker 配置**：使用 [backend-启动指南.md](./backend-启动指南.md) 的 Docker 方式
