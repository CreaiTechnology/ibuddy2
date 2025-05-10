/**
 * Service discovery and health check routes
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Environment variables
const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3001';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3002';

// Service registry (could be replaced with a proper service discovery mechanism)
const services = {
  core: {
    name: 'Core Service',
    url: CORE_SERVICE_URL,
    healthEndpoint: '/health'
  },
  ai: {
    name: 'AI Service',
    url: AI_SERVICE_URL,
    healthEndpoint: '/health'
  },
  gateway: {
    name: 'API Gateway',
    url: `http://localhost:${process.env.PORT || 3000}`,
    healthEndpoint: '/api/services/health/gateway'
  }
};

/**
 * @route GET /api/services/list
 * @desc Get a list of all available services
 * @access Public
 */
router.get('/list', (req, res) => {
  // Map services to public information
  const serviceList = Object.keys(services).map(key => ({
    id: key,
    name: services[key].name,
    status: 'unknown' // Will be updated by health check
  }));
  
  res.json({
    success: true,
    services: serviceList
  });
});

/**
 * @route GET /api/services/health
 * @desc Check health of all services
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const healthChecks = await Promise.allSettled(
      Object.keys(services).map(async key => {
        const service = services[key];
        
        // Special case for the gateway itself
        if (key === 'gateway') {
          return {
            id: key,
            name: service.name,
            status: 'healthy',
            version: process.env.npm_package_version || '1.0.0'
          };
        }
        
        try {
          // Check service health
          const response = await axios.get(`${service.url}${service.healthEndpoint}`, {
            timeout: 5000 // 5 second timeout
          });
          
          return {
            id: key,
            name: service.name,
            status: response.data.status || 'healthy',
            version: response.data.version || 'unknown'
          };
        } catch (error) {
          return {
            id: key,
            name: service.name,
            status: 'unhealthy',
            error: error.message
          };
        }
      })
    );
    
    // Process results
    const results = healthChecks.map((result, index) => {
      const serviceKey = Object.keys(services)[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: serviceKey,
          name: services[serviceKey].name,
          status: 'error',
          error: result.reason.message
        };
      }
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking service health',
      error: error.message
    });
  }
});

/**
 * @route GET /api/services/health/gateway
 * @desc Check health of the API Gateway itself
 * @access Public
 */
router.get('/health/gateway', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'API Gateway',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 