/**
 * A/B Testing routes for the AI Service
 */
const express = require('express');
const router = express.Router();
const abTestController = require('../controllers/abTestController');

/**
 * @route POST /ab-test
 * @desc Create a new A/B test
 * @access Protected
 */
router.post('/', abTestController.createTest);

/**
 * @route GET /ab-test
 * @desc Get all active A/B tests
 * @access Protected
 */
router.get('/', abTestController.getActiveTests);

/**
 * @route GET /ab-test/:id
 * @desc Get a specific test by ID
 * @access Protected
 */
router.get('/:id', abTestController.getTestById);

/**
 * @route GET /ab-test/user/:userId
 * @desc Get a user's test assignments
 * @access Protected
 */
router.get('/user/:userId', abTestController.getUserAssignments);

/**
 * @route POST /ab-test/user/:userId/assign
 * @desc Manually assign user to tests
 * @access Protected
 */
router.post('/user/:userId/assign', abTestController.assignUserToTests);

/**
 * @route GET /ab-test/:id/results
 * @desc Get test results and statistics
 * @access Protected
 */
router.get('/:id/results', abTestController.getTestResults);

/**
 * @route GET /ab-test/:id/significance
 * @desc Calculate test significance
 * @access Protected
 */
router.get('/:id/significance', abTestController.calculateSignificance);

/**
 * @route PUT /ab-test/:id/end
 * @desc End a test (change status to completed)
 * @access Protected
 */
router.put('/:id/end', abTestController.endTest);

module.exports = router; 