/**
 * Analytics Controller for AI Service
 * Provides API endpoints for model usage statistics
 */
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const analyticsService = require('../services/analyticsService');

/**
 * Get model usage statistics
 */
const getModelUsageStats = asyncHandler(async (req, res) => {
  const { model, userId, timeRange, startDate, endDate } = req.query;
  
  const stats = await analyticsService.getModelUsageStats({
    model,
    userId,
    timeRange,
    startDate,
    endDate
  });
  
  res.status(200).json({
    success: true,
    stats
  });
});

/**
 * Record response metrics
 */
const recordResponseMetrics = asyncHandler(async (req, res) => {
  const { messageId, userId, model, processingTime, rating, intent } = req.body;
  
  if (!messageId || !model) {
    throw new ApiError('Message ID and model are required', 400);
  }
  
  const success = await analyticsService.recordResponseMetrics({
    messageId,
    userId,
    model,
    processingTime,
    rating,
    intent
  });
  
  res.status(200).json({
    success
  });
});

module.exports = {
  getModelUsageStats,
  recordResponseMetrics
}; 