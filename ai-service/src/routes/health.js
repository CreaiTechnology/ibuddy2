/**
 * Health check routes for AI Service
 */
const express = require('express');
const router = express.Router();
const os = require('os');
const aiService = require('../services/aiService');

/**
 * @route GET /health
 * @desc Basic health check endpoint
 * @access Public
 */
router.get('/', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'healthy',
    service: 'AI Service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    system: {
      uptime: os.uptime(),
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%'
      },
      load: os.loadavg(),
      process: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        },
        uptime: process.uptime()
      }
    }
  });
});

/**
 * @route GET /health/deep
 * @desc Deep health check that includes dependent services
 * @access Public
 */
router.get('/deep', async (req, res) => {
  try {
    // Check component health
    const componentsHealth = await checkComponentsHealth();
    
    // Overall health status
    const isHealthy = Object.values(componentsHealth)
      .every(component => component.status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'AI Service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      components: componentsHealth
    });
  } catch (error) {
    req.logger.error('Error performing deep health check', error);
    
    res.status(500).json({
      status: 'error',
      service: 'AI Service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /health/model-stats
 * @desc Get AI model usage and performance statistics
 * @access Private (Admin only)
 */
router.get('/model-stats', async (req, res) => {
  try {
    // 获取模型使用统计
    const modelStats = aiService.getModelStats();
    
    res.json({
      success: true,
      data: modelStats
    });
  } catch (error) {
    console.error('Error fetching model stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve model statistics'
    });
  }
});

/**
 * Check health of dependent components
 * @returns {Promise<Object>} Health status of all components
 */
async function checkComponentsHealth() {
  // Initialize components with defaults
  const components = {
    messageQueue: {
      status: 'unknown',
      name: 'Message Queue'
    },
    aiModels: {
      status: 'unknown',
      name: 'AI Models'
    },
    redis: {
      status: 'unknown',
      name: 'Redis Cache'
    }
  };
  
  // Check message queue if enabled
  if (process.env.ENABLE_MESSAGE_QUEUE === 'true') {
    try {
      const messageQueue = require('../services/messageQueue');
      const isConnected = await messageQueue.checkConnection();
      
      components.messageQueue = {
        status: isConnected ? 'healthy' : 'unhealthy',
        name: 'Message Queue'
      };
    } catch (error) {
      components.messageQueue = {
        status: 'unhealthy',
        name: 'Message Queue',
        error: error.message
      };
    }
  } else {
    components.messageQueue = {
      status: 'disabled',
      name: 'Message Queue'
    };
  }
  
  // Check AI models
  try {
    const aiService = require('../services/aiService');
    const isReady = await aiService.checkAiModelsAvailability();
    
    components.aiModels = {
      status: isReady ? 'healthy' : 'unhealthy',
      name: 'AI Models'
    };
  } catch (error) {
    components.aiModels = {
      status: 'unhealthy',
      name: 'AI Models',
      error: error.message
    };
  }
  
  // Check redis cache if enabled
  if (process.env.ENABLE_REDIS_CACHE === 'true') {
    try {
      const cacheService = require('../services/cacheService');
      const isConnected = await cacheService.checkConnection();
      
      components.redis = {
        status: isConnected ? 'healthy' : 'unhealthy',
        name: 'Redis Cache'
      };
    } catch (error) {
      components.redis = {
        status: 'unhealthy',
        name: 'Redis Cache',
        error: error.message
      };
    }
  } else {
    components.redis = {
      status: 'disabled',
      name: 'Redis Cache'
    };
  }
  
  return components;
}

module.exports = router; 