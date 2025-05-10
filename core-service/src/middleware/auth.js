/**
 * Authentication middleware for the Core Service
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to validate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  // Check if no auth header
  if (!authHeader) {
    throw new ApiError('No authorization token provided', 401);
  }

  // Check token format (Bearer token)
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new ApiError('Authorization format is invalid. Use format: Bearer [token]', 401);
  }

  const token = parts[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    req.logger?.error('Authentication error', { error: error.message });
    
    // Return error if token is invalid
    throw new ApiError('Invalid or expired token', 401);
  }
};

/**
 * Middleware to check if user has required role
 * @param {String|Array} roles - Required role(s)
 * @returns {Function} Middleware function
 */
const roleCheck = (roles) => {
  return (req, res, next) => {
    // User should be set by authMiddleware
    if (!req.user) {
      throw new ApiError('Not authenticated', 401);
    }

    // Convert single role to array for consistent handling
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has required role
    if (req.user.role && requiredRoles.includes(req.user.role)) {
      return next();
    }

    req.logger?.warn('Insufficient permissions', { 
      userId: req.user.id, 
      userRole: req.user.role,
      requiredRoles 
    });

    // Otherwise, user doesn't have permission
    throw new ApiError(`Permission denied. Required role: ${requiredRoles.join(' or ')}`, 403);
  };
};

module.exports = {
  authMiddleware,
  roleCheck
}; 