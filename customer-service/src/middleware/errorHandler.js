/**
 * 全局错误处理中间件
 */

/**
 * 自定义API错误，包含状态码和消息
 */
class ApiError extends Error {
  /**
   * 创建API错误
   * @param {String} message - 错误消息
   * @param {Number} statusCode - HTTP状态码
   * @param {Object} data - 额外的错误数据
   */
  constructor(message, statusCode = 500, data = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * 异步处理包装器，简化错误处理
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的中间件函数
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个函数
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';
  let data = err.data || {};
  
  // 日志记录
  req.logger?.error(`[错误] ${message}`, {
    error: {
      name: err.name,
      message: err.message,
      statusCode,
      stack: err.stack,
      ...data
    },
    requestId: req.id,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body
  });
  
  // 处理Express验证器错误
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    data = { errors: err.errors };
  }
  
  // 返回格式化的错误响应
  res.status(statusCode).json({
    success: false,
    message,
    error: statusCode === 500 ? '服务器内部错误' : data,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

/**
 * 处理404路由错误
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个函数
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(`未找到: ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  ApiError,
  asyncHandler,
  errorHandler,
  notFoundHandler
}; 