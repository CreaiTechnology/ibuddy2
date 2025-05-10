/**
 * 用户体验路由
 * 集成AI服务以提供智能用户体验功能
 */
const express = require('express');
const router = express.Router();
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { createServiceClient } = require('../services/serviceClient');
const cacheService = require('../services/cacheService');
const messageQueue = require('../services/messageQueue');
const dbService = require('../services/dbService');

// 缓存配置
const CACHE_TTL = 60 * 5; // 5分钟缓存
const UX_CACHE_PREFIX = 'ux:';

/**
 * @route POST /user-experience/chat
 * @desc 用户聊天功能，集成上下文
 * @access Protected
 */
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;
  const userId = req.user.id;
  
  if (!message) {
    throw new ApiError('消息不能为空', 400);
  }
  
  // 获取用户资料以提供上下文
  const { data: profiles } = await dbService.query('profiles', {
    filters: [{ field: 'user_id', eq: true, value: userId }]
  });
  
  const userProfile = profiles && profiles.length > 0 ? profiles[0] : null;
  
  // 创建AI服务客户端使用用户令牌
  const aiClient = createServiceClient('AI_SERVICE', req.headers.authorization.split(' ')[1]);
  
  // 准备AI服务请求参数
  const aiParams = {
    userId,
    message,
    conversationId,
    context: {
      userProfile: userProfile ? {
        name: userProfile.display_name,
        preferences: userProfile.preferences || {},
        settings: userProfile.settings || {}
      } : null
    }
  };
  
  try {
    // 发送消息到AI服务
    const response = await aiClient.chat(aiParams);
    
    // 记录聊天历史（异步）
    messageQueue.sendMessage('core.chat.history', {
      userId,
      conversationId,
      timestamp: new Date().toISOString(),
      message,
      response: response.message,
      intent: response.intent || null
    }).catch(err => {
      req.logger?.error('保存聊天历史到队列失败', { error: err.message });
    });
    
    return res.json({
      success: true,
      message: response.message,
      conversationId: response.conversationId || conversationId,
      intent: response.intent || null
    });
  } catch (error) {
    // 如果AI服务失败，尝试提供基本回复
    req.logger?.error('AI服务调用失败', { error: error.message });
    
    return res.status(200).json({
      success: true,
      message: '很抱歉，我现在无法处理您的请求。请稍后再试。',
      conversationId: conversationId,
      fallback: true
    });
  }
}));

/**
 * @route POST /user-experience/analyze
 * @desc 分析用户输入的意图
 * @access Protected
 */
router.post('/analyze', asyncHandler(async (req, res) => {
  const { text } = req.body;
  const userId = req.user.id;
  
  if (!text) {
    throw new ApiError('文本不能为空', 400);
  }
  
  // 尝试从缓存获取相似查询的结果
  const cacheKey = `${UX_CACHE_PREFIX}intent:${text.substring(0, 50).toLowerCase()}`;
  const cachedIntent = await cacheService.get(cacheKey);
  
  if (cachedIntent) {
    return res.json(JSON.parse(cachedIntent));
  }
  
  // 创建AI服务客户端
  const aiClient = createServiceClient('AI_SERVICE', req.headers.authorization.split(' ')[1]);
  
  try {
    // 调用AI服务进行意图分析
    const intentResponse = await aiClient.analyzeIntent({ text, userId });
    
    // 缓存结果
    await cacheService.set(cacheKey, JSON.stringify(intentResponse), CACHE_TTL);
    
    return res.json(intentResponse);
  } catch (error) {
    throw new ApiError('意图分析失败', 500, { originalError: error.message });
  }
}));

/**
 * @route POST /user-experience/auto-reply
 * @desc 为用户消息生成自动回复建议
 * @access Protected
 */
router.post('/auto-reply', asyncHandler(async (req, res) => {
  const { message, context } = req.body;
  const userId = req.user.id;
  
  if (!message) {
    throw new ApiError('消息不能为空', 400);
  }
  
  // 创建AI服务客户端
  const aiClient = createServiceClient('AI_SERVICE', req.headers.authorization.split(' ')[1]);
  
  try {
    // 调用AI服务生成自动回复
    const replyResponse = await aiClient.generateAutoReply({
      message,
      userId,
      context: context || {}
    });
    
    return res.json(replyResponse);
  } catch (error) {
    throw new ApiError('生成自动回复失败', 500, { originalError: error.message });
  }
}));

/**
 * @route GET /user-experience/services/status
 * @desc 获取所有服务的状态
 * @access Protected
 */
router.get('/services/status', asyncHandler(async (req, res) => {
  // 创建AI服务客户端
  const aiClient = createServiceClient('AI_SERVICE');
  
  // 检查各服务状态
  const [aiStatus, dbStatus, cacheStatus, queueStatus] = await Promise.all([
    aiClient.checkHealth().catch(err => ({ status: 'unhealthy', error: err.message })),
    dbService.checkConnection().then(ok => ({ status: ok ? 'healthy' : 'unhealthy' })),
    cacheService.checkConnection().then(ok => ({ status: ok ? 'healthy' : 'unhealthy' })),
    messageQueue.checkConnection().then(ok => ({ status: ok ? 'healthy' : 'unhealthy' }))
  ]);
  
  // 计算总体系统状态
  const overallStatus = [aiStatus, dbStatus, cacheStatus, queueStatus].every(s => s.status === 'healthy')
    ? 'healthy'
    : 'degraded';
  
  return res.json({
    success: true,
    status: overallStatus,
    services: {
      ai: aiStatus,
      database: dbStatus,
      cache: cacheStatus,
      messageQueue: queueStatus
    },
    timestamp: new Date().toISOString()
  });
}));

module.exports = router; 