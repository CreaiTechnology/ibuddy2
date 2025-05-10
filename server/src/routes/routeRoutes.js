const express = require('express');
const { routeController } = require('../controllers/routeController.js');
// const { authMiddleware } = require('../middleware/authMiddleware.js'); // Assuming you might want to protect this route

const router = express.Router();

/**
 * @swagger
 * /api/routes/optimize:
 *   post:
 *     summary: Optimizes waypoint order and fetches route geometry from Mapbox.
 *     tags: [Routes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               waypoints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: 
 *                       type: string
 *                       description: Unique identifier for the waypoint.
 *                     latitude:
 *                       type: number
 *                       format: double
 *                     longitude:
 *                       type: number
 *                       format: double
 *                     name: 
 *                       type: string
 *                       description: Optional name for the waypoint.
 *                 minItems: 2
 *                 description: Array of waypoints to optimize.
 *               startPointId:
 *                 type: string
 *                 description: Optional ID of the waypoint to be the fixed starting point.
 *               endPointId:
 *                 type: string
 *                 description: Optional ID of the waypoint to be the fixed ending point.
 *               profile:
 *                 type: string
 *                 default: driving-traffic
 *                 enum: [driving-traffic, driving, walking, cycling]
 *                 description: Mapbox routing profile.
 *             required:
 *               - waypoints
 *     responses:
 *       200:
 *         description: Route optimized successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 optimizedWaypoints:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Waypoint' # Assuming Waypoint schema is defined elsewhere for swagger
 *                 routeGeometry:
 *                   type: object # Or string, depending on what Mapbox returns / you process
 *                   description: Geometry of the optimized route (e.g., GeoJSON from Mapbox).
 *       400:
 *         description: Bad request (e.g., insufficient waypoints, invalid waypoint structure).
 *       500:
 *         description: Internal server error.
 */
// router.post('/optimize', authMiddleware, routeController.getOptimizedRoute); // Example with auth
router.post('/optimize', routeController.getOptimizedRoute);

module.exports = router; 