# Molink - 现代化内容编辑与协作平台（本地化部署版）

## 项目概述

Molink 是一个类似 Notion 的现代化内容编辑与协作平台，支持：

# Molink - 现代化内容编辑与协作平台（本地化部署版）

## 项目概述

Molink 是一个类似 Notion 的现代化内容编辑与协作平台，支持：

- 块级编辑器系统（文本、标题、列表、图片、代码块、引用等）
- 页面管理系统（树形结构、层级管理）
- 数据库功能（多视图、多字段类型）
- 用户认证系统
- 实时协作编辑
- 文件管理

## 技术栈

### 后端
- Python 3.11 + FastAPI
- SQLAlchemy + Pydantic
- MySQL 8.0
- Redis 7
- WebSocket（实时协作）

### 前端
- React 18 + TypeScript
- Vite 5
- TailwindCSS
- React Router 6
- Axios

### 部署
- Docker + docker-compose

## 快速开始

### 📖 详细启动指南

为了确保您能够顺利启动和配置Molink，我们提供了详细的启动指南：

**📋 [启动指南.md](./启动指南.md)** - 包含完整的启动步骤、故障排除和运维指南

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 🚀 快速启动 (Windows PowerShell)

1. **启动项目**
   ```powershell
   # 打开PowerShell并进入项目目录
   cd D:\WorkSpace\package\molink-local
   
   # 检查环境
   .\check-env.ps1
   
   # 启动所有服务
   .\start.ps1
   ```

2. **访问应用**
   - 前端界面: http://localhost
   - API文档: http://localhost:8000/api/docs
   - 健康检查: http://localhost:8000/health

> 📖 详细启动指南请参考：[启动指南.md](./启动指南.md)

### 默认账户

系统初始化时会创建一个管理员账户：
- 邮箱: `admin@molink.local`
- 密码: `admin123`

**请在首次登录后立即修改密码！**

## 项目结构

```
molink-local/
├── backend/                  # 后端项目
│   ├── app/                  # 应用代码
│   │   ├── api/             # API路由
│   │   ├── core/            # 核心配置
│   │   ├── models/          # 数据库模型
│   │   ├── schemas/         # Pydantic模式
│   │   ├── services/        # 业务逻辑
│   │   └── utils/           # 工具函数
│   ├── Dockerfile           # 后端容器配置
│   └── requirements.txt     # Python依赖
├── frontend/                 # 前端项目
│   ├── src/                 # 源代码
│   │   ├── api/             # API客户端
│   │   ├── components/      # React组件
│   │   ├── contexts/        # React上下文
│   │   ├── hooks/           # 自定义Hook
│   │   ├── lib/             # 工具库
│   │   ├── pages/           # 页面组件
│   │   └── types/           # TypeScript类型
│   ├── Dockerfile           # 前端容器配置
│   ├── nginx.conf           # Nginx配置
│   └── package.json         # 前端依赖
├── uploads/                  # 文件上传目录
├── docker-compose.yml        # Docker编排配置
├── init-db.sql              # 数据库初始化脚本
├── start.ps1                # 🚀 PowerShell启动脚本
├── check-env.ps1            # 🔧 环境检查脚本
├── 启动指南.md              # 📋 详细启动步骤指南
└── README.md                # 项目文档
```

## API 文档

### 认证相关

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/auth/register | 用户注册 |
| POST | /api/v1/auth/login | 用户登录 |
| POST | /api/v1/auth/logout | 用户登出 |
| GET | /api/v1/auth/me | 获取当前用户 |

### 页面管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/pages | 获取页面列表 |
| POST | /api/v1/pages | 创建页面 |
| GET | /api/v1/pages/{id} | 获取页面详情 |
| PUT | /api/v1/pages/{id} | 更新页面 |
| DELETE | /api/v1/pages/{id} | 删除页面 |

### 内容块

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/blocks | 获取页面块 |
| POST | /api/v1/blocks | 创建块 |
| PUT | /api/v1/blocks/{id} | 更新块 |
| DELETE | /api/v1/blocks/{id} | 删除块 |
| POST | /api/v1/blocks/reorder | 块排序 |

### 数据库

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/databases | 获取数据库列表 |
| POST | /api/v1/databases | 创建数据库 |
| GET | /api/v1/databases/{id} | 获取数据库详情 |
| GET | /api/v1/databases/{id}/fields | 获取字段 |
| GET | /api/v1/databases/{id}/records | 获取记录 |

### WebSocket

| 路径 | 描述 |
|------|------|
| /ws/editor/{page_id} | 编辑器实时协作 |
| /ws/user-status | 用户在线状态 |

## 开发指南

### 本地开发

1. **后端开发**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

2. **前端开发**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### 数据库迁移

项目使用 SQLAlchemy 自动创建表结构。如需修改表结构：

1. 修改 `backend/app/models/` 中的模型
2. 重启后端服务，表结构会自动更新

## 性能优化

- MySQL 连接池配置（20个连接）
- Redis 缓存支持
- Nginx Gzip 压缩
- 静态资源缓存（1年）
- WebSocket 心跳机制

## 安全建议

1. 生产环境必须修改 SECRET_KEY
2. 定期备份 MySQL 数据
3. 使用 HTTPS
4. 限制 CORS 来源
5. 定期更新依赖

## 故障排除

### 📚 详细故障排除指南

如果遇到启动或运行问题，请参考：
**[启动指南.md](./启动指南.md) - 故障排除章节** - 包含完整的常见问题解决方案

### 快速检查

```bash
# 查看所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 完整故障排除指南
# 请查看 启动指南.md
```

## 许可证

MIT License
