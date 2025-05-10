/**
 * Analytics middleware for AI Service
 * Automatically records model usage metrics
 */
const analyticsService = require('../services/analyticsService');

/**
 * Middleware to automatically record model usage
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function recordModelUsage(req, res, next) {
  // Get the original end method
  const originalEnd = res.end;
  
  // Store start time
  const startTime = Date.now();
  
  // Override the end method
  res.end = function(chunk, encoding) {
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Restore the original end method and call it
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Extract relevant data from the request/response
    try {
      // Only record for successful AI responses
      if (res.statusCode >= 200 && res.statusCode < 300 && req.path.includes('/chat')) {
        const responseBody = res._responseBody;
        
        if (responseBody && responseBody.model) {
          // Record the model usage asynchronously (don't wait for it)
          analyticsService.recordModelUsage({
            model: responseBody.model,
            messageId: responseBody.messageId,
            userId: req.body.userId,
            processingTime,
            success: true,
            // Add token counts if available
            tokensInput: responseBody.tokensInput,
            tokensOutput: responseBody.tokensOutput
          }).catch(err => {
            console.error('Error recording model usage metrics:', err);
          });
        }
      }
    } catch (err) {
      console.error('Error in analytics middleware:', err);
    }
  };
  
  // Capture the response body
  const originalJson = res.json;
  res.json = function(body) {
    res._responseBody = body;
    return originalJson.call(this, body);
  };
  
  next();
}

module.exports = {
  recordModelUsage
}; 