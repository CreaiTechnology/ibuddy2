/**
 * Auto-reply routes for the AI Service
 */
const express = require('express');
const router = express.Router();
const autoReplyController = require('../controllers/autoReplyController');

/**
 * @route POST /auto-reply/process
 * @desc Process a message and get an automated reply
 * @access Protected
 */
router.post('/process', autoReplyController.processMessage);

/**
 * @route GET /auto-reply/rules
 * @desc Get all auto-reply rules
 * @access Protected
 */
router.get('/rules', autoReplyController.getAllRules);

/**
 * @route GET /auto-reply/rules/:id
 * @desc Get a specific rule by ID
 * @access Protected
 */
router.get('/rules/:id', autoReplyController.getRuleById);

/**
 * @route POST /auto-reply/rules
 * @desc Create a new rule
 * @access Protected
 */
router.post('/rules', autoReplyController.createRule);

/**
 * @route PUT /auto-reply/rules/:id
 * @desc Update a specific rule
 * @access Protected
 */
router.put('/rules/:id', autoReplyController.updateRule);

/**
 * @route DELETE /auto-reply/rules/:id
 * @desc Delete a specific rule
 * @access Protected
 */
router.delete('/rules/:id', autoReplyController.deleteRule);

/**
 * @route GET /auto-reply/conditions
 * @desc Get all conditions
 * @access Protected
 */
router.get('/conditions', autoReplyController.getAllConditions);

/**
 * @route GET /auto-reply/conditions/:id
 * @desc Get a specific condition by ID
 * @access Protected
 */
router.get('/conditions/:id', autoReplyController.getConditionById);

/**
 * @route POST /auto-reply/conditions
 * @desc Create a new condition
 * @access Protected
 */
router.post('/conditions', autoReplyController.createCondition);

/**
 * @route PUT /auto-reply/conditions/:id
 * @desc Update a specific condition
 * @access Protected
 */
router.put('/conditions/:id', autoReplyController.updateCondition);

/**
 * @route DELETE /auto-reply/conditions/:id
 * @desc Delete a specific condition
 * @access Protected
 */
router.delete('/conditions/:id', autoReplyController.deleteCondition);

/**
 * @route GET /auto-reply/stats
 * @desc Get auto-reply usage statistics
 * @access Protected
 */
router.get('/stats', autoReplyController.getStats);

module.exports = router; 