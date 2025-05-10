require('dotenv').config();

/**
 * 服务配置
 */
const config = {
  // 应用设置
  APP_ID: process.env.APP_ID || 'customer-service',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  
  // CORS配置
  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  
  // 认证设置
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  
  // 数据库配置
  DB_URL: process.env.DB_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  
  // 缓存配置
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600'),
  CUSTOMER_CACHE_TTL: parseInt(process.env.CUSTOMER_CACHE_TTL || '300'),
  
  // 消息队列配置
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  MQ_EXCHANGE: process.env.MQ_EXCHANGE || 'ibuddy',
  
  // 分页设置
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '20'),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100'),
  
  // 速率限制设置
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  
  // 日志设置
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // 功能标志
  ENABLE_CUSTOMER_ANALYTICS: process.env.ENABLE_CUSTOMER_ANALYTICS === 'true'
};

// 验证关键配置
function validateConfig() {
  const requiredKeys = [];
  
  // 在生产环境中验证必要的配置
  if (config.NODE_ENV === 'production') {
    requiredKeys.push('JWT_SECRET', 'DB_URL', 'REDIS_URL', 'RABBITMQ_URL');
  }
  
  const missingKeys = requiredKeys.filter(key => !config[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`缺少关键配置: ${missingKeys.join(', ')}`);
  }
}

// 仅在直接运行时验证配置
if (require.main === module) {
  validateConfig();
  console.log('配置验证成功');
}

module.exports = config; 