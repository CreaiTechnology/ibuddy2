# iBuddy2 - 智能聊天助手微服务架构

iBuddy2 是一个基于微服务架构的智能聊天助手系统，支持多平台、多模型AI交互，具有上下文感知和意图识别能力。

## 架构概览

系统采用完全分离的微服务架构，包括：

```
ibuddy2/
├── client/               # React前端应用
├── api-gateway/          # API网关服务
├── core-service/         # 核心业务服务
├── ai-service/           # AI和自动回复服务
└── shared/               # 共享代码和配置
```

### 主要特性

- **前后端完全分离**：独立部署的React前端和Express后端
- **API网关**：统一的请求路由、认证和监控
- **多模型AI策略**：支持多个AI模型（Gemini 2.0、GPT等），根据需求智能选择
- **多级上下文存储**：短期内存、中期记忆和长期知识存储
- **意图映射网络**：基于关系图的意图识别和上下文感知推理
- **多模态响应**：支持丰富的响应格式（文本、图片、表格、按钮等）
- **跨平台支持**：Web、移动、WhatsApp、Telegram等平台的专用响应格式
- **消息队列集成**：使用RabbitMQ实现服务间异步通信

## 技术栈

- **前端**: React, Bootstrap, Axios
- **API网关**: Express, Passport
- **核心服务**: Express, Supabase
- **AI服务**: Express, Google Gemini API, OpenAI API
- **消息队列**: RabbitMQ
- **缓存**: Redis

## 服务详解

### AI服务 (ai-service)

AI服务是系统的核心组件，负责处理所有AI相关的功能：

- **多模型支持**：集成了Google Gemini 2.0 Flash Lite、OpenAI和OpenRouter模型
- **智能模型选择**：根据消息复杂度和类型选择最佳模型
- **意图识别**：基于自然语言处理的意图分析
- **上下文管理**：多级上下文存储和压缩
- **响应格式化**：根据平台自动格式化响应

#### 关键模块

- `aiService.js`: AI核心服务，负责模型调用和响应生成
- `contextService.js`: 上下文管理，提供多级记忆存储
- `intentService.js`: 意图识别和关系图管理
- `responseFormatterService.js`: 多平台响应格式化
- `messageQueue.js`: 消息队列集成，用于异步处理

### API网关 (api-gateway)

API网关是系统的入口点，负责：

- 路由请求到相应的微服务
- 处理认证和授权
- 请求限流和监控
- 跨域资源共享(CORS)处理

### 核心服务 (core-service)

核心服务处理业务逻辑和数据访问：

- 用户管理和认证
- 会话管理
- 数据库访问和持久化
- 业务规则实施

## 环境变量配置

各服务使用`.env`文件进行配置，主要包括：

### AI服务配置

```
# API密钥
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# 模型配置
ENABLE_MODEL_FALLBACK=true
DEFAULT_AI_MODEL=gemini-2.0-flash-lite
ENABLE_AUTO_MODEL_SELECTION=true

# 上下文配置
SHORT_TERM_WINDOW_SIZE=5
MID_TERM_WINDOW_SIZE=15
LONG_TERM_WINDOW_SIZE=50
ENABLE_CONTEXT_COMPRESSION=true

# 意图识别配置
INTENT_CONFIDENCE_THRESHOLD=0.7
INTENT_CONTEXT_BOOST=true

# 消息队列配置
ENABLE_MESSAGE_QUEUE=true
RABBITMQ_URL=amqp://localhost:5672
```

## 开发与部署

### 本地开发

1. 克隆代码库：
   ```
   git clone https://github.com/yourusername/ibuddy2.git
   cd ibuddy2
   ```

2. 安装依赖：
   ```
   cd ai-service && npm install
   cd ../api-gateway && npm install
   cd ../core-service && npm install
   cd ../client && npm install
   ```

3. 设置环境变量：
   为每个服务创建`.env`文件，基于`.env.example`模板

4. 启动各服务：
   ```
   # 终端1
   cd ai-service && npm run dev
   
   # 终端2
   cd api-gateway && npm run dev
   
   # 终端3
   cd core-service && npm run dev
   
   # 终端4
   cd client && npm start
   ```

### 生产部署

项目支持使用Docker容器部署，详见`docker-compose.yml`文件。

```
docker-compose up -d
```

## 后续开发计划

- [x] 集成Gemini 2.0 Flash Lite模型，提升性能
- [x] 添加A/B测试框架，支持模型比较
- [x] 实现模型性能分析服务
- [ ] 添加语义搜索功能
- [ ] 添加更多平台支持

## 最近更新

- **OpenRouter集成**：GPT-4o-mini模型现在通过OpenRouter调用，提高API可靠性和降低成本
- **Gemini模型升级**：系统已从Gemini 1.5 Flash更新到Gemini 2.0 Flash Lite，保持成本不变同时提升性能
- **A/B测试框架**：完成实验平台开发，支持AI模型比较和自动流量分配
- **性能分析**：添加模型性能统计服务，提供API接口查询使用情况

## A/B测试框架

新增A/B测试功能支持比较不同AI模型的效果，主要特点包括：

1. **用户自动分组**：基于用户ID将用户自动分配到测试组
2. **灵活配置**：可设置测试占比、测试周期、参与模型
3. **结果收集与分析**：自动收集响应时间和用户评分
4. **统计显著性**：提供测试结果的统计学分析

### 使用A/B测试

创建一个新测试：
```bash
curl -X POST http://localhost:3001/ab-test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gemini 2.0 vs GPT-4o Mini",
    "description": "测试不同模型的性能",
    "models": ["gemini-2.0-flash-lite", "gpt-4o-mini"],
    "trafficPercentage": 50
  }'
```

查询测试结果：
```bash
curl -X GET http://localhost:3001/ab-test/[test-id]/results
```

## 分析服务

新增分析服务用于统计模型性能和用量，功能包括：

1. **自动数据收集**：中间件自动记录每次API调用的性能数据
2. **模型用量统计**：追踪不同模型的使用频率和Token消耗
3. **性能对比**：提供不同模型的响应时间、成功率对比
4. **用户反馈分析**：收集用户评分数据，关联到具体模型

## 许可证

[MIT License](LICENSE) 