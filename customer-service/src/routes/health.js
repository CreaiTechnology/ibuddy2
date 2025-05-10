/**
 * 客户服务的健康检查路由
 */
const express = require('express');
const router = express.Router();
const os = require('os');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/errorHandler');

// 导入服务
const messageQueue = require('../services/messageQueue');
const cacheService = require('../services/cacheService');

/**
 * @route GET /health
 * @desc 基础健康检查端点
 * @access 公开
 */
router.get('/', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'healthy',
    service: 'Customer Service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    system: {
      uptime: os.uptime(),
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%'
      },
      cpu: os.cpus().length,
      loadavg: os.loadavg()
    },
    process: {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      },
      pid: process.pid,
      uptime: process.uptime()
    }
  });
});

/**
 * @route GET /health/deep
 * @desc 深度健康检查，包括依赖服务
 * @access 公开
 */
router.get('/deep', asyncHandler(async (req, res) => {
  // 检查MongoDB连接
  let mongoStatus = {
    status: 'unknown',
    message: 'MongoDB未启用'
  };
  
  if (mongoose.connection) {
    mongoStatus = {
      status: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
      message: mongoose.connection.readyState === 1 ? '已连接' : '未连接',
      readyState: mongoose.connection.readyState
    };
  }
  
  // 检查消息队列
  let mqStatus = {
    status: 'unknown',
    message: '消息队列未启用'
  };
  
  if (process.env.ENABLE_MESSAGE_QUEUE === 'true') {
    const mqConnected = await messageQueue.checkConnection();
    mqStatus = {
      status: mqConnected ? 'healthy' : 'unhealthy',
      message: mqConnected ? '已连接' : '未连接'
    };
  }
  
  // 检查缓存服务
  let cacheStatus = {
    status: 'unknown',
    message: '缓存服务未启用'
  };
  
  if (process.env.ENABLE_REDIS_CACHE === 'true') {
    const cacheConnected = await cacheService.checkConnection();
    cacheStatus = {
      status: cacheConnected ? 'healthy' : 'unhealthy',
      message: cacheConnected ? '已连接' : '未连接'
    };
  }
  
  // 检查核心服务连接
  let coreServiceStatus = {
    status: 'unknown',
    message: '未检查'
  };
  
  try {
    const axios = require('axios');
    const response = await axios.get(`${process.env.CORE_SERVICE_URL || 'http://localhost:3001'}/health`, {
      timeout: 3000
    });
    
    coreServiceStatus = {
      status: 'healthy',
      message: '可访问',
      version: response.data.version
    };
  } catch (error) {
    coreServiceStatus = {
      status: 'unhealthy',
      message: error.message
    };
  }
  
  // 计算整体状态
  const services = [mongoStatus, mqStatus, cacheStatus, coreServiceStatus];
  const unhealthyServices = services.filter(s => s.status === 'unhealthy');
  const overallStatus = unhealthyServices.length === 0 ? 'healthy' : 
                       (unhealthyServices.length < services.length ? 'degraded' : 'unhealthy');
  
  res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      messageQueue: mqStatus,
      cache: cacheStatus,
      coreService: coreServiceStatus
    },
    environment: process.env.NODE_ENV
  });
}));

module.exports = router; 