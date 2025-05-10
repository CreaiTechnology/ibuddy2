const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Import controller (will create this next)
const autoReplyController = require('../controllers/autoReplyController');

// Apply authMiddleware to all routes in this router
router.use(authMiddleware);

// --- Routes for auto-reply rules ---
// GET /api/auto-reply/rules - Get all rules
router.get('/rules', autoReplyController.getAllRules);
// POST /api/auto-reply/rules - Create a new rule
router.post('/rules', autoReplyController.createRule);
// GET /api/auto-reply/rules/:id - Get a specific rule by ID
router.get('/rules/:id', autoReplyController.getRuleById);
// PUT /api/auto-reply/rules/:id - Update a specific rule by ID
router.put('/rules/:id', autoReplyController.updateRule);
// DELETE /api/auto-reply/rules/:id - Delete a specific rule by ID
router.delete('/rules/:id', autoReplyController.deleteRule);

// --- Routes for advanced conditions ---
// GET /api/auto-reply/conditions - Get all conditions
router.get('/conditions', autoReplyController.getAllConditions);
// POST /api/auto-reply/conditions - Create a new condition
router.post('/conditions', autoReplyController.createCondition);
// GET /api/auto-reply/conditions/:id - Get a specific condition by ID
router.get('/conditions/:id', autoReplyController.getConditionById);
// PUT /api/auto-reply/conditions/:id - Update a specific condition by ID
router.put('/conditions/:id', autoReplyController.updateCondition);
// DELETE /api/auto-reply/conditions/:id - Delete a specific condition by ID
router.delete('/conditions/:id', autoReplyController.deleteCondition);

// --- Routes for intent recognition ---
// GET /api/auto-reply/intents - Get all intents
router.get('/intents', autoReplyController.getAllIntents);
// POST /api/auto-reply/intents - Create a new intent
router.post('/intents', autoReplyController.createIntent);
// GET /api/auto-reply/intents/:id - Get a specific intent by ID
router.get('/intents/:id', autoReplyController.getIntentById);
// PUT /api/auto-reply/intents/:id - Update a specific intent by ID
router.put('/intents/:id', autoReplyController.updateIntent);
// DELETE /api/auto-reply/intents/:id - Delete a specific intent by ID
router.delete('/intents/:id', autoReplyController.deleteIntent);

// --- Route for processing incoming messages (Example, needs integration) ---
// POST /api/auto-reply/process-message - Process a message and get a reply
router.post('/process-message', autoReplyController.processIncomingMessage);

/**
 * @route GET /api/auto-reply/stats
 * @desc Get auto-reply usage statistics
 * @access Protected
 */
router.get('/stats', autoReplyController.getStats);

/**
 * @route GET /api/auto-reply/activities
 * @desc Get recent auto-reply activities
 * @access Protected
 */
router.get('/activities', autoReplyController.getActivities);

/**
 * @route GET /api/auto-reply/metrics
 * @desc Get auto-reply performance metrics
 * @access Protected
 */
router.get('/metrics', autoReplyController.getMetrics);

/**
 * @route GET /api/auto-reply/logs
 * @desc Get auto-reply message logs with filtering and pagination
 * @access Protected
 */
router.get('/logs', autoReplyController.getLogs);

module.exports = router; 