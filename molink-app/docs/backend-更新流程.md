# Molink 后端 / 数据库 / Redis 更新流程指南

> **核心原则**：保护好数据库中的现有数据，除非明确要重置。

---

## 一、环境架构

```
molink-backend/molink/
├── docker-compose.yml          # 生产/基础配置
├── docker-compose.override.yml # 开发模式覆盖（自动加载）
├── init-db.sql                 # MySQL 首次启动初始化脚本
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/                    # 源代码（开发时通过 volume 映射进容器）
│       ├── main.py             # 入口 + 自动迁移
│       ├── api/
│       ├── models/
│       └── schemas/
```

**关键理解**：
- `docker-compose.override.yml` 会在运行 `docker-compose up` 时**自动叠加**到 `docker-compose.yml` 上
- 开发模式下，本地 `backend/app/` 代码通过 volume 实时映射进容器，**无需 rebuild**
- 但 **Python 依赖**（`requirements.txt`）是在镜像构建时安装的，修改后必须 `docker-compose build`

---

## 二、三种常见更新场景

### 场景 A：只修改后端 Python 代码（如 API 逻辑、模型、迁移脚本）

**不需要重建镜像**，因为 `override.yml` 已经把本地代码映射进去了。

```bash
cd molink-backend/molink

# 确保容器是用 docker-compose 启动的（这样 override 才生效）
docker-compose up -d

# 修改代码后，--reload 会自动重启后端服务
# 查看日志确认自动迁移等逻辑已执行
docker logs molink-backend -f | findstr MIGRATION
```

> ⚠️ 如果你之前是用 `docker run` 或其他方式启动的容器，`override.yml` 不会生效，需要：
> ```bash
> docker-compose down
> docker-compose up -d
> ```

---

### 场景 B：新增/修改 Python 依赖（`requirements.txt`）

**必须重建镜像**，因为依赖是在构建时 `pip install` 的。

```bash
cd molink-backend/molink

# 1. 修改 requirements.txt
# 2. 重建后端镜像
docker-compose build backend

# 3. 重启容器
docker-compose up -d backend
```

---

### 场景 C：修改数据库表结构（新增字段 / 修改字段类型）

**目标**：在**不丢失现有数据**的前提下更新表结构。

#### 方式 1：自动迁移（推荐，适合新增字段）

在 `main.py` 的 `lifespan` 中添加自动迁移逻辑（已有示例）：

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    # 自动迁移示例：新增 deleted_at 字段
    try:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('pages')]
        if 'deleted_at' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE pages ADD COLUMN deleted_at DATETIME NULL"))
                conn.commit()
            print("[MIGRATION] Added deleted_at column")
    except Exception as e:
        print(f"[MIGRATION] Failed: {e}")
    
    yield
    await close_redis()
```

然后：
```bash
# 如果是代码修改，容器会自动重载（因为 --reload）
# 如果加了新依赖，先 build
docker-compose build backend
docker-compose up -d backend

# 查看日志确认迁移成功
docker logs molink-backend -f | findstr MIGRATION
```

#### 方式 2：手动 ALTER TABLE（最稳妥，适合紧急修复）

直接连进数据库执行 SQL：

```sql
-- 新增字段
ALTER TABLE pages ADD COLUMN deleted_at DATETIME NULL;

-- 修改字段类型
ALTER TABLE pages MODIFY COLUMN title VARCHAR(500) NOT NULL DEFAULT '无标题';

-- 添加索引
ALTER TABLE pages ADD INDEX idx_pages_deleted_at (deleted_at);
```

> ⚠️ **注意**：`init-db.sql` 里的 `CREATE TABLE` 语句只在 **MySQL 首次启动且数据卷为空** 时执行。已有数据的表不会被 `init-db.sql` 修改。

#### 方式 3：同时更新 `init-db.sql`（防止新环境缺失字段）

修改 `init-db.sql` 中的 `CREATE TABLE` 语句，**同时**执行手动 ALTER TABLE：

```sql
-- init-db.sql 中修改（供新环境使用）
CREATE TABLE IF NOT EXISTS pages (
    ...
    deleted_at DATETIME NULL,  -- 新增
    ...
);
```

```bash
# 当前环境执行手动迁移
# mysql -u molink -p molink_db
# ALTER TABLE pages ADD COLUMN deleted_at DATETIME NULL;
```

---

## 三、重置数据库（⚠️ 会清空所有数据）

只有当你**明确要清空数据**时才执行：

```bash
cd molink-backend/molink

# 1. 停止所有服务
docker-compose down

# 2. 删除 MySQL 数据卷（⚠️ 不可逆）
docker volume rm molink_mysql_data

# 3. 重新启动（会执行新的 init-db.sql）
docker-compose up -d
```

---

## 四、完整重启所有服务（不丢数据）

```bash
cd molink-backend/molink

# 停止所有服务
docker-compose down

# 重新启动（MySQL/Redis 数据卷会保留）
docker-compose up -d

# 查看所有服务状态
docker-compose ps
```

---

## 五、排错 checklist

| 现象 | 排查方向 |
|------|---------|
| 后端容器不断重启 | `docker logs molink-backend`，查看 Python 报错（如缺失依赖） |
| 代码修改没生效 | 确认是用 `docker-compose up` 启动的；查看 `docker inspect molink-backend` 的 Binds |
| 数据库字段缺失 | `docker logs molink-backend \| findstr MIGRATION`；或手动连数据库查看表结构 |
| 前端 API 404 | 确认后端路由已注册；查看 `http://localhost:8000/api/docs` |
| Redis 连接失败 | `docker logs molink-redis`；检查 `REDIS_HOST` 环境变量是否为 `redis` |

---

## 六、依赖关系图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   backend   │────→│    mysql    │     │    redis    │
│  (FastAPI)  │     │   (数据卷)   │     │   (数据卷)   │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑
       │ 开发模式：./backend/app:/app/app (volume 映射)
       │ 依赖安装：requirements.txt → docker-compose build
       └
   本地代码修改
```

---

## 七、快速命令速查

```bash
# 查看日志
docker logs molink-backend -f
docker logs molink-mysql -f
docker logs molink-redis -f

# 进入容器调试
docker exec -it molink-backend bash
docker exec -it molink-mysql mysql -u molink -p molink_db

# 查看表结构
docker exec molink-mysql mysql -u molink -p molink_db -e "DESCRIBE pages;"

# 重启单个服务
docker-compose restart backend
docker-compose restart mysql
docker-compose restart redis

# 查看服务状态
docker-compose ps
```
