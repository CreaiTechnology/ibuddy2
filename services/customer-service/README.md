# 客户服务微服务 (Customer Service)

这个微服务是iBuddy系统的一部分，负责管理客户数据和相关操作。

## 功能特性

- 客户管理（创建、读取、更新、删除）
- 客户标签管理
- 客户互动记录
- 客户搜索和过滤
- 缓存机制提高性能
- 消息队列集成

## 技术栈

- Node.js
- Express.js
- Supabase (PostgreSQL)
- Redis (缓存)
- RabbitMQ (消息队列)
- JWT (认证)

## 安装指南

1. 克隆仓库
2. 安装依赖
```
cd services/customer-service
npm install
```

3. 设置环境变量
```
cp .env.example .env
```
编辑 `.env` 文件并填入必要的配置信息。

## 配置

主要配置选项在 `src/config.js` 中定义，可以通过环境变量设置覆盖:

- `PORT` - 服务端口号 (默认: 3001)
- `NODE_ENV` - 环境 (development, test, production)
- `JWT_SECRET` - JWT签名密钥
- `SUPABASE_URL` - Supabase URL
- `SUPABASE_KEY` - Supabase API密钥
- `REDIS_URL` - Redis连接URL
- `RABBITMQ_URL` - RabbitMQ连接URL

## 运行服务

### 开发环境
```
npm run dev
```

### 生产环境
```
npm start
```

### Docker
```
npm run docker:build
docker run -p 3001:3001 ibuddy/customer-service
```

## API 端点

### 客户管理
- `GET /api/customers` - 获取所有客户
- `GET /api/customers/:id` - 获取单个客户
- `POST /api/customers` - 创建新客户
- `PUT /api/customers/:id` - 更新客户
- `DELETE /api/customers/:id` - 删除客户

### 客户标签
- `GET /api/customers/tag/:tagId` - 获取带有特定标签的客户

### 客户搜索
- `GET /api/customers/search/query` - 搜索客户

### 客户统计
- `GET /api/customers/stats/summary` - 获取客户统计信息

### 健康检查
- `GET /api/health` - 基本健康检查
- `GET /api/health/detailed` - 详细健康状态
- `GET /api/health/db` - 数据库健康状态
- `GET /api/health/cache` - 缓存健康状态
- `GET /api/health/mq` - 消息队列健康状态

## 测试

```
npm test
```

## 许可证

ISC 