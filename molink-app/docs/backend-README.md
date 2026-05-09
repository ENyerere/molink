# Molink 后端 - 项目说明

> 本文档描述 Molink 后端服务的架构、API 和基本用法。技术栈：Python 3.13 + FastAPI + MySQL 8.0 + Redis 7。

---

## 项目概述

Molink 是一个类似 Notion 的现代化内容编辑与协作平台，后端提供以下能力：

- 块级编辑器系统（文本、标题、列表、图片、代码块、引用等）
- 页面管理系统（树形结构、层级管理）
- 数据库功能（多视图、多字段类型）
- 用户认证系统（JWT）
- 实时协作编辑（WebSocket）
- 文件管理

---

## 技术栈

- **Python 3.13** + **FastAPI**
- **SQLAlchemy 2.0** + **Pydantic v2**
- **MySQL 8.0**（主数据库）
- **Redis 7**（缓存 / 协作会话）
- **WebSocket**（实时协作）
- **Docker** + **Docker Compose**（部署）

---

## 快速开始

### 前置要求

- Docker Desktop 20.10+
- Docker Compose 2.0+

### 一键启动（Docker）

```powershell
cd molink-backend/molink
docker compose up mysql redis backend --build
```

启动后访问：
- API 文档：http://localhost:8000/api/docs
- 健康检查：http://localhost:8000/health

### 默认账户

系统初始化时会创建一个管理员账户：
- 邮箱：`admin@molink.local`
- 密码：`admin123`

> ⚠️ 请在首次登录后立即修改默认密码！

---

## 项目结构

```
molink-app/
├── docs/                           # 项目文档
│   ├── backend-README.md           # 本文档
│   ├── backend-启动指南.md          # 部署与故障排查
│   ├── backend-本地开发启动指南.md   # 本地开发指南
│   └── database-design.md          # 数据库设计文档
├── src/                            # 前端 React 源码
├── molink-backend/
│   └── molink/
│       ├── docker-compose.yml      # Docker 编排配置
│       ├── docker-compose.override.yml  # 开发模式热重载（本地生成，不提交）
│       ├── init-db.sql             # 数据库初始化脚本
│       ├── start.ps1               # PowerShell 启动脚本
│       ├── check-env.ps1           # 环境检查脚本
│       ├── diagnose-docker.ps1     # Docker 诊断脚本
│       └── backend/                # 后端源代码
│           ├── app/
│           │   ├── main.py         # FastAPI 入口
│           │   ├── api/            # API 路由（v1 + WebSocket）
│           │   ├── core/           # 核心配置（config / database / redis / security）
│           │   ├── models/         # SQLAlchemy 数据库模型
│           │   ├── schemas/        # Pydantic 数据校验模型
│           │   ├── services/       # 业务逻辑层（预留）
│           │   └── utils/          # 工具函数（预留）
│           ├── Dockerfile          # 后端容器配置
│           └── requirements.txt    # Python 依赖
└── ...
```

---

## API 文档

### 认证相关

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/auth/register | 用户注册 |
| POST | /api/v1/auth/login | 用户登录（JSON） |
| POST | /api/v1/auth/login/form | 用户登录（OAuth2 Form，供 Swagger 测试） |
| POST | /api/v1/auth/logout | 用户登出 |
| GET | /api/v1/auth/me | 获取当前用户信息 |

### 工作空间

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/workspaces | 获取工作空间列表 |
| POST | /api/v1/workspaces | 创建工作空间 |
| GET | /api/v1/workspaces/{id} | 获取工作空间详情 |
| PUT | /api/v1/workspaces/{id} | 更新工作空间 |
| DELETE | /api/v1/workspaces/{id} | 删除工作空间 |

### 页面管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/pages | 获取页面列表 |
| POST | /api/v1/pages | 创建页面 |
| GET | /api/v1/pages/{id} | 获取页面详情 |
| PUT | /api/v1/pages/{id} | 更新页面 |
| DELETE | /api/v1/pages/{id} | 删除页面 |
| GET | /api/v1/pages/{id}/children | 获取子页面 |

