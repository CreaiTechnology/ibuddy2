/**
 * Analytics Service for AI Service
 * Handles collection and processing of model performance and usage metrics
 */
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const cacheService = require('./cacheService');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Check if Supabase is configured
const useSupabase = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// Initialize Supabase client
const supabase = useSupabase 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// In-memory storage for analytics (used when Supabase is not configured)
const analyticsData = {
  modelUsage: {},
  responseMetrics: [],
  errorLogs: []
};

// Time intervals for aggregation (in ms)
const INTERVALS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
};

/**
 * Record model usage metrics
 * @param {Object} data - Model usage data
 * @param {string} data.model - Model name
 * @param {string} data.messageId - Message ID
 * @param {string} data.userId - User ID (optional)
 * @param {number} data.tokensInput - Input tokens count
 * @param {number} data.tokensOutput - Output tokens count
 * @param {number} data.processingTime - Processing time in ms
 * @param {boolean} data.success - Whether the request was successful
 * @returns {Promise<boolean>} Success status
 */
async function recordModelUsage(data) {
  const { model, messageId, userId, tokensInput, tokensOutput, processingTime, success } = data;
  
  const record = {
    id: uuidv4(),
    model,
    messageId,
    userId: userId || null,
    tokensInput: tokensInput || 0,
    tokensOutput: tokensOutput || 0,
    processingTime: processingTime || 0,
    success: success !== undefined ? success : true,
    timestamp: new Date().toISOString()
  };

  // Store in database if available
  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('model_usage')
        .insert([{
          id: record.id,
          model: record.model,
          message_id: record.messageId,
          user_id: record.userId,
          tokens_input: record.tokensInput,
          tokens_output: record.tokensOutput,
          processing_time: record.processingTime,
          success: record.success,
          created_at: record.timestamp
        }]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error recording model usage in Supabase:', error);
      // Fall back to in-memory storage
      recordInMemoryModelUsage(record);
      return true;
    }
  } else {
    // Store in memory
    recordInMemoryModelUsage(record);
    return true;
  }
}

/**
 * Record model usage in memory
 * @param {Object} record - Model usage record
 */
function recordInMemoryModelUsage(record) {
  // Initialize model data if not exists
  if (!analyticsData.modelUsage[record.model]) {
    analyticsData.modelUsage[record.model] = [];
  }
  
  // Add record
  analyticsData.modelUsage[record.model].push(record);
  
  // Keep only last 1000 records per model
  if (analyticsData.modelUsage[record.model].length > 1000) {
    analyticsData.modelUsage[record.model].shift();
  }
}

/**
 * Record response metrics
 * @param {Object} data - Response metrics data
 * @param {string} data.messageId - Message ID
 * @param {string} data.userId - User ID (optional)
 * @param {string} data.model - Model name
 * @param {number} data.processingTime - Processing time in ms
 * @param {number} data.rating - Response rating (1-5)
 * @param {string} data.intent - Detected intent (optional)
 * @returns {Promise<boolean>} Success status
 */
async function recordResponseMetrics(data) {
  const { messageId, userId, model, processingTime, rating, intent } = data;
  
  const record = {
    id: uuidv4(),
    messageId,
    userId: userId || null,
    model,
    processingTime: processingTime || 0,
    rating: rating || null,
    intent: intent || null,
    timestamp: new Date().toISOString()
  };
  
  // Store in database if available
  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('response_metrics')
        .insert([{
          id: record.id,
          message_id: record.messageId,
          user_id: record.userId,
          model: record.model,
          processing_time: record.processingTime,
          rating: record.rating,
          intent: record.intent,
          created_at: record.timestamp
        }]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error recording response metrics in Supabase:', error);
      // Fall back to in-memory storage
      analyticsData.responseMetrics.push(record);
      return true;
    }
  } else {
    // Store in memory
    analyticsData.responseMetrics.push(record);
    
    // Keep only last 1000 records
    if (analyticsData.responseMetrics.length > 1000) {
      analyticsData.responseMetrics.shift();
    }
    
    return true;
  }
}

/**
 * Get model usage statistics
 * @param {Object} options - Query options
 * @param {string} options.model - Filter by model (optional)
 * @param {string} options.userId - Filter by user (optional)
 * @param {string} options.timeRange - Time range (day/week/month)
 * @param {string} options.startDate - Start date (ISO string, optional)
 * @param {string} options.endDate - End date (ISO string, optional)
 * @returns {Promise<Object>} Usage statistics
 */
