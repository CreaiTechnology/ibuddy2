const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase'); // <-- Import Supabase backend client

/**
 * Middleware to protect routes requiring authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = async (req, res, next) => { // <-- Make the function async
  // If supabase is not initialized, use development fallback
  if (!supabase && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ AUTH BYPASSED: Supabase client not initialized and running in development mode');
    req.user = { id: process.env.MOCK_USER_ID || '64a1b2c3d4e5f6a7b8c9d0e1' };
    return next();
  } else if (!supabase) {
    return res.status(503).json({
      success: false,
      message: 'Authentication service unavailable'
    });
  }

  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // Check if token exists
  if (!token) {
    // For development, proceed without authentication
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.warn('⚠️ AUTH BYPASSED: Running in development mode with BYPASS_AUTH=true');
      // Set a mock user ID for development
      req.user = { id: process.env.MOCK_USER_ID || '64a1b2c3d4e5f6a7b8c9d0e1' };
      return next();
    }
    
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }
  
  try {
    // === Replace jwt.verify with Supabase validation ===
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Supabase token validation error:', error.message);
      // Throw an error to be caught by the catch block
      throw new Error('Invalid token or Supabase error.');
    }

    if (!user) {
        // This case might happen if token is valid but user doesn't exist? Unlikely but possible.
        throw new Error('Invalid token: User not found.');
    }

    // Attach user information to the request object
    // Supabase returns the user object directly
    req.user = user;
    // === End of Supabase validation ===

    next();
  } catch (error) {
    // Allow development bypass even if an invalid token is provided
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      console.warn('⚠️ AUTH BYPASSED (in catch): Running in development mode with BYPASS_AUTH=true');
      // Set a mock user ID for development
      req.user = { id: process.env.MOCK_USER_ID || '64a1b2c3d4e5f6a7b8c9d0e1' };
      return next();
    }
    
    // Log the actual error for debugging
    console.error("Authentication Error:", error.message);

    res.status(401).json({
      success: false,
      // Provide a slightly more specific message if possible
      message: error.message.includes('JWT expired') ? 'Token expired.' : 'Invalid token.'
    });
  }
};

module.exports = authMiddleware; 