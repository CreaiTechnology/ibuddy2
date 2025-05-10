/**
 * Global error handling middleware
 */

/**
 * Custom API error with status code and message
 */
class ApiError extends Error {
  /**
   * Create an API Error
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code
   * @param {Object} data - Additional error data
   */
  constructor(message, statusCode = 500, data = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errorData = err.data || {};
  
  // Log the error
  req.logger?.error(`Error: ${message}`, {
    statusCode,
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'unauthenticated',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ...errorData
  });
  
  // Check specific error types and adjust response
  if (err.name === 'ValidationError') {
    // Handle validation errors
    statusCode = 400;
    message = 'Validation error';
    errorData = { validation: err.errors || err.message };
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    // Handle JWT errors
    statusCode = 401;
    message = 'Authentication error';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    // Handle connection errors to external services
    statusCode = 503;
    message = 'Service unavailable';
  } else if (err.code === '23505') {
    // Handle Postgres unique violation
    statusCode = 409;
    message = 'Duplicate entry';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    error: errorData,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

/**
 * 404 Not Found error handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  req.logger?.warn(`Resource not found: ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.originalUrl
  });
};

/**
 * Async function wrapper to avoid try-catch blocks
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Middleware function that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler
}; 