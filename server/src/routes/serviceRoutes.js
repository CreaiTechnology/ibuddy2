const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all service routes
// Assuming fetching services requires login
router.use(authMiddleware);

// GET /api/services - Fetch all services
router.get('/', serviceController.getAllServices);

// Add other service-related routes here if needed in the future
// e.g., GET /api/services/:id, POST /api/services, etc.

module.exports = router; 