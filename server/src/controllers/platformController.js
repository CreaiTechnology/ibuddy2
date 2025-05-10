const platformService = require('../services/platformService');
const platformStrategies = require('../services/platformStrategies');
const jwt = require('jsonwebtoken');

/**
 * Get the user ID from the authorization token or mock value
 * @param {Object} req - Express request object
 * @returns {string} User ID
 */
const getUserId = (req) => {
  // If using Supabase Auth, req.user might be populated differently
  // If using JWT with Supabase as DB, this should work
  if (!req.user?.id) {
    console.error("Auth Middleware Error: User ID not found in request. Ensure authMiddleware runs before this route.");
    // Depending on desired behavior, either throw an error or return null/undefined
    // Throwing an error is generally safer for protected routes.
    throw new Error("User ID not found in authenticated request."); 
  }
  return req.user.id;
};

/**
 * Platform controller for handling platform API requests
 */
const platformController = {
  /**
   * Get all platform statuses for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getPlatformStatus: async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const statuses = await platformService.getPlatformStatus(userId);
      res.json(statuses);
    } catch (error) {
      console.error('Error getting platform status:', error);
      next(error); // Pass error to the error handling middleware
    }
  },
  
  /**
   * Authorize a platform for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  authorizePlatform: async (req, res, next) => {
    try {
      const { platform } = req.params;
      const userId = getUserId(req);
      const authData = req.body;
      
      // // Add platform-specific auth flow - Removed mock code logic
      // // For testing, use authorization code if provided
      // const mockCode = req.query.code || req.body.code || 'mock-auth-code'; 
      const code = req.query.code || req.body.code; // Use the actual code if provided

      // For OAuth platforms like Instagram, the initial 'authorize' call from the frontend
      // might not have the code. The code is obtained after user redirection.
      // The handleAuthCallback endpoint should handle requests with the code.
      // If this endpoint is called for an OAuth platform without a code, return an error.
      // TODO: Consider making this check more generic for all OAuth platforms if needed.
      if (platform === 'instagram' && !code) {
          const err = new Error(`Authorization for ${platform} requires completing the OAuth flow. Use the auth URL endpoint first.`);
          err.status = 400; // Bad Request
          return next(err);
      }

      // Pass authData and code separately, let the service/strategy handle it
      const result = await platformService.authorizePlatform(userId, platform, { ...authData, code });
      
      res.json({
        success: true,
        platform,
        accountInfo: result
      });
    } catch (error) {
      console.error(`Error authorizing platform ${req.params.platform}:`, error);
      next(error); // Pass error to the error handling middleware
    }
  },
  
  /**
   * Handle authorization callback from external platforms
   */
  handleAuthCallback: async (req, res, next) => {
    try {
      const { platform } = req.params;
      const userId = getUserId(req);
      const code = req.query.code;
      
      if (!code) {
        const err = new Error('Authorization code not provided');
        err.status = 400;
        return next(err);
      }
      
      // Process authorization with the provided code
      const result = await platformService.authorizePlatform(userId, platform, { code });
      
      // Redirect to frontend dashboard after successful auth
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/dashboard/platform-api?success=true&platform=${platform}`);
    } catch (error) {
      console.error(`Error handling auth callback for ${req.params.platform}:`, error);
      next(error);
    }
  },
  
  /**
   * Unbind a platform for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  unbindPlatform: async (req, res, next) => {
    try {
      const { platform } = req.params;
      const userId = getUserId(req);
      
      // Send unbind request to platform service
      const result = await platformService.unbindPlatform(userId, platform);
      
      res.json({
        success: true,
        platform,
        ...result
      });
    } catch (error) {
      console.error(`Error unbinding platform ${req.params.platform}:`, error);
      next(error); // Pass error to the error handling middleware
    }
  },
  
  /**
   * Get account info for a platform
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getPlatformAccountInfo: async (req, res, next) => {
    try {
      const { platform } = req.params;
      const userId = getUserId(req);
      
      // Get account info from platform service
      const accountInfo = await platformService.getPlatformAccountInfo(userId, platform);
      
      res.json(accountInfo);
    } catch (error) {
      console.error(`Error getting account info for ${req.params.platform}:`, error);
      if (!res.headersSent) {
         res.status(500).json({ message: `Failed to get account info for ${req.params.platform}.`, error: error.message });
      } else {
         next(error); // Pass to default handler if headers already sent
      }
    }
  },

  /**
   * Generate OAuth URL for a platform (e.g., Facebook)
   * Moved from handleAuthCallback logic to a dedicated controller function
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
   getPlatformAuthUrl: async (req, res, next) => {
    try {
      const { platform } = req.params;
      const userId = getUserId(req); // Although userId might not be strictly needed for URL generation, it's good practice for consistency

      // Check if platform strategy exists and supports getAuthUrl
      if (!platformStrategies[platform] || typeof platformStrategies[platform].getAuthUrl !== 'function') {
        throw new Error(`Platform ${platform} does not support OAuth URL generation or strategy is missing.`);
      }

      // Get the auth URL from the specific platform strategy
      const authUrlDetails = await platformStrategies[platform].getAuthUrl(userId); 

      res.json(authUrlDetails); // Send back the URL (and potentially state)
    } catch (error) {
      console.error(`Error getting auth URL for ${req.params.platform}:`, error);
      next(error);
    }
  },

  // handleAuthCallback remains largely the same, relying on platformService.authorizePlatform
  handleAuthCallback: async (req, res, next) => {
    try {
      const { platform } = req.params;
      const userId = getUserId(req);
      const code = req.query.code;
      
      if (!code) {
        const err = new Error('Authorization code not provided');
        err.status = 400;
        return next(err);
      }
      
      // Process authorization with the provided code
      const result = await platformService.authorizePlatform(userId, platform, { code });
      
      // Redirect to frontend dashboard after successful auth
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/dashboard/platform-api?success=true&platform=${platform}`);
    } catch (error) {
      console.error(`Error handling auth callback for ${req.params.platform}:`, error);
      next(error);
    }
  },

  // GET /api/platforms
  getAllPlatforms: async (req, res) => {
    console.log("Controller: getAllPlatforms called");
    // TODO: Get user ID from authenticated request (via authMiddleware)
    // TODO: Fetch all platforms from a static list or a 'platforms' table
    // TODO: Fetch the connection status for each platform for this specific user from 'user_platform_connections' table
    // TODO: Combine the data and return
    try {
      // Example static data (replace with DB logic)
      const platforms = [
        { id: 'whatsapp', name: 'WhatsApp', category: 'Messaging', description: 'Connect your WhatsApp Business account.', connected: false, accountInfo: null },
        { id: 'messenger', name: 'Facebook Messenger', category: 'Messaging', description: 'Manage conversations on Messenger.', connected: false, accountInfo: null },
        { id: 'shopee', name: 'Shopee', category: 'Ecommerce', description: 'Integrate with your Shopee store.', connected: false, accountInfo: null },
        // ... add other platforms
      ];
      console.log("Controller: Sending mock platform data (implement DB logic!)");
      res.status(200).json(platforms);
    } catch (error) {
      console.error("Error in getAllPlatforms:", error);
      res.status(500).json({ message: "Failed to fetch platforms." });
    }
  },

  // POST /api/platforms/:platformId/connect
  connectPlatform: async (req, res) => {
    const { platformId } = req.params;
    const userId = req.user?.id; // Assuming authMiddleware attaches user object
    console.log(`Controller: connectPlatform called for platform ${platformId} by user ${userId}`);
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    
    // TODO: Implement connection logic (may involve OAuth redirect or storing API keys)
    // TODO: Update the connection status in the 'user_platform_connections' table for this user and platform
    // TODO: Return appropriate response (e.g., success message, or redirect URL for OAuth)
    try {
      console.log(`Controller: Simulating connection success for platform ${platformId}`);
      // Placeholder: Return mock success and updated platform info
      res.status(200).json({
        message: `Successfully connected to ${platformId}.`, 
        platform: { 
          id: platformId, 
          name: platformId.charAt(0).toUpperCase() + platformId.slice(1), // Simple name generation
          category: 'Unknown', 
          description: `Connected account for ${platformId}.`, 
          connected: true, 
          accountInfo: { name: `Mock ${platformId} Account` } // Mock account info
        }
      });
    } catch (error) {
      console.error(`Error connecting platform ${platformId}:`, error);
      res.status(500).json({ message: `Failed to connect to ${platformId}.` });
    }
  },

  // POST /api/platforms/:platformId/disconnect
  disconnectPlatform: async (req, res) => {
    const { platformId } = req.params;
    const userId = req.user?.id; // Assuming authMiddleware attaches user object
    console.log(`Controller: disconnectPlatform called for platform ${platformId} by user ${userId}`);
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // TODO: Implement disconnection logic (e.g., remove stored tokens/keys)
    // TODO: Update the connection status in the 'user_platform_connections' table for this user and platform
    // TODO: Return success message
    try {
      console.log(`Controller: Simulating disconnection success for platform ${platformId}`);
      // Placeholder: Return mock success
      res.status(200).json({ message: `Successfully disconnected from ${platformId}.` });
    } catch (error) {
      console.error(`Error disconnecting platform ${platformId}:`, error);
      res.status(500).json({ message: `Failed to disconnect from ${platformId}.` });
    }
  },
};

module.exports = platformController; 