/**
 * Analytics routes for the AI Service
 */
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

/**
 * @route GET /analytics/model-usage
 * @desc Get model usage statistics
 * @access Protected
 */
router.get('/model-usage', analyticsController.getModelUsageStats);

/**
 * @route POST /analytics/response
 * @desc Record response metrics
 * @access Protected
 */
router.post('/response', analyticsController.recordResponseMetrics);

module.exports = router; 