const mapService = require('../services/mapService.js');

const routeController = {
  /**
   * Optimizes the order of waypoints and fetches the route geometry.
   * Expects a request body like:
   * {
   *   "waypoints": [
   *     { "id": "start", "latitude": 40.7128, "longitude": -74.0060, "name": "New York" },
   *     { "id": "1", "latitude": 34.0522, "longitude": -118.2437, "name": "Los Angeles" },
   *     { "id": "2", "latitude": 41.8781, "longitude": -87.6298, "name": "Chicago" },
   *     { "id": "end", "latitude": 29.7604, "longitude": -95.3698, "name": "Houston" }
   *   ],
   *   "startPointId": "start", // Optional: ID of the waypoint to be the starting point
   *   "endPointId": "end"      // Optional: ID of the waypoint to be the ending point
   *   "profile": "driving-traffic" // Optional: Mapbox profile (driving, walking, cycling, driving-traffic)
   * }
   */
  async getOptimizedRoute(req, res) {
    const { waypoints, startPointId, endPointId, profile = 'driving-traffic' } = req.body;

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ message: 'At least two waypoints are required.' });
    }

    // Validate waypoints structure
    for (const wp of waypoints) {
      if (typeof wp.latitude !== 'number' || typeof wp.longitude !== 'number' || !wp.id) {
        return res.status(400).json({ message: 'Each waypoint must have an id, latitude (number), and longitude (number).' });
      }
    }

    let startPointIndex = 0; // Default to the first waypoint in the provided array
    if (startPointId) {
        const foundIndex = waypoints.findIndex(wp => wp.id === startPointId);
        if (foundIndex === -1) {
            return res.status(400).json({ message: `Start point ID "${startPointId}" not found in waypoints.` });
        }
        startPointIndex = foundIndex;
    }

    let endPointIndex = null; // Default to no fixed end point
    if (endPointId) {
        if (startPointId === endPointId) {
             return res.status(400).json({ message: 'Start and End point IDs cannot be the same if both are specified.' });
        }
        const foundIndex = waypoints.findIndex(wp => wp.id === endPointId);
        if (foundIndex === -1) {
            return res.status(400).json({ message: `End point ID "${endPointId}" not found in waypoints.` });
        }
        endPointIndex = foundIndex;
    }

    try {
      console.log('[RouteController] Optimizing route order...');
      const optimizedWaypoints = await mapService.optimizeRouteOrder(waypoints, startPointIndex, endPointIndex);
      console.log('[RouteController] Optimized order:', optimizedWaypoints.map(wp => wp.id));

      console.log('[RouteController] Fetching route geometry from Mapbox...');
      const routeGeometry = await mapService.getRouteWithMapboxAndCache(optimizedWaypoints, profile);

      if (!routeGeometry || routeGeometry.error) { // Check for our error flag from mapService
        console.warn('[RouteController] mapService.getRouteWithMapboxAndCache returned null or an error. Check implementation.', routeGeometry);
         return res.status(500).json({ 
            message: routeGeometry ? routeGeometry.message : 'Failed to retrieve route geometry from routing service. The route optimization part might have succeeded.',
            optimizedWaypoints 
        });
      }

      res.status(200).json({
        message: 'Route optimized successfully.',
        optimizedWaypoints,
        routeGeometry,
      });
    } catch (error) {
      console.error('[RouteController] Error in getOptimizedRoute:', error);
      res.status(500).json({ message: 'Error optimizing route.', error: error.message });
    }
  },
};

module.exports = { routeController }; 