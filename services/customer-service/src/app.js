const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const customerRoutes = require('./routes/customerRoutes');
const tagRoutes = require('./routes/tagRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const searchRoutes = require('./routes/searchRoutes');
const exportRoutes = require('./routes/exportRoutes');
const importRoutes = require('./routes/importRoutes');
const healthRoutes = require('./routes/healthRoutes');
const config = require('./config');

// 创建Express应用
const app = express();

// 安全相关中间件
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 设置速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP在windowMs内最多请求数
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});

// 请求日志
if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 基础路由
app.get('/', (req, res) => {
  res.json({
    service: config.APP_ID,
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// API路由
app.use('/api/customers', apiLimiter, customerRoutes);
app.use('/api/tags', apiLimiter, tagRoutes);
app.use('/api/interactions', apiLimiter, interactionRoutes);
app.use('/api/search', apiLimiter, searchRoutes);
app.use('/api/exports', apiLimiter, exportRoutes);
app.use('/api/imports', apiLimiter, importRoutes);
app.use('/api/health', healthRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '未找到请求的资源',
    path: req.path
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // 记录错误日志
  console.error(`[错误] ${req.method} ${req.path}:`, err);
  
  res.status(statusCode).json({
    error: config.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.id
  });
});

module.exports = app; 