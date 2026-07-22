# AGENTS.md

> 本文件面向 AI 编码代理，介绍 Molink 项目的架构、构建方式与开发约定。项目文档与代码注释以中文为主。

## 项目概述

Molink 是一个类似 Notion 的现代化内容编辑与协作平台，主要功能包括：

- 块级富文本编辑器（基于 Slate 自研，支持 Markdown 快捷输入、斜杠命令菜单）
- 页面树形层级管理、封面 / 图标、回收站（软删除与恢复）
- 工作空间、用户认证（JWT + Google/GitHub OAuth）
- 数据库（多视图、多字段类型）、文件上传、WebSocket 实时协作

仓库为单仓多项目结构，**没有根级构建配置**，所有代码都在 `molink-app/` 下：

```
molink/                            # 仓库根（仅 README.md 与本文件）
└── molink-app/                    # 前端项目根（package.json 所在目录）
    ├── src/                       # React 前端源码
    ├── docs/                      # 项目文档（中文，注意：docs/ 已在 .gitignore 中，不提交）
    ├── public/                    # 静态资源
    ├── Dockerfile                 # 前端生产镜像（构建 → Nginx 托管）
    ├── nginx-sealos.conf          # 生产 Nginx 配置（SPA 回退 + 静态缓存）
    └── molink-backend/molink/     # 后端项目
        ├── docker-compose.yml     # MySQL 8 + Redis 7 + FastAPI 编排
        ├── init-db.sql            # MySQL 首次初始化脚本
        ├── start.ps1 / check-env.ps1 / diagnose-docker.ps1  # Windows 辅助脚本
        └── backend/               # FastAPI 源码（requirements.txt、Dockerfile）
```

## 技术栈

### 前端（`molink-app/`）

- React 19 + TypeScript（strict 模式）+ Vite 7，包管理器使用 **yarn**（存在 `yarn.lock`）
- 编辑器核心：**Slate**（`slate` / `slate-react` / `slate-dom`），主编辑器为 `src/Editor.tsx`
- 样式：Tailwind CSS v3 + PostCSS + shadcn 风格组件约定（`components.json`，new-york / neutral / lucide 图标）
- 其他依赖：axios（API 层）、motion（动画）、lucide-react。BlockNote/TipTap/Mantine/firebase/next-themes/react-icons/cobe 等死依赖已移除，不要顺手装回
- 注意：`package.json` 声明 `"type": "module"`，但 `tailwind.config.js` 使用 CommonJS `module.exports`，这是现状，不要"修复"它

### 后端（`molink-app/molink-backend/molink/backend/`）

- Python 3.13 + FastAPI + Uvicorn
- SQLAlchemy 2.0 + Pydantic v2 + PyMySQL
- MySQL 8.0（主库）+ Redis 7（缓存 / 协作会话，本地开发映射端口 **16379**）
- JWT 认证（python-jose + passlib/bcrypt）、OAuth（Google/GitHub，httpx）
- WebSocket 实时协作（`/ws/editor/{page_id}`、`/ws/user-status`）

## 构建与运行命令

### 前端（在 `molink-app/` 下执行）

```bash
yarn install        # 安装依赖
yarn dev            # 开发服务器，http://localhost:5173
yarn build          # 生产构建（tsc -b && vite build，先过类型检查）
yarn lint           # ESLint 检查（当前 0 errors / 6 warnings，保持 0 errors）
yarn preview        # 预览构建产物
```

开发服务器通过 Vite 代理连接后端：`/api`、`/uploads`、`/ws` → `http://localhost:8000`（见 `vite.config.ts`）。前端 API 基础地址由环境变量 `VITE_API_BASE_URL` 控制，默认 `/api/v1`。

### 后端（在 `molink-app/molink-backend/molink/` 下执行）

Docker 方式（推荐）：

```bash
docker compose up mysql redis backend --build   # 一键启动全部服务
```

compose 中的密码与密钥均为 `${VAR:-开发默认值}` 插值：本地零配置即可启动；生产在同目录创建 `.env`（参考 `.env.example`）覆盖真实值。MySQL/Redis 端口仅绑定 127.0.0.1（局域网访问需去掉绑定前缀），Redis 已启用密码（本地默认 `molink_redis_dev`，用 `REDIS_PASSWORD` 覆盖）。

