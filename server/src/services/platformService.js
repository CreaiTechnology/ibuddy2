const supabase = require('../config/supabase');
const platformStrategies = require('./platformStrategies');

const PLATFORMS_TABLE = 'platforms';

/**
 * Checks if Supabase is configured and available.
 * Throws an error if not configured in production.
 */
const checkSupabase = () => {
  if (!supabase) {
    const message = 'Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY.';
    console.error(message);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn('Running without database connection in development.');
    }
  }
  return !!supabase; // Return true if configured, false otherwise
};

/**
 * Platform service handling operations for different platform integrations using Supabase
 */
const platformService = {
  /**
   * Get the status of all platforms for a user
   * @param {string} userId - User ID (Supabase auth user ID)
   * @returns {Object} Object with platforms as keys and connection status as values
   */
  getPlatformStatus: async (userId) => {
    if (!checkSupabase()) {
      // Return default status if Supabase is not configured (dev mode)
      return {
        whatsapp: false, messenger: false, shopee: false, lazada: false, 
        telegram: false, gmail: false, facebook: false, instagram: false, 
        xiaohongshu: false, _isMockData: true 
      };
    }

    try {
      const { data: platforms, error } = await supabase
        .from(PLATFORMS_TABLE)
        .select('platform_type')
        .eq('user_id', userId)
        .eq('is_active', true);
        
      if (error) throw error;
      
      // Initialize status map
      const statusMap = {
        whatsapp: false, messenger: false, shopee: false, lazada: false, 
        telegram: false, gmail: false, facebook: false, instagram: false, 
        xiaohongshu: false
      };
      
      // Mark connected platforms as true
      platforms.forEach(platform => {
        if (statusMap.hasOwnProperty(platform.platform_type)) {
          statusMap[platform.platform_type] = true;
        }
      });
      
      return statusMap;
    } catch (error) {
      console.error('Supabase error getting platform status:', error);
      throw error;
    }
  },
  
  /**
   * Authorize a platform for a user
   * @param {string} userId - User ID
   * @param {string} platformType - Type of platform
   * @param {Object} authData - Authorization data
   * @returns {Object} Platform account information
   */
  authorizePlatform: async (userId, platformType, authData = {}) => {
     if (!checkSupabase()) {
      // Simulate success if Supabase is not configured (dev mode)
      console.warn(`[MOCK DB] Authorizing ${platformType} for user ${userId}`);
      return {
        id: `${platformType}-mock-account-${Date.now()}`,
        name: `${platformType.charAt(0).toUpperCase() + platformType.slice(1)} Mock Account`,
        connectedAt: new Date().toISOString(),
        platformType: platformType,
        _isMockData: true
      };
    }
    
    try {
      // Check if platform strategy exists
      if (!platformStrategies[platformType]) {
        throw new Error(`Platform ${platformType} is not supported`);
      }
      
      // Use the platform-specific strategy to authorize
      const authResult = await platformStrategies[platformType].authorize(userId, authData);
      
      // Prepare data for Supabase upsert (update or insert)
      const platformData = {
        user_id: userId,
        platform_type: platformType,
        account_id: authResult.accountId,
        account_name: authResult.accountName,
        access_token: authResult.accessToken,
        refresh_token: authResult.refreshToken,
        token_expires_at: authResult.expiresAt ? new Date(authResult.expiresAt).toISOString() : null,
        metadata: authResult.metadata || {},
        is_active: true,
        last_updated_at: new Date().toISOString()
        // connected_at and created_at are handled by database defaults or triggers
      };
      
      // Upsert the record
      const { data, error } = await supabase
        .from(PLATFORMS_TABLE)
        .upsert(platformData, { onConflict: 'user_id, platform_type' })
        .select('account_id, account_name, connected_at, platform_type') // Select the fields needed for the response
        .single(); // Expecting a single record

      if (error) throw error;
      if (!data) throw new Error('Upsert operation did not return data.');
      
      // Return structured account info
      return {
        id: data.account_id,
        name: data.account_name,
        connectedAt: data.connected_at,
        platformType: data.platform_type
      };
    } catch (error) {
      console.error(`Supabase error authorizing ${platformType}:`, error);
      throw error;
    }
  },
  
  /**
   * Unbind a platform connection for a user
   * @param {string} userId - User ID
   * @param {string} platformType - Type of platform
   * @returns {Object} Result of unbinding
   */
  unbindPlatform: async (userId, platformType) => {
    if (!checkSupabase()) {
      console.warn(`[MOCK DB] Unbinding ${platformType} for user ${userId}`);
      return { success: true, platform: platformType, _isMockData: true };
    }
    
    try {
      // Check if platform strategy exists
      if (!platformStrategies[platformType]) {
        throw new Error(`Platform ${platformType} is not supported`);
      }
      
      // Find platform record to get info for revokeAccess (optional but good practice)
      const { data: platform, error: findError } = await supabase
        .from(PLATFORMS_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('platform_type', platformType)
        .eq('is_active', true)
        .maybeSingle(); // It might not exist

      if (findError) throw findError;
      
      if (!platform) {
        throw new Error(`Platform ${platformType} is not connected or already inactive for this user`);
      }
      
      // Use platform-specific strategy to revoke access if needed
      try {
        await platformStrategies[platformType].revokeAccess(userId, platform); // Pass Supabase row data
      } catch (revokeError) {
        console.warn(`Failed to revoke access for ${platformType}, continuing with database unbinding:`, revokeError);
      }
      
      // Mark platform as inactive in Supabase
      const { error: updateError } = await supabase
        .from(PLATFORMS_TABLE)
        .update({ is_active: false, last_updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('platform_type', platformType);

      if (updateError) throw updateError;
      
      return {
        success: true,
        platform: platformType
      };
    } catch (error) {
      console.error(`Supabase error unbinding ${platformType}:`, error);
      throw error;
    }
  },
  
  /**
   * Get account information for a connected platform
   * @param {string} userId - User ID
   * @param {string} platformType - Type of platform
   * @returns {Object} Platform account information
   */
  getPlatformAccountInfo: async (userId, platformType) => {
    if (!checkSupabase()) {
       console.warn(`[MOCK DB] Getting account info for ${platformType} for user ${userId}`);
       return {
        id: `${platformType}-mock-account-${Date.now()}`,
        name: `${platformType.charAt(0).toUpperCase() + platformType.slice(1)} Mock Account`,
        connectedAt: new Date().toISOString(),
        platformType: platformType,
        _isMockData: true
      };
    }
    
    try {
      // Check if platform strategy exists
      if (!platformStrategies[platformType]) {
        throw new Error(`Platform ${platformType} is not supported`);
      }
      
      // Find active platform record
      let { data: platform, error: findError } = await supabase
        .from(PLATFORMS_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('platform_type', platformType)
        .eq('is_active', true)
        .single();

      if (findError) {
        if (findError.code === 'PGRST116') { // code for no rows found
           throw new Error(`Platform ${platformType} is not connected for this user`);
        }
        throw findError;
      }
      
      // Check if token refresh is needed
      if (platform.token_expires_at && new Date(platform.token_expires_at) < new Date() && platform.refresh_token) {
        try {
          const refreshResult = await platformStrategies[platformType].refreshToken(
            userId, 
            platform.access_token,
            platform.refresh_token
          );
          
          // Prepare data for update
          const updateData = {
            access_token: refreshResult.accessToken,
            refresh_token: refreshResult.refreshToken || platform.refresh_token,
            token_expires_at: refreshResult.expiresAt ? new Date(refreshResult.expiresAt).toISOString() : null,
            last_updated_at: new Date().toISOString()
          };
          
          // Update token information in Supabase
          const { data: updatedPlatform, error: updateError } = await supabase
             .from(PLATFORMS_TABLE)
             .update(updateData)
             .eq('id', platform.id) // Use the primary key for update
             .select('*')
             .single();

          if (updateError) throw updateError;
          platform = updatedPlatform; // Use the updated data

        } catch (refreshError) {
          console.warn(`Failed to refresh token for ${platformType}:`, refreshError);
          // Continue with existing (potentially expired) token info, but log warning
        }
      }
      
      // Return structured account info
      return {
        id: platform.account_id,
        name: platform.account_name,
        connectedAt: platform.connected_at,
        platformType: platform.platform_type
      };
    } catch (error) {
      console.error(`Supabase error getting account info for ${platformType}:`, error);
      throw error;
    }
  }
};

// Placeholder for platform-specific credentials retrieval
// In a real application, this would fetch securely stored credentials (e.g., from a database)
const getCredentials = (userId, platform) => {
    console.log(`[Placeholder] Checking credentials for user ${userId}, platform ${platform}`);
    // Simulate fetching credentials
    // Replace with actual database lookup based on userId and platform
    const mockCredentials = {
        facebook: { userId: userId, accessToken: 'fb-mock-token-for-' + userId, pageId: 'mock-page-123' },
        whatsapp: { userId: userId, apiKey: 'wa-mock-key-for-' + userId, apiSecret: 'shhh' },
        shopee: { userId: userId, shopId: 'shopee-mock-shop-' + userId, apiKey: 'shopee-key' },
        // Add other platforms as needed
    };

    if (mockCredentials[platform.toLowerCase()]) {
        console.log(`[Placeholder] Found credentials for ${platform}.`);
        return mockCredentials[platform.toLowerCase()];
    } else {
        console.warn(`[Placeholder] No credentials configured for platform: ${platform}`);
        return null;
    }
};

// Placeholder function to simulate posting to a specific platform API
const postToPlatformAPI = async (platform, credentials, message) => {
    console.log(`[Placeholder] Simulating API call to ${platform} with message: "${message.substring(0, 50)}..."`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)); // 0.5-1.5 seconds delay
    
    // Simulate potential errors for specific platforms or randomly
    if (platform.toLowerCase() === 'shopee' && Math.random() < 0.3) { // 30% chance of Shopee failing
        console.error(`[Placeholder] Simulated API error for ${platform}`);
        throw new Error(`Simulated API Error: Failed to update Shopee listing.`);
    } 
    if (Math.random() < 0.1) { // 10% chance of random failure for other platforms
         console.error(`[Placeholder] Simulated random API error for ${platform}`);
        throw new Error(`Simulated Random API Error for ${platform}.`);
    }
    
    // Simulate successful post
    console.log(`[Placeholder] Simulated successful post to ${platform}.`);
    return {
        success: true,
        postId: `${platform}-post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        // Add any other relevant info from a real API response
    };
};

/**
 * Posts content to a specific platform for a given user.
 * This function orchestrates fetching credentials and calling the platform API.
 * 
 * @param {string} userId - The ID of the user posting the content.
 * @param {string} platform - The name of the target platform (e.g., 'facebook', 'whatsapp').
 * @param {string} message - The content to be posted.
 * @returns {Promise<object>} - A promise that resolves to a result object 
 *                            { success: boolean, platform: string, message?: string, error?: string, postId?: string }
 */
const postContent = async (userId, platform, message) => {
    // If a platform-specific strategy exists, use it for posting
    if (platformStrategies[platform] && typeof platformStrategies[platform].postContent === 'function') {
        try {
            if (!checkSupabase()) {
                throw new Error('Supabase client not initialized for posting.');
            }
            // Fetch the active platform configuration for this user
            const { data: platformData, error: fetchError } = await supabase
                .from(PLATFORMS_TABLE)
                .select('*')
                .eq('user_id', userId)
                .eq('platform_type', platform)
                .eq('is_active', true)
                .single();
            if (fetchError || !platformData) {
                throw fetchError || new Error(`No active configuration for platform: ${platform}`);
            }
            // Delegate actual posting to the platform strategy
            const result = await platformStrategies[platform].postContent(
                userId,
                platformData,
                { message }
            );
            return {
                success: result.success,
                platform,
                message: result.message,
                postId: result.postId,
                error: result.error
            };
        } catch (error) {
            console.error(`[PlatformService] Strategy postContent error for ${platform}:`, error);
            return {
                success: false,
                platform,
                error: error.message || `Strategy postContent failed for platform: ${platform}`
            };
        }
    }
    // Fallback to placeholder logic for other platforms
    const credentials = getCredentials(userId, platform);
    if (!credentials) {
        return {
            success: false,
            platform,
            error: `Platform '${platform}' is not configured or credentials not found.`
        };
    }
    try {
        const apiResponse = await postToPlatformAPI(platform, credentials, message);
        return {
            success: true,
            platform,
            message: `Successfully posted to ${platform}.`,
            postId: apiResponse.postId
        };
    } catch (error) {
        console.error(`[PlatformService] Error during postToPlatformAPI for ${platform}:`, error);
        return {
            success: false,
            platform,
            error: error.message || `An unknown error occurred while posting to ${platform}.`
        };
    }
};

// Attach postContent to the platformService object
platformService.postContent = postContent;
// Export the full platformService API
module.exports = platformService; 