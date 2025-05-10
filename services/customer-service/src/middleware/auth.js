const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 认证中间件 - 验证用户是否已登录
 */
const authenticate = (req, res, next) => {
  try {
    // 获取授权头
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '未提供有效的授权令牌'
      });
    }
    
    // 提取JWT令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.user_id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (err) {
    // 处理不同类型的JWT错误
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: '授权令牌已过期',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: '无效的授权令牌',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.error('认证错误:', err);
      return res.status(500).json({
        error: '认证处理过程中出错',
        code: 'AUTH_ERROR'
      });
    }
  }
};

/**
 * 服务间认证中间件 - 验证内部API密钥
 */
exports.authenticateService = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== config.INTERNAL_API_KEY) {
      return res.status(401).json({
        status: 'error',
        message: '服务认证失败',
        error: '无效的API密钥'
      });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 权限检查中间件 - 验证用户是否有特定权限
 */
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      // 确保用户已认证
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: '认证失败',
          error: '未经身份验证'
        });
      }
      
      // 检查用户权限
      const userPermissions = req.user.permissions || [];
      
      if (!userPermissions.includes(permission) && !userPermissions.includes('admin')) {
        return res.status(403).json({
          status: 'error',
          message: '权限不足',
          error: `需要 "${permission}" 权限`
        });
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * 订阅检查中间件 - 验证用户是否有权限访问特定功能
 * @param {string} feature - 功能名称
 */
const checkSubscription = (feature) => {
  return async (req, res, next) => {
    try {
      // 确保用户已认证
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: '未认证的用户',
          code: 'UNAUTHENTICATED'
        });
      }
      
      // 在实际应用中，这里应该查询用户的订阅状态
      // 针对开发环境或简化版，我们可以假设所有认证用户都有权限
      if (config.NODE_ENV === 'development') {
        return next();
      }
      
      // 模拟订阅检查 - 在生产环境中应该从数据库或服务中获取
      const hasSubscription = await checkUserSubscriptionForFeature(req.user.id, feature);
      
      if (!hasSubscription) {
        return res.status(403).json({
          error: '没有访问权限',
          feature: feature,
          code: 'SUBSCRIPTION_REQUIRED',
          upgrade_url: '/api/subscriptions/plans'
        });
      }
      
      next();
    } catch (err) {
      console.error('检查订阅时出错:', err);
      return res.status(500).json({
        error: '验证订阅时出错',
        code: 'SUBSCRIPTION_ERROR'
      });
    }
  };
};

/**
 * 模拟检查用户是否订阅了特定功能
 * 在实际应用中，应从数据库或订阅服务中获取
 */
async function checkUserSubscriptionForFeature(userId, feature) {
  // 在实际环境中替换为真实的订阅检查逻辑
  return true;
}

module.exports = {
  authenticate,
  checkSubscription
}; 
 