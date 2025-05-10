/**
 * Base Platform Strategy
 * A template for other platform strategies to extend for testing purposes
 */

/**
 * Create a base platform strategy with common methods
 * @param {string} platformName - Name of the platform
 * @returns {Object} A base strategy object with mock implementation
 */
const createBaseStrategy = (platformName) => {
  return {
    /**
     * Authorize platform for a user
     * @param {string} userId - User ID
     * @param {Object} authData - Authorization data
     * @returns {Object} Authorization result
     */
    authorize: async (userId, authData = {}) => {
      console.log(`[MOCK] Authorizing ${platformName} for user ${userId}`, authData);
      
      // Generate mock data
      const accountId = `${platformName}-account-${Date.now()}`;
      const accountName = `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} Demo Account`;
      const accessToken = `${platformName}-token-${Date.now()}`;
      const refreshToken = `${platformName}-refresh-${Date.now()}`;
      
      // Set expiration to 60 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);
      
      return {
        accountId,
        accountName,
        accessToken,
        refreshToken,
        expiresAt: expiresAt.toISOString(),
        metadata: {
          scope: `${platformName}_basic_access`
        }
      };
    },
    
    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @param {string} accessToken - Current access token
     * @param {string} refreshToken - Current refresh token
     * @returns {Object} New tokens and expiration
     */
    refreshToken: async (userId, accessToken, refreshToken) => {
      console.log(`[MOCK] Refreshing ${platformName} token for user ${userId}`);
      
      // Generate new mock tokens
      const newAccessToken = `${platformName}-token-refreshed-${Date.now()}`;
      const newRefreshToken = `${platformName}-refresh-${Date.now()}`;
      
      // Set expiration to 60 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString()
      };
    },
    
    /**
     * Revoke platform access
     * @param {string} userId - User ID
     * @param {Object} platform - Platform data from database
     * @returns {boolean} Success status
     */
    revokeAccess: async (userId, platform) => {
      console.log(`[MOCK] Revoking ${platformName} access for user ${userId}`);
      return true;
    }
  };
};

module.exports = createBaseStrategy; 