const express = require('express');
const router = express.Router();
const brandProfileController = require('../controllers/brandProfileController');
const authMiddleware = require('../middleware/auth');

/**
 * @route   GET /api/brand-profile
 * @desc    Get the current user's brand profile
 * @access  Private
 */
router.get('/', authMiddleware, brandProfileController.getProfile);

/**
 * @route   PUT /api/brand-profile
 * @desc    Create or update the current user's brand profile
 * @access  Private
 */
router.put('/', authMiddleware, brandProfileController.upsertProfile);

/**
 * @route   POST /api/brand-profile
 * @desc    Create or update the current user's brand profile (Alias for PUT)
 * @access  Private
 */
router.post('/', authMiddleware, brandProfileController.upsertProfile);

module.exports = router; 