/**
 * Chat routes for the AI Service
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

/**
 * @route POST /chat/message
 * @desc Send a message to the AI and get a response
 * @access Protected
 */
router.post('/message', chatController.processMessage);

/**
 * @route GET /chat/history/:userId
 * @desc Get chat history for a user
 * @access Protected
 * @query {string} sessionId - Optional session ID
 * @query {string} memoryLevel - Memory level (short/mid/long)
 * @query {number} limit - Max items to return
 * @query {number} offset - Pagination offset
 */
router.get('/history/:userId', chatController.getChatHistory);

/**
 * @route DELETE /chat/history/:userId
 * @desc Clear chat history for a user
 * @access Protected
 * @query {string} sessionId - Optional session ID
 * @query {string} memoryLevel - Memory level to clear (short/mid/long/all)
 */
router.delete('/history/:userId', chatController.clearChatHistory);

/**
 * @route GET /chat/context/:userId
 * @desc Get the current context for a user
 * @access Protected
 * @query {string} sessionId - Optional session ID
 */
router.get('/context/:userId', chatController.getUserContext);

/**
 * @route GET /chat/context-summary/:userId
 * @desc Get a summary of user context optimized for AI use
 * @access Protected
 * @query {string} sessionId - Optional session ID
 */
router.get('/context-summary/:userId', chatController.getContextSummary);

/**
 * @route PUT /chat/preferences/:userId
 * @desc Update user preferences
 * @access Protected
 */
router.put('/preferences/:userId', chatController.updateUserPreferences);

/**
 * @route POST /chat/feedback
 * @desc Submit feedback for a specific chat message
 * @access Protected
 */
router.post('/feedback', chatController.submitFeedback);

module.exports = router; 