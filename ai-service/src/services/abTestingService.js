/**
 * A/B Testing Service for AI Service
 * Manages test configurations, user assignments, and result tracking
 */
const { v4: uuidv4 } = require('uuid');
const cacheService = require('./cacheService');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Check if Supabase is configured
const useSupabase = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// Initialize Supabase client
const supabase = useSupabase 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// In-memory storage for tests (used when Supabase is not configured)
const activeTests = {};
const testAssignments = {};
const testResults = {};

/**
 * Create a new A/B test
 * @param {Object} testConfig - Test configuration
 * @param {string} testConfig.name - Test name
 * @param {string} testConfig.description - Test description
 * @param {Array<string>} testConfig.models - Array of model names to test
 * @param {number} testConfig.trafficPercentage - Percentage of traffic to include (0-100)
 * @param {Date} testConfig.startDate - Test start date
 * @param {Date} testConfig.endDate - Test end date
 * @param {Object} testConfig.metrics - Metrics to track
 * @returns {Promise<Object>} Created test object
 */
async function createTest(testConfig) {
  const testId = uuidv4();
  const test = {
    id: testId,
    name: testConfig.name,
    description: testConfig.description,
    models: testConfig.models || [],
    trafficPercentage: testConfig.trafficPercentage || 100,
    startDate: testConfig.startDate || new Date(),
    endDate: testConfig.endDate,
    metrics: testConfig.metrics || { rating: true, processingTime: true },
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('ab_tests')
        .insert([test])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creating A/B test in Supabase:', error);
      activeTests[testId] = test;
      return test;
    }
  } else {
    activeTests[testId] = test;
    return test;
  }
}

/**
 * Get all active A/B tests
 * @returns {Promise<Array<Object>>} Array of active tests
 */
async function getActiveTests() {
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active A/B tests from Supabase:', error);
      return Object.values(activeTests);
    }
  } else {
    return Object.values(activeTests);
  }
}

/**
 * Assign a user to test groups for all active tests
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User test assignments
 */
async function assignUserToTests(userId) {
  // Check cache for existing assignments
  const cacheKey = `abtest:assignments:${userId}`;
  const cachedAssignments = await cacheService.get(cacheKey);
  
  if (cachedAssignments) {
    return JSON.parse(cachedAssignments);
  }
  
  const activeTests = await getActiveTests();
  const assignments = {};
  
  // Assign user to each active test based on traffic percentage
  for (const test of activeTests) {
    // Check if test is currently active based on dates
    const now = new Date();
    const startDate = new Date(test.startDate);
    const endDate = test.endDate ? new Date(test.endDate) : null;
    
    if (now < startDate || (endDate && now > endDate)) {
      continue; // Skip tests outside their date range
    }
    
    // Determine if user should be included in test based on traffic percentage
    const userHash = hashString(userId + test.id);
    const normalizedHash = (userHash % 100) + 1; // 1-100
    
    if (normalizedHash <= test.trafficPercentage) {
      // Assign to a model variant
      const modelIndex = userHash % test.models.length;
      assignments[test.id] = {
        testId: test.id,
        testName: test.name,
        model: test.models[modelIndex],
        assignedAt: new Date().toISOString()
      };
    }
  }
  
  // Store assignments
  if (useSupabase) {
    try {
      // Store each assignment
      for (const [testId, assignment] of Object.entries(assignments)) {
        await supabase
          .from('ab_test_assignments')
          .upsert({
            user_id: userId,
            test_id: testId,
            model: assignment.model,
            assigned_at: assignment.assignedAt
          });
      }
    } catch (error) {
      console.error('Error storing A/B test assignments in Supabase:', error);
      testAssignments[userId] = assignments;
    }
  } else {
    testAssignments[userId] = assignments;
  }
  
  // Cache the assignments
  await cacheService.set(cacheKey, JSON.stringify(assignments), 60 * 60 * 24); // 24 hours
  
  return assignments;
}

/**
 * Get model for a user for a specific test
 * @param {string} userId - User ID
 * @param {string} testId - Test ID
 * @returns {Promise<string|null>} Model name or null if not assigned
 */
async function getUserTestModel(userId, testId) {
  // Get all user assignments
  const assignments = await getUserAssignments(userId);
  
  // Return model for specific test
  return assignments[testId] ? assignments[testId].model : null;
}

/**
 * Get all test assignments for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User test assignments
 */
async function getUserAssignments(userId) {
  // Check cache first
  const cacheKey = `abtest:assignments:${userId}`;
  const cachedAssignments = await cacheService.get(cacheKey);
  
  if (cachedAssignments) {
    return JSON.parse(cachedAssignments);
  }
  
  // Try to get from database
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('ab_test_assignments')
        .select('test_id, model, assigned_at, ab_tests(name)')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Format assignments
      const assignments = {};
      for (const item of data) {
        assignments[item.test_id] = {
          testId: item.test_id,
          testName: item.ab_tests?.name,
          model: item.model,
          assignedAt: item.assigned_at
        };
      }
      
      // Cache assignments
      await cacheService.set(cacheKey, JSON.stringify(assignments), 60 * 60 * 24);
      
      return assignments;
    } catch (error) {
      console.error('Error fetching A/B test assignments from Supabase:', error);
      return testAssignments[userId] || {};
    }
  } else {
    return testAssignments[userId] || {};
  }
}

/**
 * Record test result
 * @param {Object} resultData - Result data
 * @param {string} resultData.userId - User ID
 * @param {string} resultData.testId - Test ID
 * @param {string} resultData.messageId - Message ID
 * @param {Object} resultData.metrics - Metrics values
 * @returns {Promise<boolean>} Success status
 */