async function getModelUsageStats(options = {}) {
  const { model, userId, timeRange, startDate, endDate } = options;
  
  // Set time range
  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : new Date();
  
  if (!start && timeRange) {
    switch (timeRange) {
      case 'day':
        start = new Date(end.getTime() - INTERVALS.DAY);
        break;
      case 'week':
        start = new Date(end.getTime() - INTERVALS.WEEK);
        break;
      case 'month':
        start = new Date(end.getTime() - INTERVALS.MONTH);
        break;
      default:
        start = new Date(end.getTime() - INTERVALS.DAY);
    }
  }
  
  if (!start) {
    start = new Date(end.getTime() - INTERVALS.DAY);
  }
  
  // Cache key for this query
  const cacheKey = `analytics:model-usage:${model || 'all'}:${userId || 'all'}:${start.toISOString()}:${end.toISOString()}`;
  const cachedStats = await cacheService.get(cacheKey);
  
  if (cachedStats) {
    return JSON.parse(cachedStats);
  }
  
  // Fetch data from database if available
  if (useSupabase) {
    try {
      let query = supabase
        .from('model_usage')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      
      if (model) {
        query = query.eq('model', model);
      }
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate stats
      const stats = calculateModelStats(data);
      
      // Cache the result
      await cacheService.set(cacheKey, JSON.stringify(stats), 60 * 5); // 5 minutes
      
      return stats;
    } catch (error) {
      console.error('Error fetching model usage stats from Supabase:', error);
      // Fall back to in-memory data
      return calculateInMemoryModelStats(model, userId, start, end);
    }
  } else {
    // Use in-memory data
    const stats = calculateInMemoryModelStats(model, userId, start, end);
    
    // Cache the result
    await cacheService.set(cacheKey, JSON.stringify(stats), 60 * 5); // 5 minutes
    
    return stats;
  }
}

/**
 * Calculate model statistics from database data
 * @param {Array} data - Model usage data
 * @returns {Object} Model statistics
 */
function calculateModelStats(data) {
  // Group data by model
  const modelGroups = {};
  
  for (const record of data) {
    const model = record.model;
    if (!modelGroups[model]) {
      modelGroups[model] = [];
    }
    modelGroups[model].push(record);
  }
  
  // Calculate statistics for each model
  const modelStats = {};
  
  for (const [model, records] of Object.entries(modelGroups)) {
    const stats = {
      totalRequests: records.length,
      successfulRequests: records.filter(r => r.success).length,
      failedRequests: records.filter(r => !r.success).length,
      totalTokensInput: records.reduce((sum, r) => sum + (r.tokens_input || 0), 0),
      totalTokensOutput: records.reduce((sum, r) => sum + (r.tokens_output || 0), 0),
      averageProcessingTime: calculateAverage(records, 'processing_time'),
      maxProcessingTime: calculateMax(records, 'processing_time'),
      minProcessingTime: calculateMin(records, 'processing_time')
    };
    
    // Success rate
    stats.successRate = stats.totalRequests > 0 
      ? (stats.successfulRequests / stats.totalRequests) * 100 
      : 0;
    
    modelStats[model] = stats;
  }
  
  return {
    overallStats: {
      totalRequests: data.length,
      uniqueModels: Object.keys(modelGroups).length,
      successRate: data.length > 0 
        ? (data.filter(r => r.success).length / data.length) * 100
        : 0,
      averageProcessingTime: calculateAverage(data, 'processing_time')
    },
    modelStats
  };
}

/**
 * Calculate model statistics from in-memory data
 * @param {string} modelFilter - Filter by model
 * @param {string} userIdFilter - Filter by user ID
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Object} Model statistics
 */
function calculateInMemoryModelStats(modelFilter, userIdFilter, start, end) {
  // Collect data from memory
  let data = [];
  
  // If model filter is provided, only include that model
  const modelKeys = modelFilter 
    ? [modelFilter].filter(m => analyticsData.modelUsage[m])
    : Object.keys(analyticsData.modelUsage);
  
  // Collect data from all models
  for (const model of modelKeys) {
    const records = analyticsData.modelUsage[model] || [];
    
    for (const record of records) {
      const recordDate = new Date(record.timestamp);
      
      // Apply filters
      if (recordDate >= start && recordDate <= end &&
          (!userIdFilter || record.userId === userIdFilter)) {
        // Convert to database-like format
        data.push({
          model: record.model,
          success: record.success,
          tokens_input: record.tokensInput,
          tokens_output: record.tokensOutput,
          processing_time: record.processingTime,
          created_at: record.timestamp
        });
      }
    }
  }
  
  // Calculate statistics
  return calculateModelStats(data);
}

/**
 * Calculate average of a property in an array of objects
 * @param {Array} data - Array of objects
 * @param {string} property - Property name
 * @returns {number} Average value
 */
function calculateAverage(data, property) {
  if (!data || data.length === 0) return 0;
  
  const valid = data.filter(item => item[property] !== undefined && item[property] !== null);
  if (valid.length === 0) return 0;
  
  const sum = valid.reduce((acc, item) => acc + (item[property] || 0), 0);
  return sum / valid.length;
}

/**
 * Calculate maximum of a property in an array of objects
 * @param {Array} data - Array of objects
 * @param {string} property - Property name
 * @returns {number} Maximum value
 */
function calculateMax(data, property) {
  if (!data || data.length === 0) return 0;
  
  const valid = data.filter(item => item[property] !== undefined && item[property] !== null);
  if (valid.length === 0) return 0;
  
  return Math.max(...valid.map(item => item[property] || 0));
}

/**
 * Calculate minimum of a property in an array of objects
 * @param {Array} data - Array of objects
 * @param {string} property - Property name
 * @returns {number} Minimum value
 */
function calculateMin(data, property) {
  if (!data || data.length === 0) return 0;
  
  const valid = data.filter(item => item[property] !== undefined && item[property] !== null);
  if (valid.length === 0) return 0;
  
  return Math.min(...valid.map(item => item[property] || 0));
}

module.exports = {
  recordModelUsage,
  recordResponseMetrics,
  getModelUsageStats
}; 