手动方式：

```bash
docker compose up -d mysql redis                 # 先起数据库
cd backend
pip install -r requirements.txt                  # 建议在虚拟环境中
uvicorn app.main:app --reload --port 8000
```

启动后：API 文档 `http://localhost:8000/api/docs`，健康检查 `http://localhost:8000/health`。
默认管理员由后端启动时播种（`app/core/seed.py`）：设置环境变量 `ADMIN_PASSWORD`（可选 `ADMIN_EMAIL`，默认 `admin@molink.local`）且账号不存在时创建。本地开发 compose 已设 `ADMIN_PASSWORD=admin123`，即默认账户 `admin@molink.local` / `admin123`（生产环境务必修改或移除该变量）。`init-db.sql` 不再插入管理员。

### 后端更新要点（详见 `docs/backend-更新流程.md`）

- 开发模式下 `docker-compose.override.yml`（不提交，已 gitignore）将本地 `backend/app/` 以 volume 映射进容器并开启 `--reload`，**改 Python 代码无需 rebuild**
- 修改 `requirements.txt` 后**必须** `docker-compose build backend`
- 表结构变更：启动时只执行 `Base.metadata.create_all()`（建缺失的表）+ `app/core/migration.py` 的 `auto_migrate()`（加缺失的列）；复杂变更需手动 `ALTER TABLE`，并同步更新 `init-db.sql`

## 代码组织

### 前端 `molink-app/src/`

- `main.tsx` — 入口，挂载 `ThemeProvider` + `AuthProvider`
- `App.tsx` — 应用主组件：页面状态管理、前后端数据同步（Slate 内容 ↔ 后端 Block 转换）、未登录时降级到 localStorage（key：`molink-pages`）
- `Editor.tsx` + `BlockElement.tsx` + `Leaf.tsx` + `withMarkdownShortcuts.ts` — Slate 编辑器核心
- `Sidebar.tsx` — 页面树侧边栏
- `api/` — axios API 层（`client.ts` 为 axios 实例与拦截器；`auth/blocks/files/pages/workspaces.ts` 为资源模块）
- `components/` — UI 组件（`auth/` 登录、`ui/` 与 `magicui/` 动效组件、其余为功能组件）
- `context/` — `AuthContext`（JWT 存 localStorage 的 `access_token`）、`ThemeContext`
- `pages/` — `LandingPage.tsx`
- `lib/` — `utils.ts`（cn 等工具）、`firebase.ts`（**占位配置，当前未真正使用**）
- `assets/styles/` — 全局 CSS（Tailwind 入口 `index.css`）

### 后端 `backend/app/`

- `main.py` — FastAPI 入口：lifespan 中建表与自动迁移、CORS/Session 中间件、路由注册、静态目录 `/uploads`
- `api/v1/` — REST 路由：`auth`、`oauth`、`users`、`workspaces`、`pages`、`blocks`、`databases`、`files`、`admin`；统一前缀 `/api/v1`
- `api/websocket.py` — WebSocket 路由（前缀 `/ws`）
- `core/` — `config.py`（pydantic-settings，读环境变量 / `.env`）、`database.py`、`redis.py`、`security.py`、`migration.py`、`utils.py`（`utc_now()` 等通用辅助，DB 时间戳一律用 naive UTC）
- `models/` — SQLAlchemy 模型（user、workspace、page、block、database、file）
- `schemas/` — Pydantic 校验模型
- `services/` 与 `utils/` — **预留空目录**

## 代码风格与约定