async function recordTestResult(resultData) {
  const { userId, testId, messageId, metrics } = resultData;
  
  // Get user's assigned model for this test
  const model = await getUserTestModel(userId, testId);
  if (!model) {
    return false; // User not assigned to this test
  }
  
  const result = {
    id: uuidv4(),
    userId,
    testId,
    messageId,
    model,
    metrics,
    timestamp: new Date().toISOString()
  };
  
  if (useSupabase) {
    try {
      const { error } = await supabase
        .from('ab_test_results')
        .insert([{
          id: result.id,
          user_id: userId,
          test_id: testId,
          message_id: messageId,
          model,
          metrics,
          created_at: result.timestamp
        }]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error recording A/B test result in Supabase:', error);
      // Fallback to in-memory storage
      if (!testResults[testId]) {
        testResults[testId] = [];
      }
      testResults[testId].push(result);
      return true;
    }
  } else {
    // Store in memory
    if (!testResults[testId]) {
      testResults[testId] = [];
    }
    testResults[testId].push(result);
    return true;
  }
}

/**
 * Get test results
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Test results and statistics
 */
async function getTestResults(testId) {
  let results = [];
  
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from('ab_test_results')
        .select('*')
        .eq('test_id', testId);
      
      if (error) throw error;
      results = data;
    } catch (error) {
      console.error('Error fetching A/B test results from Supabase:', error);
      results = testResults[testId] || [];
    }
  } else {
    results = testResults[testId] || [];
  }
  
  // Calculate statistics
  const stats = calculateTestStatistics(results);
  
  return {
    testId,
    resultCount: results.length,
    statistics: stats
  };
}

/**
 * Calculate test statistics from results
 * @param {Array<Object>} results - Test results
 * @returns {Object} Test statistics
 */
function calculateTestStatistics(results) {
  // Group by model
  const modelGroups = {};
  
  for (const result of results) {
    const model = result.model;
    if (!modelGroups[model]) {
      modelGroups[model] = [];
    }
    modelGroups[model].push(result);
  }
  
  // Calculate statistics for each model
  const stats = {};
  
  for (const [model, modelResults] of Object.entries(modelGroups)) {
    const modelStats = {
      count: modelResults.length,
      averageRating: 0,
      averageProcessingTime: 0
    };
    
    // Calculate averages
    let totalRating = 0;
    let totalTime = 0;
    let ratingCount = 0;
    let timeCount = 0;
    
    for (const result of modelResults) {
      if (result.metrics && result.metrics.rating !== undefined) {
        totalRating += result.metrics.rating;
        ratingCount++;
      }
      
      if (result.metrics && result.metrics.processingTime !== undefined) {
        totalTime += result.metrics.processingTime;
        timeCount++;
      }
    }
    
    if (ratingCount > 0) {
      modelStats.averageRating = totalRating / ratingCount;
    }
    
    if (timeCount > 0) {
      modelStats.averageProcessingTime = totalTime / timeCount;
    }
    
    stats[model] = modelStats;
  }
  
  return stats;
}

/**
 * Determine if a test is statistically significant
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Significance results
 */
async function calculateSignificance(testId) {
  const results = await getTestResults(testId);
  const stats = results.statistics;
  
  // Simple significance calculation (t-test would be more appropriate)
  const models = Object.keys(stats);
  if (models.length < 2) {
    return { significant: false, confidence: 0 };
  }
  
  // For illustration - a real implementation would use proper statistical methods
  const modelA = models[0];
  const modelB = models[1];
  const statsA = stats[modelA];
  const statsB = stats[modelB];
  
  // Minimum sample size check
  if (statsA.count < 30 || statsB.count < 30) {
    return {
      significant: false,
      confidence: 0,
      reason: 'Insufficient samples'
    };
  }
  
  // Rating difference
  const ratingDiff = Math.abs(statsA.averageRating - statsB.averageRating);
  const ratingSignificant = ratingDiff > 0.5; // Arbitrary threshold
  
  // Time difference
  const timeDiff = Math.abs(statsA.averageProcessingTime - statsB.averageProcessingTime);
  const timeSignificant = timeDiff > 100; // 100ms threshold
  
  // Combined significance
  const significant = ratingSignificant || timeSignificant;
  
  // Confidence calculation (simplified)
  const confidence = significant ? 0.95 : 0;
  
  return {
    significant,
    confidence,
    metrics: {
      rating: {
        difference: ratingDiff,
        significant: ratingSignificant
      },
      processingTime: {
        difference: timeDiff,
        significant: timeSignificant
      }
    },
    betterModel: getBetterModel(statsA, statsB, modelA, modelB)
  };
}

/**
 * Determine which model performed better
 * @param {Object} statsA - Statistics for model A
 * @param {Object} statsB - Statistics for model B
 * @param {string} modelA - Model A name
 * @param {string} modelB - Model B name
 * @returns {string} Better performing model name
 */
function getBetterModel(statsA, statsB, modelA, modelB) {
  // Higher rating is better
  if (statsA.averageRating > statsB.averageRating + 0.3) {
    return modelA;
  }
  
  if (statsB.averageRating > statsA.averageRating + 0.3) {
    return modelB;
  }
  
  // If ratings are similar, faster response is better
  if (statsA.averageProcessingTime < statsB.averageProcessingTime - 50) {
    return modelA;
  }
  
  if (statsB.averageProcessingTime < statsA.averageProcessingTime - 50) {
    return modelB;
  }
  
  // No clear winner
  return 'no clear winner';
}

/**
 * Hash a string to a number (deterministic)
 * @param {string} str - String to hash
 * @returns {number} Numeric hash
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

module.exports = {
  createTest,
  getActiveTests,
  assignUserToTests,
  getUserTestModel,
  getUserAssignments,
  recordTestResult,
  getTestResults,
  calculateSignificance
}; 