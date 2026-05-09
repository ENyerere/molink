# Molink 后端启动指南

> 本文档面向开发者 / 运维人员，说明如何通过 Docker 启动 Molink 后端服务。

---

## 🚀 快速启动

### 前置要求

- **Docker Desktop** 20.10+
- **Docker Compose** 2.0+（已内置于 Docker Desktop）
- **PowerShell** 5.1+（Windows）

检查安装：
```powershell
docker --version
docker compose version
```

---

## 📋 详细启动步骤

### 1. 进入后端目录

```powershell
cd molink-backend/molink
```

确保以下文件存在：
```
molink-backend/molink/
├── docker-compose.yml        # Docker 编排配置 ✅
├── docker-compose.override.yml  # 开发热重载配置（可选）
├── init-db.sql              # 数据库初始化脚本 ✅
├── start.ps1                # 快速启动脚本 ✅
├── check-env.ps1            # 环境检查脚本 ✅
├── diagnose-docker.ps1      # Docker 诊断脚本 ✅
└── backend/                 # 后端源代码 ✅
    ├── app/
    ├── Dockerfile
    └── requirements.txt
```

### 2. 启动服务

#### 方式一：PowerShell 脚本（推荐）

```powershell
# 检查环境（可选）
.\check-env.ps1

# 启动 MySQL + Redis + 后端
.\start.ps1
```

> 如果提示权限不足，先执行：`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

#### 方式二：手动命令

```powershell
# 进入目录
cd molink-backend/molink

# 启动三大服务（首次需要 --build）
docker compose up mysql redis backend --build

# 后台运行（不占用终端）
docker compose up mysql redis backend -d
```

### 3. 验证服务启动

等待 30~60 秒让服务完全启动。

```powershell
# 查看容器状态
docker compose ps
```

应该看到以下容器都处于 `Up (healthy)` 状态：
- `molink-mysql` — MySQL 数据库
- `molink-redis` — Redis 缓存
- `molink-backend` — FastAPI 后端

#### 健康检查

```powershell
# 检查后端 API
Invoke-RestMethod -Uri http://localhost:8000/health

# 预期输出: @{status=healthy}
```

### 4. 首次访问

- **API 文档**：http://localhost:8000/api/docs
- **健康检查**：http://localhost:8000/health

#### 默认管理员账户

- 邮箱：`admin@molink.local`
- 密码：`admin123`

> ⚠️ 首次登录后请立即修改默认密码！

---

## 🔧 常用运维命令

### 启动 / 停止 / 重启

```powershell
# 启动（后台模式）
docker compose up -d

# 停止所有服务
docker compose down

# 重启后端
docker compose restart backend

# 重启所有
docker compose restart
```

### 查看日志

```powershell
# 查看所有服务日志
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 只看数据库日志
docker compose logs -f mysql
```

### 进入容器内部

```powershell
# 进入后端容器（检查文件、调试）
docker exec -it molink-backend bash

# 进入 MySQL 容器执行 SQL
docker exec -it molink-mysql mysql -uroot -proot_password molink_db
```

### 清理和重建

```powershell
# 停止并删除容器（保留数据卷）
docker compose down

# 停止并删除容器 + 删除数据（⚠️ 数据清空！）
docker compose down -v

# 完全重建后端镜像
docker compose up mysql redis backend --build --force-recreate

# 清理 Docker 缓存（释放磁盘）
docker system prune -f
```

---

## 🚨 故障排除

### 问题 1：端口被占用

**症状**：启动时报错 `bind: address already in use`

**常见原因**：
- 3306 端口：本地已安装 MySQL（如 XAMPP、WAMP）
- 8000 端口：其他程序占用了

**解决方案**：
```powershell
# 检查端口占用
netstat -ano | findstr :3306
netstat -ano | findstr :8000

# 关闭占用端口的程序，或修改 docker-compose.yml 中的端口映射
```

### 问题 2：后端容器启动后立刻退出

**症状**：`molink-backend` 状态为 `Exited`

**排查步骤**：
```powershell
# 查看错误日志
docker compose logs backend

# 常见原因：
# 1. MySQL 还没准备好，后端连接失败 → 等几秒后 docker compose restart backend
# 2. 端口冲突 → 见问题 1
# 3. 依赖安装失败 → docker compose up mysql redis backend --build --no-cache
```

### 问题 3：数据库连接失败

**症状**：后端日志显示 `Can't connect to MySQL server`

**解决方案**：
```powershell
# 检查 MySQL 容器状态
docker compose ps mysql

# 手动重启 MySQL
docker compose restart mysql

# 等待 30 秒后重启后端
docker compose restart backend
```

### 问题 4：API 调用失败（401 Unauthorized）

**症状**：前端登录/注册失败，或 Swagger 测试受保护接口时报 401

**解决方案**：
```powershell
# 检查后端是否正常运行
Invoke-RestMethod -Uri http://localhost:8000/health

# 测试登录接口
$body = @{email="admin@molink.local"; password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/v1/auth/login -Method POST -ContentType "application/json" -Body $body
```

### 问题 5：Docker 未启动或无权限

**症状**：执行任何 docker 命令都报错

**解决方案**：
1. 确认 Docker Desktop 已启动（右下角鲸鱼图标）
2. 以管理员身份运行 PowerShell
3. 检查 Docker 状态：`docker info`

---

## 📊 生产环境建议

1. **修改默认密码和密钥**
   - `MYSQL_ROOT_PASSWORD`
   - `MYSQL_PASSWORD`
   - `SECRET_KEY`

2. **配置 HTTPS**
   - 生产环境禁止 HTTP 明文传输
   - 使用 Nginx 反向代理 + SSL 证书

3. **数据备份**
   - MySQL 数据卷定期备份
   - `uploads/` 目录定期备份

4. **资源限制**
   ```yaml
   # 在 docker-compose.yml 中添加
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 512M
             cpus: '1.0'
   ```

---

## 📞 相关文档

- **[backend-README.md](./backend-README.md)** — 后端架构与 API 概览
- **[backend-本地开发启动指南.md](./backend-本地开发启动指南.md)** — 本地非 Docker 开发方式
- **[database-design.md](./database-design.md)** — 数据库表结构设计
