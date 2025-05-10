/**
 * Chat controller for the AI Service
 * Handles processing of user messages and responses
 */
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const aiService = require('../services/aiService');
const contextService = require('../services/contextService');
const cacheService = require('../services/cacheService');

/**
 * Process a user message and generate a response
 */
const processMessage = asyncHandler(async (req, res) => {
  const { text, userId, sessionId, platform = 'web' } = req.body;
  
  // Validate required fields
  if (!text) {
    throw new ApiError('Message text is required', 400);
  }
  
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  // Get user context - getting short-term context for faster processing
  const context = await contextService.getUserContext(userId, sessionId, 'short');
  
  // Process message
  const aiResponse = await aiService.processMessage({
    text,
    userId,
    sessionId,
    platform,
    context
  });
  
  // Update user context with the new interaction
  await contextService.updateUserContext(userId, sessionId, {
    userMessage: text,
    aiResponse: aiResponse.text,
    timestamp: new Date()
  });
  
  // Return response
  res.status(200).json({
    success: true,
    reply: aiResponse.text,
    intentDetected: aiResponse.intent,
    confidence: aiResponse.confidence,
    messageId: aiResponse.messageId,
    model: aiResponse.model,
    processingTime: aiResponse.processingTime
  });
});

/**
 * Get chat history for a user
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { 
    limit = 50, 
    offset = 0, 
    sessionId, 
    memoryLevel = 'short' // 'short', 'mid', 'long'
  } = req.query;
  
  // Validate user ID
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  // Validate memory level
  if (!['short', 'mid', 'long'].includes(memoryLevel)) {
    throw new ApiError('Invalid memory level. Must be one of: short, mid, long', 400);
  }
  
  // Get user chat history from context service with memory level
  const history = await contextService.getChatHistory(
    userId, 
    sessionId, 
    memoryLevel,
    parseInt(limit), 
    parseInt(offset)
  );
  
  res.status(200).json({
    success: true,
    history,
    memoryLevel,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: history.total || 0
    }
  });
});

/**
 * Clear chat history for a user
 */
const clearChatHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { 
    sessionId,
    memoryLevel = 'all' // 'short', 'mid', 'long', 'all'
  } = req.query;
  
  // Validate user ID
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  // Validate memory level
  if (!['short', 'mid', 'long', 'all'].includes(memoryLevel)) {
    throw new ApiError('Invalid memory level. Must be one of: short, mid, long, all', 400);
  }
  
  // Clear user chat history for the specified memory level
  await contextService.clearChatHistory(userId, sessionId, memoryLevel);
  
  res.status(200).json({
    success: true,
    message: `Chat history (${memoryLevel}) cleared successfully`
  });
});

/**
 * Get the current context for a user
 */
const getUserContext = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { sessionId } = req.query;
  
  // Validate user ID
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  // Get full user context
  const context = await contextService.getUserContext(userId, sessionId);
  
  // Get memory stats
  const stats = {
    shortTermSize: context.shortTermMemory?.length || 0,
    midTermSize: context.midTermMemory?.length || 0,
    longTermSize: context.longTermMemory?.length || 0,
    topicCount: Object.keys(context.userProfile?.topics || {}).length || 0,
    interactionCount: context.interactionCount || 0,
    lastActivity: context.lastActivity
  };
  
  res.status(200).json({
    success: true,
    context,
    stats
  });
});

/**
 * Get context summary for a user
 */
const getContextSummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { sessionId } = req.query;
  
  // Validate user ID
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  // Get context structured for AI use
  const aiContext = await contextService.getAIContext(userId, sessionId, {
    includeShortTerm: true,
    includeMidTerm: true,
    includeLongTerm: true,
    includeUserProfile: true,
    maxItems: 20
  });
  
  res.status(200).json({
    success: true,
    aiContext
  });
});

/**
 * Update user preferences
 */
const updateUserPreferences = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;
  
  // Validate user ID and preferences
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  if (!preferences || typeof preferences !== 'object') {
    throw new ApiError('Preferences object is required', 400);
  }
  
  // Update user preferences
  const updatedProfile = await contextService.updateUserPreferences(userId, preferences);
  
  res.status(200).json({
    success: true,
    message: 'User preferences updated successfully',
    userProfile: updatedProfile
  });
});

/**
 * Submit feedback for a specific chat message
 */
const submitFeedback = asyncHandler(async (req, res) => {
  const { messageId, userId, rating, comment } = req.body;
  
  // Validate required fields
  if (!messageId || !userId || rating === undefined) {
    throw new ApiError('Message ID, user ID, and rating are required', 400);
  }
  
  // Record feedback in AI service
  await aiService.recordFeedback(messageId, userId, rating, comment);
  
  res.status(200).json({
    success: true,
    message: 'Feedback recorded successfully'
  });
});

module.exports = {
  processMessage,
  getChatHistory,
  clearChatHistory,
  getUserContext,
  getContextSummary,
  updateUserPreferences,
  submitFeedback
}; 