/**
 * Customer Service for ibuddy2 microservices
 * 处理客户关系管理、客户数据和交互历史
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const mongoose = require('mongoose');

// 导入路由
const healthRoutes = require('./routes/health');
const customerRoutes = require('./routes/customers');
const tagRoutes = require('./routes/tags');
const interactionRoutes = require('./routes/interactions');
const segmentRoutes = require('./routes/segments');

// 导入中间件
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// 导入服务
const messageQueue = require('./services/messageQueue');
const cacheService = require('./services/cacheService');

// 设置winston日志器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'customer-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// 初始化MongoDB连接（用于复杂的客户数据）
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    logger.info('MongoDB数据库连接成功');
  })
  .catch((err) => {
    logger.error('MongoDB数据库连接失败', { error: err.message });
  });
  
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB连接错误', { error: err.message });
  });
}

// 设置Express应用
const app = express();
const PORT = process.env.PORT || 3003;

// 为每个请求添加请求ID以便跟踪
app.use((req, res, next) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  next();
});

// 添加日志器到请求
app.use((req, res, next) => {
  req.logger = logger.child({ requestId: req.id });
  next();
});

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// 根据配置初始化服务
if (process.env.ENABLE_REDIS_CACHE === 'true') {
  cacheService.initialize()
    .then(() => logger.info('Redis缓存已初始化'))
    .catch(err => logger.error('Redis缓存初始化失败', { error: err.message }));
}

if (process.env.ENABLE_MESSAGE_QUEUE === 'true') {
  messageQueue.initialize()
    .then(() => {
      logger.info('消息队列已初始化');
      
      // 设置消息消费者，处理来自其他服务的事件
      messageQueue.consumeMessages('core.user.updated', async (msg) => {
        try {
          const data = JSON.parse(msg.content.toString());
          logger.info('收到用户更新事件', { userId: data.id });
          
          // 在这里处理用户更新逻辑，例如更新相关的客户记录
          
          // 确认消息
          messageQueue.channel.ack(msg);
        } catch (error) {
          logger.error('处理用户更新事件出错', { error: error.message });
          // 拒绝消息
          messageQueue.channel.nack(msg, false, false);
        }
      });
    })
    .catch(err => logger.error('消息队列初始化失败', { error: err.message }));
}

// 路由
app.use('/health', healthRoutes);
app.use('/customers', authMiddleware, customerRoutes);
app.use('/tags', authMiddleware, tagRoutes);
app.use('/interactions', authMiddleware, interactionRoutes);
app.use('/segments', authMiddleware, segmentRoutes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`客户服务运行在端口 ${PORT}`);
  console.log(`客户服务运行在端口 ${PORT}`);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason, promise });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error });
  process.exit(1);
});

module.exports = app; 