/**
 * 客户服务的身份验证中间件
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const axios = require('axios');

// 环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3001';

/**
 * 验证JWT令牌的中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个函数
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 从头部获取令牌
    const authHeader = req.headers.authorization;
    
    // 检查是否没有认证头
    if (!authHeader) {
      throw new ApiError('未提供认证令牌', 401);
    }
    
    // 检查令牌格式（Bearer令牌）
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new ApiError('认证格式无效', 401);
    }
    
    const token = parts[1];
    
    // 两种认证模式：1. 本地验证JWT 2. 通过核心服务验证
    let userData;
    
    if (process.env.AUTH_MODE === 'local') {
      // 本地验证JWT
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userData = decoded;
      } catch (error) {
        throw new ApiError('令牌无效或已过期', 401);
      }
    } else {
      // 通过核心服务验证（默认、更安全）
      try {
        const response = await axios.get(`${CORE_SERVICE_URL}/auth/verify`, {
          headers: {
            Authorization: authHeader
          }
        });
        
        if (!response.data.success) {
          throw new ApiError('令牌验证失败', 401);
        }
        
        userData = response.data.user;
      } catch (error) {
        if (error.response) {
          throw new ApiError('令牌验证失败: ' + (error.response.data.message || '未知错误'), 401);
        } else {
          req.logger?.error('核心服务认证调用失败', { error: error.message });
          throw new ApiError('验证服务暂不可用', 503);
        }
      }
    }
    
    // 将用户数据附加到请求对象
    req.user = userData;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 检查用户角色的中间件
 * @param {String|Array} roles - 允许的角色或角色数组
 * @returns {Function} 中间件函数
 */
const roleCheck = (roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError('未授权', 401));
  }
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ApiError('您没有执行此操作的权限', 403));
  }
  
  next();
};

module.exports = {
  authMiddleware,
  roleCheck
}; 