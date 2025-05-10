// Global application configuration
const config = {
  // API base URL
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  
  // Map configuration
  MAP: {
    DEFAULT_CENTER: [51.505, -0.09], // London
    DEFAULT_ZOOM: 12,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
};

// Export individual constants for easier access
export const API_BASE_URL = config.API_BASE_URL;
export const MAP_CONFIG = config.MAP;

// Export the full config as default
export default config; 