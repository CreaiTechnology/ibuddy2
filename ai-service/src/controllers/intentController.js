/**
 * Intent controller for the AI Service
 * Handles intent detection, management, and training
 */
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const intentService = require('../services/intentService');
const contextService = require('../services/contextService');

/**
 * Detect intent from a text message
 */
const detectIntent = asyncHandler(async (req, res) => {
  const { text, userId, sessionId, modelId = 'default' } = req.body;
  
  // Validate required fields
  if (!text) {
    throw new ApiError('Message text is required', 400);
  }
  
  // Get user context if userId provided
  let context = null;
  if (userId) {
    context = await contextService.getUserContext(userId, sessionId);
  }
  
  // Detect intent
  const intentResult = await intentService.recognizeIntent(text, modelId, context);
  
  res.status(200).json({
    success: true,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    allIntents: intentResult.allIntents,
    tokens: intentResult.tokens
  });
});

/**
 * Get all available intents
 */
const getAllIntents = asyncHandler(async (req, res) => {
  const { modelId = 'default' } = req.query;
  
  // Get all intents
  // For now, we just return the default intents
  // In a future implementation, we'd load this from the database
  const intents = Object.keys(intentService.defaultIntents).map(intent => ({
    name: intent,
    exampleCount: intentService.defaultIntents[intent].length
  }));
  
  res.status(200).json({
    success: true,
    modelId,
    intents
  });
});

/**
 * Get a specific intent
 */
const getIntentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { modelId = 'default' } = req.query;
  
  // Validate that intent exists
  if (!intentService.defaultIntents[id]) {
    throw new ApiError('Intent not found', 404);
  }
  
  // Get intent details
  const intent = {
    name: id,
    examples: intentService.defaultIntents[id],
    relationships: intentService.getRelatedIntents(id, modelId)
  };
  
  res.status(200).json({
    success: true,
    intent
  });
});

/**
 * Create a new intent
 */
const createIntent = asyncHandler(async (req, res) => {
  const { name, examples, modelId = 'default' } = req.body;
  
  // Validate required fields
  if (!name) {
    throw new ApiError('Intent name is required', 400);
  }
  
  if (!examples || !Array.isArray(examples) || examples.length === 0) {
    throw new ApiError('Examples array is required', 400);
  }
  
  // Train the intent
  const success = await intentService.trainIntent(name, examples, modelId);
  
  if (!success) {
    throw new ApiError('Failed to create intent', 500);
  }
  
  res.status(201).json({
    success: true,
    message: 'Intent created successfully',
    intent: {
      name,
      exampleCount: examples.length
    }
  });
});

/**
 * Update a specific intent
 */
const updateIntent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { examples, modelId = 'default' } = req.body;
  
  // Validate required fields
  if (!examples || !Array.isArray(examples) || examples.length === 0) {
    throw new ApiError('Examples array is required', 400);
  }
  
  // Train the intent (updates if it exists)
  const success = await intentService.trainIntent(id, examples, modelId);
  
  if (!success) {
    throw new ApiError('Failed to update intent', 500);
  }
  
  res.status(200).json({
    success: true,
    message: 'Intent updated successfully',
    intent: {
      name: id,
      exampleCount: examples.length
    }
  });
});

/**
 * Delete a specific intent
 * Note: This is a placeholder as proper deletion would require database access
 */
const deleteIntent = asyncHandler(async (req, res) => {
  // This would need actual database implementation
  res.status(200).json({
    success: true,
    message: 'Intent deletion not implemented in this version'
  });
});

/**
 * Train the intent model with new examples
 */
const trainIntentModel = asyncHandler(async (req, res) => {
  const { intent, examples, modelId = 'default' } = req.body;
  
  // Validate required fields
  if (!intent) {
    throw new ApiError('Intent name is required', 400);
  }
  
  if (!examples || !Array.isArray(examples) || examples.length === 0) {
    throw new ApiError('Examples array is required', 400);
  }
  
  // Train the intent
  const success = await intentService.trainIntent(intent, examples, modelId);
  
  if (!success) {
    throw new ApiError('Failed to train intent model', 500);
  }
  
  res.status(200).json({
    success: true,
    message: 'Intent model trained successfully',
    intent,
    exampleCount: examples.length
  });
});

/**
 * Create an intent relationship
 */
const createIntentRelationship = asyncHandler(async (req, res) => {
  const { intent, relatedIntent, relationType = 'related', modelId = 'default' } = req.body;
  
  // Validate required fields
  if (!intent) {
    throw new ApiError('Intent name is required', 400);
  }
  
  if (!relatedIntent) {
    throw new ApiError('Related intent name is required', 400);
  }
  
  if (!['related', 'parent', 'child'].includes(relationType)) {
    throw new ApiError('Relationship type must be one of: related, parent, child', 400);
  }
  
  // Create the relationship
  const success = await intentService.createIntentRelationship(
    intent, 
    relatedIntent, 
    relationType,
    modelId
  );
  
  if (!success) {
    throw new ApiError('Failed to create intent relationship', 500);
  }
  
  res.status(200).json({
    success: true,
    message: 'Intent relationship created successfully',
    relationship: {
      intent,
      relatedIntent,
      type: relationType
    }
  });
});

/**
 * Get intent detection statistics
 * Note: This is a placeholder as actual stats would require database metrics
 */
const getIntentStats = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Intent statistics not implemented in this version'
  });
});

module.exports = {
  detectIntent,
  getAllIntents,
  getIntentById,
  createIntent,
  updateIntent,
  deleteIntent,
  trainIntentModel,
  createIntentRelationship,
  getIntentStats
}; 