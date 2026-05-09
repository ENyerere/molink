# Molink 数据库设计文档

## 数据库选择

我们选择使用 MongoDB 作为数据库解决方案，原因如下：

1. 文档型数据库，灵活的 Schema 设计
2. 强大的查询能力和聚合管道
3. MongoDB Atlas 提供全球部署选项
4. 良好的扩展性和性能
5. 完善的 Node.js 驱动支持
6. 提供免费的云托管方案

## 数据库结构

### 集合：users
存储用户信息

```typescript
interface User {
  _id: ObjectId;           // MongoDB 自动生成的唯一ID
  name: string;            // 用户名称
  email: string;           // 邮箱地址
  hashedPassword: string;  // 加密后的密码
  avatar?: string;         // 头像URL
  createdAt: Date;         // 创建时间
  updatedAt: Date;         // 更新时间
}
```

### 集合：pages
存储用户创建的页面

```typescript
interface Page {
  _id: ObjectId;           // MongoDB 自动生成的唯一ID
  userId: ObjectId;        // 所属用户ID（关联 users 集合）
  title: string;           // 页面标题
  content: string;         // 页面内容（Markdown格式）
  cover?: string;          // 封面图片URL
  isPublic: boolean;       // 是否公开
  createdAt: Date;         // 创建时间
  updatedAt: Date;         // 更新时间
  lastEditedBy: ObjectId;  // 最后编辑者ID（关联 users 集合）
  tags: string[];          // 标签
}
```

### 集合：shares
存储页面的分享记录

```typescript
interface Share {
  _id: ObjectId;           // MongoDB 自动生成的唯一ID
  pageId: ObjectId;        // 页面ID（关联 pages 集合）
  userId: ObjectId;        // 分享者ID（关联 users 集合）
  type: 'read' | 'edit';   // 分享类型：只读/可编辑
  targetEmail?: string;    // 特定分享对象的邮箱（可选）
  accessCode?: string;     // 访问码（可选）
  expiresAt?: Date;        // 过期时间（可选）
  createdAt: Date;         // 创建时间
}
```

## 索引设计

```javascript
// users 集合索引
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });

// pages 集合索引
db.pages.createIndex({ "userId": 1, "updatedAt": -1 });
db.pages.createIndex({ "isPublic": 1, "updatedAt": -1 });
db.pages.createIndex({ "tags": 1 });

// shares 集合索引
db.shares.createIndex({ "pageId": 1, "createdAt": -1 });
db.shares.createIndex({ "targetEmail": 1 });
db.shares.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 }); // TTL 索引，自动删除过期的分享
```

## API 设计

### 用户相关 API

```typescript
// 用户注册
POST /api/auth/register
{
  name: string;
  email: string;
  password: string;
}

// 用户登录
POST /api/auth/login
{
  email: string;
  password: string;
}

// 获取用户信息
GET /api/users/me

// 更新用户信息
PATCH /api/users/me
{
  name?: string;
  avatar?: string;
}
```

### 页面相关 API

```typescript
// 创建页面
POST /api/pages
{
  title: string;
  content: string;
  isPublic?: boolean;
  tags?: string[];
}

// 获取页面列表
GET /api/pages?limit=10&offset=0

// 获取单个页面
GET /api/pages/:id

// 更新页面
PATCH /api/pages/:id
{
  title?: string;
  content?: string;
  isPublic?: boolean;
  tags?: string[];
}

// 删除页面
DELETE /api/pages/:id
```

### 分享相关 API

```typescript
// 创建分享
POST /api/shares
{
  pageId: string;
  type: 'read' | 'edit';
  targetEmail?: string;
  accessCode?: string;
  expiresAt?: Date;
}

// 获取页面的分享列表
GET /api/pages/:id/shares

// 删除分享
DELETE /api/shares/:id
```

## 后端实现建议

1. 技术栈选择：
   - Next.js API 路由 或 Express.js 作为后端框架
   - MongoDB Node.js Driver 或 Mongoose ODM
   - JWT 做身份认证
   - bcryptjs 做密码加密
   - zod 做数据验证

2. 文件夹结构：
```
backend/
  ├── models/           # MongoDB 模型定义
  ├── controllers/      # 业务逻辑控制器
  ├── middlewares/      # 中间件（认证、错误处理等）
  ├── routes/           # API 路由定义
  ├── services/         # 业务服务层
  ├── utils/           # 工具函数
  └── config/          # 配置文件
```

## 部署注意事项

1. MongoDB Atlas 配置：
   - 选择合适的地区（如香港或东京）
   - 配置网络访问白名单
   - 使用强密码和连接字符串
   - 启用数据库审计日志

2. 安全性考虑：
   - 所有密码必须加密存储
   - 使用环境变量存储敏感信息
   - 实现请求速率限制
   - 设置 CORS 策略
   - 使用 HTTPS

3. 性能优化：
   - 适当使用索引
   - 实现数据分页
   - 控制响应数据大小
   - 使用缓存策略
   - 监控数据库性能

## 开发步骤

1. 数据库设置：
   - 创建 MongoDB Atlas 账户
   - 创建新集群
   - 配置数据库用户和网络访问
   - 获取连接字符串

2. 后端搭建：
   - 初始化 Node.js 项目
   - 安装必要依赖
   - 配置 MongoDB 连接
   - 实现用户认证
   - 开发 API 端点

3. 前端集成：
   - 创建 API 客户端
   - 实现状态管理
   - 开发用户界面
   - 处理错误情况

## 监控和维护

1. 性能监控：
   - 使用 MongoDB Atlas 监控工具
   - 监控 API 响应时间
   - 跟踪错误率

2. 备份策略：
   - 启用 MongoDB Atlas 自动备份
   - 定期导出重要数据
   - 制定数据恢复计划

3. 扩展性准备：
   - 监控数据增长
   - 评估性能瓶颈
   - 制定扩展策略
