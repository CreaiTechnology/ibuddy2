const config = require('../config');

/**
 * 全局错误处理中间件
 */
module.exports = (err, req, res, next) => {
  // 记录错误
  console.error('错误:', err);
  
  // 数据库错误
  if (err.code && (err.code.startsWith('23') || err.code.startsWith('42'))) {
    return res.status(400).json({
      status: 'error',
      message: '数据库操作失败',
      error: config.NODE_ENV === 'production' ? '数据库约束冲突' : err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: '认证失败',
      error: '无效的令牌',
      timestamp: new Date().toISOString()
    });
  }
  
  // JWT过期
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: '认证失败',
      error: '令牌已过期',
      timestamp: new Date().toISOString()
    });
  }
  
  // 请求验证错误
  if (err.type === 'validation') {
    return res.status(400).json({
      status: 'error',
      message: '请求验证失败',
      error: err.message,
      details: err.errors,
      timestamp: new Date().toISOString()
    });
  }
  
  // 资源不存在
  if (err.type === 'not_found') {
    return res.status(404).json({
      status: 'error',
      message: '资源不存在',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // 权限错误
  if (err.type === 'permission') {
    return res.status(403).json({
      status: 'error',
      message: '权限不足',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // 业务逻辑错误
  if (err.type === 'business') {
    return res.status(422).json({
      status: 'error',
      message: '业务逻辑错误',
      error: err.message,
      details: err.details,
      timestamp: new Date().toISOString()
    });
  }
  
  // 默认为服务器错误
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    status: 'error',
    message: '服务器错误',
    error: config.NODE_ENV === 'production' ? '内部服务器错误' : err.message,
    stack: config.NODE_ENV === 'production' ? undefined : err.stack,
    timestamp: new Date().toISOString()
  });
}; 