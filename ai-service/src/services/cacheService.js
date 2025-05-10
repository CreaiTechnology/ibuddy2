/**
 * Cache Service for AI Service
 * Provides caching functionality using Redis or in-memory cache
 */
const Redis = require('ioredis');

// Environment variables
const REDIS_URL = process.env.REDIS_URL;
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Initialize Redis client if enabled
let redisClient = null;
if (REDIS_ENABLED && REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL);
    console.log('Redis cache initialized');
    
    // Handle connection errors
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
      redisClient = null; // Fall back to memory cache on error
    });
  } catch (err) {
    console.error('Failed to initialize Redis:', err);
  }
}

// In-memory cache (used when Redis is not available)
const memoryCache = {};
const memoryCacheExpiry = {};

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {string} value - Value to cache (will be stringified)
 * @param {number} ttlSeconds - Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success status
 */
async function set(key, value, ttlSeconds = 3600) {
  try {
    if (redisClient) {
      // Use Redis
      if (ttlSeconds > 0) {
        await redisClient.setex(key, ttlSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
    } else {
      // Use memory cache
      memoryCache[key] = value;
      
      // Set expiry time
      if (ttlSeconds > 0) {
        const expiryTime = Date.now() + (ttlSeconds * 1000);
        memoryCacheExpiry[key] = expiryTime;
        
        // Schedule cleanup
        setTimeout(() => {
          if (memoryCacheExpiry[key] <= Date.now()) {
            delete memoryCache[key];
            delete memoryCacheExpiry[key];
          }
        }, ttlSeconds * 1000);
      }
    }
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<string|null>} Cached value or null if not found
 */
async function get(key) {
  try {
    if (redisClient) {
      // Use Redis
      return await redisClient.get(key);
    } else {
      // Use memory cache
      // Check if key exists and not expired
      if (memoryCache[key] && (!memoryCacheExpiry[key] || memoryCacheExpiry[key] > Date.now())) {
        return memoryCache[key];
      }
      
      // Clean up expired key
      if (memoryCache[key] && memoryCacheExpiry[key] && memoryCacheExpiry[key] <= Date.now()) {
        delete memoryCache[key];
        delete memoryCacheExpiry[key];
      }
      
      return null;
    }
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Delete a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function del(key) {
  try {
    if (redisClient) {
      // Use Redis
      await redisClient.del(key);
    } else {
      // Use memory cache
      delete memoryCache[key];
      delete memoryCacheExpiry[key];
    }
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

/**
 * Clear cache (all keys or by pattern)
 * @param {string} pattern - Key pattern to clear (optional)
 * @returns {Promise<boolean>} Success status
 */
async function clear(pattern = '*') {
  try {
    if (redisClient) {
      // Use Redis
      if (pattern === '*') {
        await redisClient.flushdb();
      } else {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }
    } else {
      // Use memory cache
      if (pattern === '*') {
        Object.keys(memoryCache).forEach(key => {
          delete memoryCache[key];
          delete memoryCacheExpiry[key];
        });
      } else {
        // Convert Redis glob pattern to JavaScript regex
        const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        
        Object.keys(memoryCache).forEach(key => {
          if (regexPattern.test(key)) {
            delete memoryCache[key];
            delete memoryCacheExpiry[key];
          }
        });
      }
    }
    return true;
  } catch (error) {
    console.error('Cache clear error:', error);
    return false;
  }
}

/**
 * Get cache stats
 * @returns {Promise<Object>} Cache statistics
 */
async function getStats() {
  try {
    if (redisClient) {
      // Use Redis
      const info = await redisClient.info();
      
      // Parse Redis info
      const stats = {
        type: 'redis',
        connected: redisClient.status === 'ready',
        keyCount: 0
      };
      
      // Extract key count from info
      const keyspaceLine = info.split('\n').find(line => line.startsWith('db0:'));
      if (keyspaceLine) {
        const keyCountMatch = keyspaceLine.match(/keys=(\d+)/);
        if (keyCountMatch) {
          stats.keyCount = parseInt(keyCountMatch[1]);
        }
      }
      
      return stats;
    } else {
      // Use memory cache
      return {
        type: 'memory',
        connected: true,
        keyCount: Object.keys(memoryCache).length,
        memoryUsage: process.memoryUsage().heapUsed
      };
    }
  } catch (error) {
    console.error('Cache stats error:', error);
    return {
      type: redisClient ? 'redis' : 'memory',
      connected: false,
      error: error.message
    };
  }
}

module.exports = {
  set,
  get,
  del,
  clear,
  getStats,
  redisClient // Expose for direct access if needed
}; 