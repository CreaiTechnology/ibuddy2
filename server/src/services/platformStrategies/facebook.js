/**
 * Facebook Platform Integration Strategy
 */

const axios = require('axios');
const { URLSearchParams } = require('url');

// Facebook API Configuration
const config = {
  apiBase: process.env.FACEBOOK_API_BASE || 'https://graph.facebook.com/v19.0',
  clientId: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/platforms/facebook/callback'
};

/**
 * Facebook platform strategy
 */
const facebookStrategy = {
  /**
   * Authorize Facebook for a user
   * @param {string} userId - User ID
   * @param {Object} authData - Authorization data including code from Facebook
   * @returns {Object} Authorization result with tokens and account info
   */
  authorize: async (userId, authData) => {
    try {
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Facebook API credentials not configured');
      }
      
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
          redirect_uri: config.redirectUri
        }
      });
      */
      
      // For development, simulate a successful response
      const tokenResponse = {
        data: {
          access_token: `facebook-mock-token-${Date.now()}`,
          expires_in: 5184000 // 60 days in seconds
        }
      };
      
      // Get user account info
      // In a real implementation, we would make this call:
      /*
      const accountResponse = await axios.get(`${config.apiBase}/me`, {
        params: {
          fields: 'id,name,email',
          access_token: tokenResponse.data.access_token
        }
      });
      */
      
      // For development, simulate a successful account response
      const accountResponse = {
        data: {
          id: `facebook-account-${Date.now()}`,
          name: 'Facebook Demo User',
          email: 'demo@example.com'
        }
      };
      
      // Get Facebook pages the user manages
      // In a real implementation, we would make this call:
      /*
      const pagesResponse = await axios.get(`${config.apiBase}/me/accounts`, {
        params: {
          access_token: tokenResponse.data.access_token
        }
      });
      */
      
      // For development, simulate a successful pages response
      const pagesResponse = {
        data: {
          data: [{
            id: `facebook-page-${Date.now()}`,
            name: 'Business Demo Page',
            access_token: `facebook-page-token-${Date.now()}`
          }]
        }
      };
      
      // Calculate token expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.data.expires_in);
      
      // Store both user token and page token
      const pageData = pagesResponse.data.data[0];
      
      // Return authorization result
      return {
        accountId: pageData.id,
        accountName: pageData.name,
        accessToken: pageData.access_token, // Use page token for posting
        refreshToken: null, // Facebook page tokens typically don't expire
        expiresAt: null,
        metadata: {
          userToken: tokenResponse.data.access_token,
          userId: accountResponse.data.id,
          userEmail: accountResponse.data.email,
          userName: accountResponse.data.name,
          pageId: pageData.id,
          pageName: pageData.name,
          scope: 'pages_show_list,pages_manage_posts,pages_read_engagement'
        }
      };
    } catch (error) {
      console.error('Facebook authorization error:', error);
      throw new Error(`Facebook authorization failed: ${error.message}`);
    }
  },
  
  /**
   * Refresh access token for Facebook
   * Note: Facebook page tokens usually don't expire, but user tokens do
   * @param {string} userId - User ID
   * @param {string} accessToken - Current access token
   * @param {string} refreshToken - Current refresh token
   * @returns {Object} New tokens and expiration
   */
  refreshToken: async (userId, accessToken, refreshToken) => {
    try {
      // Facebook doesn't use refresh tokens in the traditional sense
      // Long-lived page tokens typically don't expire
      // For a real implementation, we might get a new long-lived token
      
      // Just return the existing token for development
      return {
        accessToken: accessToken,
        refreshToken: null,
        expiresAt: null
      };
    } catch (error) {
      console.error('Facebook token refresh error:', error);
      throw new Error(`Facebook token refresh failed: ${error.message}`);
    }
  },
  
  /**
   * Revoke Facebook access
   * @param {string} userId - User ID
   * @param {Object} platform - Platform data from database
   * @returns {boolean} Success status
   */
  revokeAccess: async (userId, platform) => {
    try {
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Facebook API credentials not configured');
      }
      
      // For a real implementation, we would revoke the user's token
      // The page token would still be valid, but the user would need to re-authorize to manage it
      /*
      if (platform.metadata && platform.metadata.userToken) {
        await axios.delete(`${config.apiBase}/me/permissions`, {
          params: {
            access_token: platform.metadata.userToken
          }
        });
      }
      */
      
      // For development, just log and return success
      console.log(`[MOCK] Revoked Facebook access for user ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Facebook access revocation error:', error);
      throw new Error(`Facebook access revocation failed: ${error.message}`);
    }
  },
  
  /**
   * Post content to a Facebook Page
   * @param {string} userId - User ID
   * @param {Object} platformData - Platform connection data from Supabase (contains page access token, page id in metadata or accountId)
   * @param {Object} contentData - Content to post { message: string, link?: string, ...other fields }
   * @returns {Object} Result of the post operation (e.g., post ID)
   */
  postContent: async (userId, platformData, contentData) => {
    const pageId = platformData.account_id; // account_id should be the Page ID for Facebook
    const pageAccessToken = platformData.access_token; // access_token should be the Page Access Token
    const message = contentData.message; // Assuming contentData has a message field

    if (!pageId) {
        throw new Error('Facebook Page ID not found in platform data.');
    }
    if (!pageAccessToken) {
        throw new Error('Facebook Page Access Token not found in platform data.');
    }
     if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Content message is required for Facebook post.');
    }
    
    console.log(`Attempting to post to Facebook Page ID: ${pageId}`);
    const postUrl = `${config.apiBase}/${pageId}/feed`;

    try {
        const response = await axios.post(postUrl, {
            message: message, // The text content of the post
            // link: contentData.link, // Optional: Add a link if provided
            // picture: contentData.imageUrl, // Optional: Add image URL if provided
            // You can add more parameters based on the Graph API documentation
        }, {
            headers: {
                'Authorization': `Bearer ${pageAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Facebook post successful:', response.data);
        // response.data usually contains the id of the created post (e.g., { id: 'pageId_postId' })
        return { success: true, postId: response.data.id };

    } catch (error) {
        console.error('Error posting to Facebook:', error.response ? error.response.data : error.message);
        let errorMessage = 'Failed to post to Facebook.';
        if (error.response && error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error.message || errorMessage;
             // Handle specific errors like invalid token, permissions etc.
            if (error.response.data.error.code === 190) { // OAuthException code for invalid token/permissions
                 errorMessage = 'Facebook authentication error. Please re-authorize the connection.';
                 // Optionally mark the connection as inactive here?
            }
        }
        throw new Error(errorMessage);
    }
  },
  /**
   * Generate OAuth URL for Facebook login
   * @returns {string} URL to redirect users for Facebook OAuth
   */
  getAuthUrl: () => {
    console.log('Facebook config:', {
      clientId: config.clientId ? 'Set' : 'Not set',
      clientSecret: config.clientSecret ? 'Set' : 'Not set',
      redirectUri: config.redirectUri
    });
    
    if (!config.clientId || !config.clientSecret) {
      // 如果环境变量未设置，返回开发模式的模拟URL
      console.warn('Facebook OAuth credentials not fully configured, using mock URL');
      return 'https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow#login';
    }
    
    const baseUrl = 'https://www.facebook.com/v19.0/dialog/oauth';
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: 'public_profile,email,pages_show_list',
      response_type: 'code'
    });
    return `${baseUrl}?${params.toString()}`;
  }
};

module.exports = facebookStrategy; 