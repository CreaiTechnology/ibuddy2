const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming we'll have this

// Create a separate router for public routes (only callback needs to be public)
const publicRouter = express.Router();

// Apply auth middleware to protected routes first
router.use(authMiddleware);

/**
 * @route GET /api/platforms/:platform/auth-url
 * @desc Generate OAuth URL for a platform (e.g., Facebook)
 * @access Private - Requires authentication to generate user-specific or logged URL
 */
router.get('/:platform/auth-url', platformController.getPlatformAuthUrl);

/**
 * @route GET /api/platforms/:platform/callback
 * @desc Handle authorization callback from external platforms
 * @access Public - Callback URL is hit by the external platform
 */
publicRouter.get('/:platform/callback', platformController.handleAuthCallback);

/**
 * @route GET /api/platforms/status
 * @desc Get status of all platforms for the current user
 * @access Private
 */
router.get('/status', platformController.getPlatformStatus);

/**
 * @route POST /api/platforms/:platform/authorize
 * @desc Authorize a platform for the current user
 * @access Private
 */
router.post('/:platform/authorize', platformController.authorizePlatform);

/**
 * @route POST /api/platforms/:platform/unbind
 * @desc Unbind a platform for the current user
 * @access Private
 */
router.post('/:platform/unbind', platformController.unbindPlatform);

/**
 * @route GET /api/platforms/:platform/account
 * @desc Get account info for a platform
 * @access Private
 */
router.get('/:platform/account', platformController.getPlatformAccountInfo);

// GET /api/platforms - Fetch all platforms and their status for the authenticated user
router.get('/', platformController.getAllPlatforms);

// POST /api/platforms/:platformId/connect - Connect a platform for the user
router.post('/:platformId/connect', platformController.connectPlatform);

// POST /api/platforms/:platformId/disconnect - Disconnect a platform for the user
router.post('/:platformId/disconnect', platformController.disconnectPlatform);

// GET /api/platforms/categories - (Optional) Fetch platform categories
// router.get('/categories', platformController.getPlatformCategories);

// Combine the routers and export
const combinedRouter = express.Router();
combinedRouter.use(router); // Apply authenticated routes first
combinedRouter.use(publicRouter); // Apply public routes

module.exports = combinedRouter; 