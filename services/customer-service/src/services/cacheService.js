const Redis = require('ioredis');
const config = require('../config');

/**
 * LRU缓存实现 - 用于内存缓存
 */
class LRUCache {
  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.cache = new Map();
    this.expiryTimes = new Map();
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值或undefined
   */
  get(key) {
    // 检查键是否存在
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    // 检查是否过期
    const expiryTime = this.expiryTimes.get(key);
    if (expiryTime && expiryTime < Date.now()) {
      this.cache.delete(key);
      this.expiryTimes.delete(key);
      return undefined;
    }
    
    // 获取值并更新访问顺序
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间(秒)
   */
  set(key, value, ttl = 0) {
    // 如果达到容量上限且键不存在，删除最旧的键
    if (this.cache.size >= this.capacity && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.expiryTimes.delete(oldestKey);
    }
    
    // 设置值
    this.cache.set(key, value);
    
    // 设置过期时间
    if (ttl > 0) {
      this.expiryTimes.set(key, Date.now() + ttl * 1000);
    } else {
      this.expiryTimes.delete(key);
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    this.expiryTimes.delete(key);
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
    this.expiryTimes.clear();
  }
  
  /**
   * 根据前缀删除缓存
   * @param {string} prefix - 缓存键前缀
   */
  deletePattern(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }
  }
}

/**
 * 缓存服务 - 提供缓存操作接口
 */
class CacheService {
  constructor() {
    this.redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000
    });
    
    this.isConnected = false;
    this.lastError = null;
    
    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('缓存服务已连接');
    });
    
    this.redis.on('error', (err) => {
      this.isConnected = false;
      this.lastError = err;
      console.error('缓存服务错误:', err);
    });
  }
  
  /**
   * 执行缓存健康检查
   */
  async healthCheck() {
    try {
      const ping = await this.redis.ping();
      
      if (ping !== 'PONG') {
        throw new Error('Redis ping失败');
      }
      
      return {
        status: 'healthy',
        message: '缓存服务正常',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {Promise<any>} 缓存值
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (err) {
      console.error(`缓存读取错误 (${key}):`, err);
      return null;
    }
  }
  
  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<boolean>} 操作是否成功
   */
  async set(key, value, ttl = config.CACHE_TTL) {
    try {
      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        ttl
      );
      
      return true;
    } catch (err) {
      console.error(`缓存写入错误 (${key}):`, err);
      return false;
    }
  }
  
  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 操作是否成功
   */
  async delete(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (err) {
      console.error(`缓存删除错误 (${key}):`, err);
      return false;
    }
  }
  
  /**
   * 使用模式删除多个缓存
   * @param {string} pattern - 缓存键模式
   * @returns {Promise<number>} 删除的键数量
   */
  async deletePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const count = await this.redis.del(keys);
      return count;
    } catch (err) {
      console.error(`模式缓存删除错误 (${pattern}):`, err);
      return 0;
    }
  }
  
  /**
   * 批量获取多个缓存
   * @param {Array<string>} keys - 缓存键数组
   * @returns {Promise<Array<any>>} 缓存值数组
   */
  async mget(keys) {
    try {
      const values = await this.redis.mget(keys);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (err) {
      console.error('批量缓存获取错误:', err);
      return keys.map(() => null);
    }
  }
  
  /**
   * 自增缓存计数
   * @param {string} key - 缓存键
   * @param {number} increment - 增量值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<number>} 增加后的值
   */
  async increment(key, increment = 1, ttl = config.CACHE_TTL) {
    try {
      const value = await this.redis.incrby(key, increment);
      
      // 设置过期时间（如果是新键）
      await this.redis.expire(key, ttl);
      
      return value;
    } catch (err) {
      console.error(`缓存自增错误 (${key}):`, err);
      return -1;
    }
  }
  
  /**
   * 清除所有缓存
   * @returns {Promise<boolean>} 操作是否成功
   */
  async clear() {
    try {
      await this.redis.flushdb();
      return true;
    } catch (err) {
      console.error('清除所有缓存错误:', err);
      return false;
    }
  }
  
  /**
   * 关闭缓存连接
   */
  async close() {
    try {
      await this.redis.quit();
      this.isConnected = false;
      console.log('缓存连接已关闭');
    } catch (err) {
      console.error('关闭缓存连接错误:', err);
    }
  }
}

module.exports = { CacheService }; 