### 内容块

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/blocks | 获取页面块列表 |
| POST | /api/v1/blocks | 创建块 |
| GET | /api/v1/blocks/{id} | 获取块详情 |
| PUT | /api/v1/blocks/{id} | 更新块 |
| DELETE | /api/v1/blocks/{id} | 删除块 |
| POST | /api/v1/blocks/reorder | 块重排序 |

### 数据库

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/databases | 获取数据库列表 |
| POST | /api/v1/databases | 创建数据库 |
| GET | /api/v1/databases/{id} | 获取数据库详情 |
| PUT | /api/v1/databases/{id} | 更新数据库 |
| DELETE | /api/v1/databases/{id} | 删除数据库 |
| GET | /api/v1/databases/{id}/fields | 获取字段列表 |
| POST | /api/v1/databases/{id}/fields | 创建字段 |
| PUT | /api/v1/databases/fields/{id} | 更新字段 |
| DELETE | /api/v1/databases/fields/{id} | 删除字段 |
| GET | /api/v1/databases/{id}/records | 获取记录列表 |
| POST | /api/v1/databases/{id}/records | 创建记录 |
| PUT | /api/v1/databases/records/{id} | 更新记录 |
| DELETE | /api/v1/databases/records/{id} | 删除记录 |

### 文件

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/files/upload | 上传文件 |
| GET | /api/v1/files | 获取文件列表 |
| GET | /api/v1/files/{id} | 获取文件详情 |
| DELETE | /api/v1/files/{id} | 删除文件 |

### WebSocket

| 路径 | 描述 |
|------|------|
| /ws/editor/{page_id} | 编辑器实时协作（光标、内容同步） |
| /ws/user-status | 用户在线状态 |

---

## 开发指南

### 本地开发（Docker 方式，推荐）

```powershell
cd molink-backend/molink

# 启动 MySQL + Redis + 后端（带热重载）
docker compose up mysql redis backend
```

> 需要热重载？确保目录下有 `docker-compose.override.yml`（开发配置，已加入 .gitignore 不提交）。

### 本地开发（手动方式）

1. **启动数据库**：
   ```powershell
   cd molink-backend/molink
   docker compose up -d mysql redis
   ```

2. **启动后端**：
   ```powershell
   cd molink-backend/molink/backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

### 前端开发

```powershell
# 在项目根目录
cd molink-app
npm install
npm run dev
```

前端默认运行在 http://localhost:5173，通过代理连接后端 http://localhost:8000。

---

## 数据库变更说明

项目当前使用 SQLAlchemy `Base.metadata.create_all()` 在启动时自动创建**不存在的表**。

> ⚠️ **注意**：这只会建表，不会修改已有表结构（如新增字段、修改类型）。如需修改已有表结构，需要手动执行 ALTER 语句，或引入 Alembic 等数据库迁移工具。

---

## 性能优化

- MySQL 连接池：20 个常驻连接 + 30 个溢出连接
- Redis 缓存支持（已接入，预留扩展）
- WebSocket 心跳机制
- 静态资源通过 Nginx/容器外挂载提供

---

## 安全建议

1. 生产环境必须修改 `SECRET_KEY`（默认是 `1234567890`，极其危险）
2. 生产环境必须修改 MySQL 的 `root_password` 和 `MYSQL_PASSWORD`
3. 使用 HTTPS 部署
4. 限制 `CORS_ORIGINS` 为实际前端域名
5. 定期更新 Python 依赖：`pip list --outdated`

---

## 故障排除

遇到问题请参考：
- **[backend-启动指南.md](./backend-启动指南.md)** — Docker 部署、常见错误排查
- **[backend-本地开发启动指南.md](./backend-本地开发启动指南.md)** — 本地手动启动步骤

常用命令：
```powershell
# 查看容器状态
docker compose ps

# 查看后端日志
docker logs -f molink-backend

# 重启后端
docker compose restart backend
```

---

## 许可证

MIT License
