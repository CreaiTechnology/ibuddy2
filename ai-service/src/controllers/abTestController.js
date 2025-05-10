/**
 * A/B Testing controller for the AI Service
 * Handles test creation, management, and result analysis
 */
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const abTestingService = require('../services/abTestingService');

/**
 * Create a new A/B test
 */
const createTest = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    models,
    trafficPercentage,
    startDate,
    endDate,
    metrics
  } = req.body;
  
  // Validate required fields
  if (!name) {
    throw new ApiError('Test name is required', 400);
  }
  
  if (!models || !Array.isArray(models) || models.length < 2) {
    throw new ApiError('At least two models are required for testing', 400);
  }
  
  // Create test
  const test = await abTestingService.createTest({
    name,
    description,
    models,
    trafficPercentage,
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    metrics
  });
  
  res.status(201).json({
    success: true,
    test
  });
});

/**
 * Get all active A/B tests
 */
const getActiveTests = asyncHandler(async (req, res) => {
  const tests = await abTestingService.getActiveTests();
  
  res.status(200).json({
    success: true,
    tests,
    count: tests.length
  });
});

/**
 * Get a specific test by ID
 */
const getTestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get test from active tests
  const activeTests = await abTestingService.getActiveTests();
  const test = activeTests.find(t => t.id === id);
  
  if (!test) {
    throw new ApiError('Test not found', 404);
  }
  
  res.status(200).json({
    success: true,
    test
  });
});

/**
 * Get a user's test assignments
 */
const getUserAssignments = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  const assignments = await abTestingService.getUserAssignments(userId);
  
  res.status(200).json({
    success: true,
    userId,
    assignments,
    count: Object.keys(assignments).length
  });
});

/**
 * Manually assign user to tests
 */
const assignUserToTests = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }
  
  const assignments = await abTestingService.assignUserToTests(userId);
  
  res.status(200).json({
    success: true,
    userId,
    assignments,
    count: Object.keys(assignments).length
  });
});

/**
 * Get test results and statistics
 */
const getTestResults = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    throw new ApiError('Test ID is required', 400);
  }
  
  const results = await abTestingService.getTestResults(id);
  
  res.status(200).json({
    success: true,
    results
  });
});

/**
 * Calculate test significance
 */
const calculateSignificance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    throw new ApiError('Test ID is required', 400);
  }
  
  const significance = await abTestingService.calculateSignificance(id);
  
  res.status(200).json({
    success: true,
    testId: id,
    significance
  });
});

/**
 * End a test (change status to completed)
 */
const endTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { winningModel } = req.body;
  
  if (!id) {
    throw new ApiError('Test ID is required', 400);
  }
  
  // This is a placeholder. In a real implementation, we would update the test
  // status in the database. For now, we'll just return a success message.
  
  res.status(200).json({
    success: true,
    message: `Test ${id} marked as completed${winningModel ? ` with winning model: ${winningModel}` : ''}`
  });
});

module.exports = {
  createTest,
  getActiveTests,
  getTestById,
  getUserAssignments,
  assignUserToTests,
  getTestResults,
  calculateSignificance,
  endTest
}; 