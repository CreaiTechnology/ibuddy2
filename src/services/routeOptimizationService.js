import axios from 'axios';

const API_URL = '/api/routes'; // Or your full backend URL if different

/**
 * Calls the backend to optimize the route and fetch geometry.
 * @param {object} payload The request body, e.g., { waypoints, startPointId?, endPointId?, profile? }
 * @returns {Promise<object>} The API response data (optimizedWaypoints, routeGeometry, message).
 */
const optimizeRoute = async (payload) => {
  try {
    const response = await axios.post(`${API_URL}/optimize`, payload);
    return response.data; // Expected: { message, optimizedWaypoints, routeGeometry }
  } catch (error) {
    console.error('Error calling optimize route API:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue during route optimization.');
  }
};

export const routeOptimizationService = {
  optimizeRoute,
}; 