# Molink

自托管的块编辑器学习原型，**不再积极维护**。可以写页面、排页面树、上传文件、登录。它不是多视图数据库，也没有多人实时协作。

## 实际有的

- 基于 Slate 的块编辑器（Markdown 快捷输入、斜杠命令）
- 页面树、封面、图标、回收站
- 工作空间、JWT 登录，以及可选的 Google / GitHub OAuth
- 文件上传
- 页内简单表格（写在页面内容里，只有一张表）

未登录时，页面落在浏览器 `localStorage`（键名 `molink-pages`）。

## 没有的

- **多视图数据库**（看板、日历）没有产品界面。
- **多人实时协作**没有接入。前端不会连接 WebSocket。

这两项的后端代码还在，见下方「未接入的后端表面」。不要为它们补前端客户端。

## 代码在哪

仓库根没有构建配置。代码都在 `molink-app/`：

- `molink-app/src/` — React 前端。编辑器从 `Editor.tsx`、`BlockElement.tsx` 看起。
- `molink-app/molink-backend/molink/backend/` — FastAPI。入口是 `app/main.py`。
- `molink-app/molink-backend/molink/docker-compose.yml` — MySQL 8、Redis 7、后端。

给代理看的结构说明在 `AGENTS.md`。

## 本地预览

比较重：需要 Docker 里的 MySQL 和 Redis，再加上前端开发服务器。

```bash
# 后端（在 molink-app/molink-backend/molink/）
docker compose up mysql redis backend --build

# 前端（在 molink-app/）
yarn install
yarn dev
```

前端默认 <http://localhost:5173>，API 文档 <http://localhost:8000/api/docs>。
Compose 里的本地管理员是 `admin@molink.local` / `admin123`，只适合本机。

## 未接入的后端表面

保留是为了不拆已经互相引用的模型和启动建表，不是已交付功能：

- `app/api/v1/databases.py` 与 `app/models/database.py`：多视图数据库 API，前端无客户端。
- `app/api/websocket.py`：`/ws/editor/{page_id}`、`/ws/user-status`，前端无连接。

## 许可证

[MIT](LICENSE)
