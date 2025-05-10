/**
 * Authentication middleware for protecting routes
 */
const jwt = require('jsonwebtoken');

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
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided'
    });
  }

  // Check token format (Bearer token)
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Authorization format is invalid. Use format: Bearer [token]'
    });
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
    // Return error if token is invalid
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
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
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Convert single role to array for consistent handling
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has required role
    if (req.user.role && requiredRoles.includes(req.user.role)) {
      return next();
    }

    // Otherwise, user doesn't have permission
    return res.status(403).json({
      success: false,
      message: 'Permission denied. Required role: ' + requiredRoles.join(' or ')
    });
  };
};

module.exports = {
  authMiddleware,
  roleCheck
}; 