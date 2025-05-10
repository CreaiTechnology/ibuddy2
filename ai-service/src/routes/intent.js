/**
 * Intent routes for the AI Service
 */
const express = require('express');
const router = express.Router();
const intentController = require('../controllers/intentController');

/**
 * @route POST /intent/detect
 * @desc Detect user intent from message
 * @access Protected
 */
router.post('/detect', intentController.detectIntent);

/**
 * @route GET /intent
 * @desc Get all intents
 * @access Protected
 */
router.get('/', intentController.getAllIntents);

/**
 * @route GET /intent/:id
 * @desc Get a specific intent by ID
 * @access Protected
 */
router.get('/:id', intentController.getIntentById);

/**
 * @route POST /intent
 * @desc Create a new intent
 * @access Protected
 */
router.post('/', intentController.createIntent);

/**
 * @route PUT /intent/:id
 * @desc Update a specific intent
 * @access Protected
 */
router.put('/:id', intentController.updateIntent);

/**
 * @route DELETE /intent/:id
 * @desc Delete a specific intent
 * @access Protected
 */
router.delete('/:id', intentController.deleteIntent);

/**
 * @route POST /intent/train
 * @desc Trigger intent model training
 * @access Protected
 */
router.post('/train', intentController.trainIntentModel);

/**
 * @route POST /intent/relationship
 * @desc Create a relationship between intents
 * @access Protected
 */
router.post('/relationship', intentController.createIntentRelationship);

/**
 * @route GET /intent/stats
 * @desc Get intent detection statistics
 * @access Protected
 */
router.get('/stats', intentController.getIntentStats);

module.exports = router; 