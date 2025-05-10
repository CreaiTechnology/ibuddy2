/**
 * Instagram Platform Integration Strategy
 */

const axios = require('axios');
const { URLSearchParams } = require('url');

// Instagram API Configuration
const config = {
  apiBase: process.env.INSTAGRAM_API_BASE || 'https://graph.facebook.com/v19.0',
  clientId: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID || 'test-client-id',
  clientSecret: process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET || 'test-client-secret',
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3001/api/platforms/instagram/callback'
};

/**
 * Instagram platform strategy
 */
const instagramStrategy = {
  /**
   * Authorize Instagram for a user
   * @param {string} userId - User ID
   * @param {Object} authData - Authorization data including code from Instagram
   * @returns {Object} Authorization result with tokens and account info
   */
  authorize: async (userId, authData) => {
    try {
      // 暂时移除API凭据检查，使用测试数据
      /* 
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Instagram API credentials not configured');
      }
      */
      
      // For demo purposes - this would normally exchange an authorization code for tokens
      if (!authData.code) {
        throw new Error('Authorization code is required');
      }
      
      // Exchange code for access token
      // In a real implementation, we would make this call:
      /*
      const tokenResponse = await axios.get(`${config.apiBase}/oauth/access_token`, {
        params: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: authData.code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code'
        }
      });
      */
      
      // For development, simulate a successful response
      const tokenResponse = {
        data: {
          access_token: `instagram-mock-token-${Date.now()}`,
          user_id: `instagram-user-${Date.now()}`,
          expires_in: 5184000 // 60 days in seconds
        }
      };
      
      // Get Instagram account info
      // In a real implementation, we would make this call:
      /*
      const accountResponse = await axios.get(`${config.apiBase}/me`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: tokenResponse.data.access_token
        }
      });
      */
      
      // For development, simulate a successful account response
      const accountResponse = {
        data: {
          id: tokenResponse.data.user_id,
          username: 'instagram_demo_user',
          account_type: 'BUSINESS',
          media_count: 42
        }
      };
      
      // Calculate token expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.data.expires_in);
      
      // Return authorization result
      return {
        accountId: accountResponse.data.id,
        accountName: accountResponse.data.username,
        accessToken: tokenResponse.data.access_token,
        refreshToken: null, // Instagram doesn't provide refresh tokens in the same way
        expiresAt: expiresAt.toISOString(),
        metadata: {
          accountType: accountResponse.data.account_type,
          mediaCount: accountResponse.data.media_count,
          scope: 'instagram_basic,instagram_content_publish'
        }
      };
    } catch (error) {
      console.error('Instagram authorization error:', error);
      throw new Error(`Instagram authorization failed: ${error.message}`);
    }
  },
  
  /**
   * Refresh access token for Instagram
   * @param {string} userId - User ID
   * @param {string} accessToken - Current access token
   * @returns {Object} New tokens and expiration
   */
  refreshToken: async (userId, accessToken) => {
    try {
      // 暂时移除API凭据检查
      /*
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Instagram API credentials not configured');
      }
      */
      
      // In a real implementation, we would make this call to extend the token lifetime:
      /*
      const refreshResponse = await axios.get(`${config.apiBase}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          fb_exchange_token: accessToken
        }
      });
      */
      
      // For development, simulate a successful response
      const refreshResponse = {
        data: {
          access_token: `instagram-mock-token-extended-${Date.now()}`,
          expires_in: 15552000 // 180 days in seconds
        }
      };
      
      // Calculate token expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshResponse.data.expires_in);
      
      // Return refresh result
      return {
        accessToken: refreshResponse.data.access_token,
        refreshToken: null,
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      console.error('Instagram token refresh error:', error);
      throw new Error(`Instagram token refresh failed: ${error.message}`);
    }
  },
  
  /**
   * Revoke Instagram access
   * @param {string} userId - User ID
   * @param {Object} platform - Platform data from database
   * @returns {boolean} Success status
   */
  revokeAccess: async (userId, platform) => {
    try {
      // 暂时移除API凭据检查
      /*
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Instagram API credentials not configured');
      }
      */
      
      // For a real implementation, we would make this call:
      /*
      await axios.delete(`${config.apiBase}/me/permissions`, {
        params: {
          access_token: platform.accessToken
        }
      });
      */
      
      // For development, just log and return success
      console.log(`[MOCK] Revoked Instagram access for user ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Instagram access revocation error:', error);
      throw new Error(`Instagram access revocation failed: ${error.message}`);
    }
  },
  
  /**
   * Post content to Instagram
   * @param {string} userId - User ID
   * @param {Object} platformData - Platform connection data from database
   * @param {Object} contentData - Content to post { caption, mediaUrl }
   * @returns {Object} Result of the post operation
   */
  postContent: async (userId, platformData, contentData) => {
    try {
      const accessToken = platformData.access_token;
      const accountId = platformData.account_id;
      
      if (!accessToken) {
        throw new Error('Instagram access token not found in platform data');
      }
      if (!accountId) {
        throw new Error('Instagram account ID not found in platform data');
      }
      
      const { caption, mediaUrl } = contentData;
      
      if (!mediaUrl) {
        throw new Error('Media URL is required for Instagram posts');
      }
      
      console.log(`Attempting to post to Instagram account: ${accountId}`);
      
      // Instagram posting is a two-step process:
      // 1. Create a media container
      // 2. Publish the container to the feed
      
      // Step 1: Create a media container
      // In a real implementation, we would make this call:
      /*
      const createMediaResponse = await axios.post(`${config.apiBase}/${accountId}/media`, null, {
        params: {
          image_url: mediaUrl,
          caption: caption || '',
          access_token: accessToken
        }
      });
      
      const creationId = createMediaResponse.data.id;
      
      // Step 2: Publish the container
      const publishResponse = await axios.post(`${config.apiBase}/${accountId}/media_publish`, null, {
        params: {
          creation_id: creationId,
          access_token: accessToken
        }
      });
      */
      
      // For development, simulate a successful response
      const mockPostId = `instagram-post-${Date.now()}`;
      
      console.log('Instagram post successful, mock post ID:', mockPostId);
      
      return {
        success: true,
        postId: mockPostId,
        url: `https://www.instagram.com/p/${mockPostId}/`
      };
    } catch (error) {
      console.error('Error posting to Instagram:', error.response ? error.response.data : error.message);
      
      let errorMessage = 'Failed to post to Instagram.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  },
  
  /**
   * Generate the Instagram OAuth authorization URL
   * @param {string} userId - User ID (potentially used for state parameter or logging)
   * @returns {Object} Object containing the authorization URL
   */
  getAuthUrl: async (userId) => {
    // Instagram Basic Display API scopes. Adjust if using Instagram Graph API for Business/Creators
    // Common scopes: user_profile, user_media (Basic Display)
    // Graph API Scopes might include: instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement etc.
    // IMPORTANT: Choose scopes based on the API you registered (Basic Display vs Graph API) and app needs.
    // Using Graph API scopes here as an example, aligning with the `authorize` function's metadata.
    const scope = 'instagram_basic,instagram_content_publish,pages_show_list'; // Example Graph API scopes

    // Use Facebook's dialog endpoint for Instagram Graph API authorization
    const authUrlBase = 'https://www.facebook.com/v19.0/dialog/oauth';

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: scope,
      response_type: 'code', // Request an authorization code
      // state: 'optional_state_value' // Optional: Add CSRF protection
    });

    const authUrl = `${authUrlBase}?${params.toString()}`;

    console.log(`Generated Instagram Auth URL for user ${userId}: ${authUrl}`); // Log the generated URL

    // Return the URL for the frontend to redirect the user
    return {
      authUrl: authUrl
    };
  }
};

module.exports = instagramStrategy; 