- 注释、文档、提交说明使用**中文**；标识符使用英文
- TypeScript 开启 `strict`、`noUnusedLocals`、`noUnusedParameters`；路径别名 `@/*` → `./src/*`（`tsconfig.app.json` 与 `vite.config.ts` 均已配置）
- ESLint 9 flat config（`eslint.config.js`）：typescript-eslint recommended + react-hooks + react-refresh；提交前跑 `yarn lint`
- 前端组件约定：函数组件 + Hooks；样式用 Tailwind 原子类，颜色使用 `index.css` 中定义的 CSS 变量语义类（`bg-background`、`text-foreground`、`text-muted-foreground` 等），不要硬编码色值
- 前端 API 调用一律走 `src/api/` 下的模块，不要直接在组件里写 axios/fetch；错误处理沿用 `console.error('xxx失败:', err)` 的模式
- 后端约定：路由层（`api/v1/`）只做参数校验与调用，模型变更需同步 `models/`、`schemas/` 与 `migration.py`

## 测试

**项目当前没有任何测试基础设施**：前后端均无测试文件、无测试框架、package.json 无 test 脚本。验证改动的方式是：

- 前端：`yarn lint` + `yarn build` 确认可构建
- 后端：启动服务后通过 `http://localhost:8000/api/docs`（Swagger UI）手动验证接口

如要引入测试，需要自行搭建（前端可选 Vitest，后端可选 pytest），并在本文档中补充说明。

## 部署

- **前端**：`molink-app/Dockerfile` 多阶段构建（node:20-alpine 构建 → nginx:alpine 托管），构建参数 `VITE_API_BASE_URL`；Nginx 配置见 `nginx-sealos.conf`（SPA 路由回退 + 静态资源缓存 + `/api`、`/uploads`、`/ws` 反代到后端，后端服务名按 Sealos 实际调整）
- **后端**：`docker-compose.yml` 编排 MySQL 8 + Redis 7 + FastAPI（端口 8000），数据卷：`mysql_data`、`redis_data`、`uploads_data`；`requirements.txt` 已全部钉死 `==` 版本，改依赖后必须 `docker compose build backend`。后端镜像以非 root 用户 `app` 运行、单 worker（WebSocket 连接管理器是内存态，扩 worker 前需先接 Redis pub/sub）；旧版 root 容器创建的存量 `uploads_data` 卷需手动 `docker exec --user root molink-backend chown -R app:app /app/uploads` 一次
- 生产部署目标是 **Sealos 云平台**，完整流程见 `docs/sealos-deploy-guide.md`；运维与故障排查见 `docs/backend-启动指南.md`、`docs/backend-更新流程.md`
- `import-db.py`（Sealos 初始化数据库用）的连接信息一律从环境变量读取：`DB_HOST`、`DB_PASSWORD` 必填，`DB_PORT`（默认 3306）、`DB_USER`（默认 root）可选，切勿把密码写进代码
- 前后端构建目录均有 `.dockerignore`（排除 `node_modules`/`dist`/`venv`/`.env*` 等）；`molink-app/.env*` 不入库（`.gitignore` 覆盖，`.env.example` 例外）

## 安全注意事项

- **`SECRET_KEY` 无应用层默认值，必须由环境变量或 `.env` 提供**（`core/config.py`，缺失时启动直接报错）；`docker-compose.yml` 中的密码/密钥均为 `${VAR:-开发默认值}` 插值，默认值仅供本地开发——生产必须在 `.env` 中覆盖
- `.env`、`.env.*.local` 已 gitignore；后端通过 pydantic-settings 读取环境变量，敏感配置（OAuth 密钥、SECRET_KEY、数据库密码）一律走环境变量，不要写进代码
- JWT 存于 localStorage（`access_token`），axios 响应拦截器在 401 时清除 token 并派发 `molink:auth_expired` 事件
- logout 会把 token 写入 Redis 黑名单吊销（`core/redis.py`），禁用用户（`is_active=false`）所有通道一律 401；登录/注册接口有内存滑动窗口限流（`core/ratelimit.py`，429）
- 注册密码下限 8 位；文件上传限制 10MB，扩展名白名单见 `core/config.py` 的 `ALLOWED_EXTENSIONS`，图片经 PIL 真实内容校验；文件 URL 只存相对路径 `/uploads/<文件名>`（`/uploads` 目前仍为无鉴权静态目录，知 URL 即可下载，为 `<img>` 直引的既定取舍）
- 生产环境应收紧 `CORS_ORIGINS` 为实际前端域名
