/**
 * 缓存服务
 * 提供基于Redis或内存缓存的缓存功能
 */
const { createClient } = require('redis');

// 环境变量
const ENABLE_REDIS_CACHE = process.env.ENABLE_REDIS_CACHE === 'true';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 确定是使用Redis还是内存缓存
const useRedis = ENABLE_REDIS_CACHE;

// Redis客户端
let redisClient = null;

// 内存缓存（简单对象）
const memoryCache = {};

/**
 * 初始化缓存服务
 * @returns {Promise<void>}
 */
async function initialize() {
  if (useRedis) {
    try {
      redisClient = createClient({
        url: REDIS_URL
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis客户端错误', err);
      });
      
      await redisClient.connect();
      console.log('Redis客户端已连接');
    } catch (error) {
      console.error('初始化Redis客户端失败', error);
      throw error;
    }
  } else {
    console.log('使用内存缓存');
  }
}

/**
 * 检查缓存连接是否活跃
 * @returns {Promise<boolean>} 连接是否活跃
 */
async function checkConnection() {
  if (useRedis) {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }
    
    try {
      await redisClient.ping();
      return true;
    } catch (error) {
      console.error('Redis连接检查失败', error);
      return false;
    }
  }
  
  // 内存缓存总是"已连接"
  return true;
}

/**
 * 从缓存获取值
 * @param {string} key - 缓存键
 * @returns {Promise<string|null>} 缓存的值或null（如果未找到）
 */
async function get(key) {
  if (useRedis) {
    if (!redisClient || !redisClient.isOpen) {
      await initialize();
    }
    
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis获取错误', error);
      return null;
    }
  } else {
    // 使用内存缓存
    const item = memoryCache[key];
    
    // 检查项目是否存在且未过期
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    
    // 项目不存在或已过期
    return null;
  }
}

/**
 * 在缓存中设置值
 * @param {string} key - 缓存键
 * @param {string} value - 要存储的值
 * @param {number} ttlSeconds - 生存时间（秒）
 * @returns {Promise<boolean>} 操作是否成功
 */
async function set(key, value, ttlSeconds = 3600) {
  if (useRedis) {
    if (!redisClient || !redisClient.isOpen) {
      await initialize();
    }
    
    try {
      await redisClient.set(key, value, {
        EX: ttlSeconds
      });
      return true;
    } catch (error) {
      console.error('Redis设置错误', error);
      return false;
    }
  } else {
    // 使用带过期时间的内存缓存
    memoryCache[key] = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    };
    return true;
  }
}

/**
 * 从缓存删除值
 * @param {string} key - 缓存键
 * @returns {Promise<boolean>} 操作是否成功
 */
async function del(key) {
  if (useRedis) {
    if (!redisClient || !redisClient.isOpen) {
      await initialize();
    }
    
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis删除错误', error);
      return false;
    }
  } else {
    // 使用内存缓存
    delete memoryCache[key];
    return true;
  }
}

/**
 * 清除缓存中具有特定前缀的所有值
 * @param {string} prefix - 键前缀
 * @returns {Promise<boolean>} 操作是否成功
 */
async function clearPrefix(prefix) {
  if (useRedis) {
    if (!redisClient || !redisClient.isOpen) {
      await initialize();
    }
    
    try {
      // 获取所有带前缀的键
      const keys = await redisClient.keys(`${prefix}*`);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Redis清除前缀错误', error);
      return false;
    }
  } else {
    // 使用内存缓存
    for (const key in memoryCache) {
      if (key.startsWith(prefix)) {
        delete memoryCache[key];
      }
    }
    return true;
  }
}

// 在模块加载时初始化缓存服务
if (useRedis) {
  initialize().catch(console.error);
} else {
  // 启动一个简单的定期清理过期的内存缓存项
  setInterval(() => {
    const now = Date.now();
    for (const key in memoryCache) {
      if (memoryCache[key].expiry < now) {
        delete memoryCache[key];
      }
    }
  }, 60000); // 每分钟清理一次
}

module.exports = {
  get,
  set,
  del,
  clearPrefix,
  checkConnection,
  initialize
}; 