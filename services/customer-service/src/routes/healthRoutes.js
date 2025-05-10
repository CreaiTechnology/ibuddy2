const express = require('express');
const { DatabaseService } = require('../services/databaseService');
const { CacheService } = require('../services/cacheService');
const { MessageQueueService } = require('../services/messageQueueService');
const config = require('../config');

const router = express.Router();
const db = new DatabaseService();
const cache = new CacheService();
const mq = new MessageQueueService();

/**
 * 健康检查路由 - 监控服务状态
 */

// 基本健康检查
router.get('/', async (req, res) => {
  try {
    res.json({
      service: config.APP_ID,
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      service: config.APP_ID,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 详细健康检查
router.get('/detailed', async (req, res) => {
  try {
    // 数据库健康检查
    const dbHealth = await db.healthCheck();
    
    // 缓存健康检查
    const cacheHealth = await cache.healthCheck();
    
    // 消息队列健康检查
    const mqHealth = await mq.healthCheck();
    
    // 确定整体健康状态
    const overallStatus = 
      dbHealth.status === 'healthy' && 
      cacheHealth.status === 'healthy' && 
      mqHealth.status === 'healthy' ? 'healthy' : 'degraded';
    
    res.json({
      service: config.APP_ID,
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      components: {
        database: dbHealth,
        cache: cacheHealth,
        messageQueue: mqHealth
      }
    });
  } catch (error) {
    res.status(500).json({
      service: config.APP_ID,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 数据库健康检查
router.get('/db', async (req, res) => {
  try {
    const health = await db.healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 缓存健康检查
router.get('/cache', async (req, res) => {
  try {
    const health = await cache.healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 消息队列健康检查
router.get('/mq', async (req, res) => {
  try {
    const health = await mq.healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 就绪检查 - 用于启动探针
router.get('/ready', async (req, res) => {
  try {
    // 检查数据库连接
    const dbHealth = await db.healthCheck();
    
    if (dbHealth.status !== 'healthy') {
      return res.status(503).json({
        service: config.APP_ID,
        status: 'not_ready',
        reason: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      service: config.APP_ID,
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: config.APP_ID,
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 存活检查 - 用于存活探针
router.get('/live', (req, res) => {
  res.json({
    service: config.APP_ID,
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 