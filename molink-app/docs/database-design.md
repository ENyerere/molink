# Molink 数据库设计文档

> 本文档描述 Molink 项目实际使用的数据库结构。技术栈：MySQL 8.0 + SQLAlchemy (Python FastAPI)。

---

## 数据库选择

本项目使用 **MySQL 8.0** 作为关系型数据库，原因如下：

1. 成熟稳定的关系型数据库，支持复杂查询和外键约束
2. SQLAlchemy 2.0 提供完善的 ORM 支持和连接池管理
3. 数据一致性要求高（用户权限、父子页面嵌套等场景）
4. 所有实体使用 UUID (CHAR36) 作为主键，便于分布式扩展

---

## 数据库结构

### 1. users（用户表）

存储系统用户信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 登录邮箱 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 加密后的密码 |
| full_name | VARCHAR(100) | NULL | 用户昵称 |
| avatar_url | VARCHAR(500) | NULL | 头像地址 |
| settings | TEXT | NULL | JSON 格式存储用户个性化设置 |
| is_active | BOOLEAN | DEFAULT TRUE | 账户是否启用 |
| is_admin | BOOLEAN | DEFAULT FALSE | 是否管理员 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | AUTO UPDATE | 更新时间 |

**索引**：`email` 上有唯一索引。

---

### 2. workspaces（工作空间表）

用户的顶层内容容器，类似 Notion 的 Sidebar 根节点。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| name | VARCHAR(255) | NOT NULL | 工作空间名称 |
| owner_id | CHAR(36) | FOREIGN KEY → users.id | 所有者 |
| icon | VARCHAR(100) | NULL | 图标 |
| settings | TEXT | NULL | JSON 格式存储工作空间设置 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | AUTO UPDATE | 更新时间 |

**级联行为**：删除用户时，级联删除其拥有的工作空间。

---

### 3. pages（页面表）

存储页面基本信息，支持**自引用父子嵌套**（树形结构）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| workspace_id | CHAR(36) | FOREIGN KEY → workspaces.id | 所属工作空间 |
| parent_id | CHAR(36) | FOREIGN KEY → pages.id, NULLABLE | 父页面 ID |
| title | VARCHAR(500) | NOT NULL, DEFAULT '无标题' | 页面标题 |
| page_type | ENUM | DEFAULT 'page' | `page` 或 `database` |
| icon | VARCHAR(100) | NULL | 图标 |
| cover_image | VARCHAR(500) | NULL | 封面图地址 |
| is_favorite | BOOLEAN | DEFAULT FALSE | 是否收藏 |
| is_archived | BOOLEAN | DEFAULT FALSE | 是否归档 |
| position | INT | DEFAULT 0 | 同层级排序位置 |
| created_by | CHAR(36) | FOREIGN KEY → users.id, NULLABLE | 创建者 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | AUTO UPDATE | 更新时间 |

**索引**：`workspace_id`、`parent_id` 上有普通索引。

**级联行为**：
- 删除工作空间 → 级联删除所有页面
- 删除父页面 → 级联删除所有子页面

---

### 4. blocks（内容块表）

页面的最小内容单元，支持**自引用父子嵌套**（块内嵌套）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| page_id | CHAR(36) | FOREIGN KEY → pages.id | 所属页面 |
| parent_block_id | CHAR(36) | FOREIGN KEY → blocks.id, NULLABLE | 父块 ID |
| block_type | ENUM | DEFAULT 'text' | 块类型，见下方枚举 |
| content | TEXT | NULL | JSON 格式存储块的具体内容 |
| position | INT | DEFAULT 0 | 同页面内排序位置 |
| metadata | TEXT | NULL | JSON 格式存储额外元数据 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | AUTO UPDATE | 更新时间 |

**block_type 枚举值**：
- `text` — 普通文本
- `h1` ~ `h6` — 标题
- `ul` — 无序列表
- `ol` — 有序列表
- `image` — 图片
- `code` — 代码块
- `quote` — 引用块
- `table` — 表格

**级联行为**：删除页面 → 级联删除所有块。

---

### 5. databases（数据库表）

类似 Notion Database 的数据表定义。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| workspace_id | CHAR(36) | FOREIGN KEY → workspaces.id | 所属工作空间 |
| page_id | CHAR(36) | FOREIGN KEY → pages.id, NULLABLE | 关联页面（可选） |
| name | VARCHAR(255) | NOT NULL | 数据库名称 |
| icon | VARCHAR(100) | NULL | 图标 |
| description | TEXT | NULL | 描述 |
| default_view | ENUM | DEFAULT 'table' | `table` / `board` / `calendar` |
| created_by | CHAR(36) | FOREIGN KEY → users.id, NULLABLE | 创建者 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | AUTO UPDATE | 更新时间 |

---

### 6. database_fields（数据库字段表）

