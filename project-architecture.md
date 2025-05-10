# ibuddy2 项目架构 - 系统分离计划

## 概述
本文档概述了ibuddy2项目从单体应用向微服务架构转型的计划。系统将被分解为多个独立部署、独立扩展的服务，并通过标准API和消息队列进行通信。

## 新架构组件

### 客户端应用 (client/)
- React前端应用
- 独立部署和扩展
- 通过API网关与后端服务通信

### API网关 (api-gateway/)
- 请求路由和转发
- 统一认证和授权
- 请求限流和监控
- 跨域资源共享(CORS)处理

### 后端服务

#### 核心服务 (core-service/)
- 用户管理和认证
- 基础业务逻辑
- 数据库访问层
- 会话管理

#### AI服务 (ai-service/)
- 意图识别
- 自动回复处理
- 上下文管理
- 模型集成和调用

#### 辅助服务 (支持后续开发)
- 分析服务
- 内容管理服务
- 通知服务

### 数据存储
- Supabase持久存储
- Redis缓存层
- 消息队列(预计使用RabbitMQ)

## 通信方式
- REST API (同步通信)
- 消息队列 (异步通信)
- WebSocket (实时通信)

## 文件结构概览
```
ibuddy2/
├── client/               # React前端应用
├── api-gateway/          # API网关服务
├── core-service/         # 核心业务服务
├── ai-service/           # AI和自动回复服务
├── shared/               # 共享代码和配置
├── docs/                 # 项目文档
└── tools/                # 开发和部署工具
```

## 第一阶段实施计划

1. 创建基础项目结构
2. 设置API网关
3. 分离核心服务和AI服务
4. 实现基本认证机制
5. 建立服务间通信
6. 更新客户端应用以使用新API

## 技术栈

- **前端**: React, Bootstrap, Axios
- **API网关**: Express, Passport
- **核心服务**: Express, Supabase
- **AI服务**: Express, Google Gemini API
- **消息队列**: RabbitMQ
- **缓存**: Redis
- **部署**: Docker, Docker Compose (开发环境) 