定义数据库的列结构（字段）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| database_id | CHAR(36) | FOREIGN KEY → databases.id | 所属数据库 |
| name | VARCHAR(255) | NOT NULL | 字段名称 |
| field_type | ENUM | DEFAULT 'text' | 字段类型，见下方枚举 |
| field_config | TEXT | NULL | JSON 格式存储字段配置（如下拉选项） |
| position | INT | DEFAULT 0 | 排序位置 |
| is_visible | BOOLEAN | DEFAULT TRUE | 是否显示 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | AUTO UPDATE | 更新时间 |

**field_type 枚举值**：
- `text`、`number`、`date`
- `select`、`multiselect`
- `checkbox`、`url`、`email`、`file`

---

### 7. database_records（数据库记录表）

数据库中的每一行数据。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| database_id | CHAR(36) | FOREIGN KEY → databases.id | 所属数据库 |
| properties | TEXT | NULL | JSON 格式存储整行数据（键值对） |
| position | INT | DEFAULT 0 | 排序位置 |
| created_by | CHAR(36) | FOREIGN KEY → users.id, NULLABLE | 创建者 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | AUTO UPDATE | 更新时间 |

> `properties` 采用 JSON 存储，实现了类似 NoSQL 的灵活结构，同时保留关系型数据库的事务能力。

---

### 8. files（文件表）

存储用户上传的文件元数据。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| name | VARCHAR(255) | NOT NULL | 存储文件名（UUID 重命名） |
| original_name | VARCHAR(255) | NOT NULL | 原始上传文件名 |
| url | VARCHAR(500) | NOT NULL | 访问地址 |
| file_type | VARCHAR(50) | NULL | 扩展名 |
| mime_type | VARCHAR(100) | NULL | MIME 类型 |
| size | BIGINT | NULL | 文件大小（字节） |
| user_id | CHAR(36) | FOREIGN KEY → users.id | 上传者 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 9. collaboration_sessions（协作会话表）

记录用户在页面上的实时协作状态。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | CHAR(36) | PRIMARY KEY | UUID |
| page_id | CHAR(36) | FOREIGN KEY → pages.id | 所属页面 |
| user_id | CHAR(36) | FOREIGN KEY → users.id | 用户 |
| cursor_position | TEXT | NULL | JSON 格式存储光标位置 |
| status | ENUM | DEFAULT 'active' | `active` / `idle` / `disconnected` |
| updated_at | DATETIME | AUTO UPDATE | 最后更新时间 |

---

## ER 关系图（文字版）

```
users (1) ──────< (N) workspaces
   │                    │
   │                    │
   │                    ▼
   │                pages (N) ──────< (N) blocks
   │                    │
   │                    │
   │                    ▼
   │                databases (N) ──< (N) database_fields
   │                    │             (N) database_records
   │                    │
   ▼                    ▼
files (N)       collaboration_sessions (N)
```

关系说明：
- `───<` 表示一对多关系（左边是 1，右边是 N）
- `pages` 和 `blocks` 均支持**自引用**（parent_id / parent_block_id），形成树形结构

---

## 索引设计

```sql
-- 用户邮箱查询（登录用）
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 页面按工作空间查询
CREATE INDEX idx_pages_workspace ON pages(workspace_id);

-- 子页面查询
CREATE INDEX idx_pages_parent ON pages(parent_id);

-- 块按页面查询
CREATE INDEX idx_blocks_page ON blocks(page_id);

-- 数据库按工作空间查询
CREATE INDEX idx_databases_workspace ON databases(workspace_id);

-- 字段/记录按数据库查询
CREATE INDEX idx_fields_database ON database_fields(database_id);
CREATE INDEX idx_records_database ON database_records(database_id);

-- 文件按用户查询
CREATE INDEX idx_files_user ON files(user_id);
```

---

## 后端实现说明

1. **ORM**：使用 SQLAlchemy 2.0 声明式模型（Declarative Base）
2. **主键策略**：全部使用 Python `uuid.uuid4()` 生成 36 位字符串主键
3. **JSON 字段**：MySQL `TEXT` 类型存储 JSON 字符串，由 Pydantic 负责序列化/反序列化
4. **连接池**：SQLAlchemy 配置了 20 个连接池 + 30 个溢出连接
5. **表创建**：由 FastAPI 生命周期事件调用 `Base.metadata.create_all()` 自动创建（开发环境）

---

## 部署注意事项

1. **字符集**：必须设置为 `utf8mb4`，以支持中文和 Emoji
2. **时区**：建议使用 UTC 时间存储，由应用层处理时区转换
3. **备份**：定期备份 `users`、`pages`、`blocks` 三张核心表
4. **扩展**：`blocks.content` 和 `database_records.properties` 使用 JSON 存储，未来如需迁移到文档型数据库，数据结构兼容性好
