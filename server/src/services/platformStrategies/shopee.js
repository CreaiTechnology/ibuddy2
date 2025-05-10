/**
 * Shopee Platform Integration Strategy
 */

const axios = require('axios');
const crypto = require('crypto');
const { URLSearchParams } = require('url');

// Shopee API Configuration
const config = {
  apiBase: process.env.SHOPEE_API_BASE || 'https://partner.shopeemobile.com',
  apiVersion: process.env.SHOPEE_API_VERSION || 'v2',
  partnerId: process.env.SHOPEE_PARTNER_ID || '123456789',
  partnerKey: process.env.SHOPEE_PARTNER_KEY || 'test-partner-key',
  redirectUri: process.env.SHOPEE_REDIRECT_URI || 'http://localhost:3001/api/platforms/shopee/callback'
};

/**
 * Generate Shopee API signature
 * @param {string} partnerId - Partner ID
 * @param {string} partnerKey - Partner key
 * @param {string} path - API path
 * @param {number} timestamp - UNIX timestamp
 * @param {Object} [params={}] - Request parameters
 * @returns {string} Signature
 */
const generateSignature = (partnerId, partnerKey, path, timestamp, params = {}) => {
  const baseString = `${partnerId}${path}${timestamp}${JSON.stringify(params)}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
};

/**
 * Shopee platform strategy
 */
const shopeeStrategy = {
  /**
   * Generate the Shopee OAuth authorization URL
   * @param {string} userId - User ID (potentially used for state parameter or logging)
   * @returns {Object} Object containing the authorization URL
   */
  getAuthUrl: async (userId) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/auth_partner'; // Shopee authorization initiation path
    
    // Generate sign for the auth initiation URL parameters
    const baseString = `${config.partnerId}${path}${timestamp}`;
    const sign = crypto.createHmac('sha256', config.partnerKey).update(baseString).digest('hex');

    const authUrlBase = `${config.apiBase}${path}`;
    
    const params = new URLSearchParams({
      partner_id: config.partnerId,
      redirect: config.redirectUri,
      timestamp: timestamp.toString(),
      sign: sign,
      // state: 'optional_state_value' // Optional: Add CSRF protection if needed
    });

    const authUrl = `${authUrlBase}?${params.toString()}`;

    console.log(`Generated Shopee Auth URL for user ${userId}: ${authUrl}`);

    // Return the URL for the frontend to redirect the user
    return {
      authUrl: authUrl
    };
  },

  /**
   * Authorize Shopee for a user
   * @param {string} userId - User ID
   * @param {Object} authData - Authorization data including code from Shopee
   * @returns {Object} Authorization result with tokens and account info
   */
  authorize: async (userId, authData) => {
    try {
      // 暂时移除API凭据检查
      /*
      if (!config.partnerId || !config.partnerKey) {
        throw new Error('Shopee API credentials not configured');
      }
      */
      
      // For demo purposes - this would normally exchange an authorization code for tokens
      if (!authData.code) {
        throw new Error('Authorization code is required');
      }
      
      // Exchange code for access token
      // In a real implementation, we would make this call:
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/api/v2/auth/token/get';
      
      /*
      const signature = generateSignature(
        config.partnerId,
        config.partnerKey,
        path,
        timestamp
      );
      
      const tokenResponse = await axios.post(`${config.apiBase}${path}`, {
        code: authData.code,
        partner_id: parseInt(config.partnerId),
        shop_id: 0 // Will be updated when we get shop info
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': signature,
          'X-Shopee-Timestamp': timestamp
        }
      });
      */
      
      // For development, simulate a successful response
      const tokenResponse = {
        data: {
          error: '',
          message: 'success',
          request_id: `shopee-request-${Date.now()}`,
          authed_shops: [{
            shop_id: Math.floor(Math.random() * 1000000),
            shop_name: 'Demo Shopee Store'
          }],
          access_token: `shopee-mock-token-${Date.now()}`,
          refresh_token: `shopee-mock-refresh-${Date.now()}`,
          expire_in: 14400 // 4 hours in seconds
        }
      };
      
      // Get the shop ID
      const shopId = tokenResponse.data.authed_shops[0].shop_id;
      const shopName = tokenResponse.data.authed_shops[0].shop_name;
      
      // Get shop details (in a real implementation)
      /*
      const shopPath = '/api/v2/shop/get_shop_info';
      const shopSignature = generateSignature(
        config.partnerId,
        config.partnerKey,
        shopPath,
        timestamp,
        { partner_id: parseInt(config.partnerId), shop_id: shopId }
      );
      
      const shopResponse = await axios.get(`${config.apiBase}${shopPath}`, {
        params: {
          partner_id: parseInt(config.partnerId),
          shop_id: shopId,
          timestamp: timestamp,
          sign: shopSignature
        }
      });
      */
      
      // For development, simulate a successful shop response
      const shopResponse = {
        data: {
          error: '',
          message: 'success',
          response: {
            shop_name: shopName,
            country: 'SG',
            shop_description: 'A demo Shopee store for testing',
            is_cb: false,
            status: 'NORMAL'
          }
        }
      };
      
      // Calculate token expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.data.expire_in);
      
      // Return authorization result
      return {
        accountId: shopId.toString(),
        accountName: shopResponse.data.response.shop_name,
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresAt: expiresAt.toISOString(),
        metadata: {
          country: shopResponse.data.response.country,
          shopDescription: shopResponse.data.response.shop_description,
          shopStatus: shopResponse.data.response.status
        }
      };
    } catch (error) {
      console.error('Shopee authorization error:', error);
      throw new Error(`Shopee authorization failed: ${error.message}`);
    }
  },
  
  /**
   * Refresh access token for Shopee
   * @param {string} userId - User ID
   * @param {string} accessToken - Current access token
   * @param {string} refreshToken - Current refresh token
   * @returns {Object} New tokens and expiration
   */
  refreshToken: async (userId, accessToken, refreshToken) => {
    try {
      // 暂时移除API凭据检查
      /*
      if (!config.partnerId || !config.partnerKey) {
        throw new Error('Shopee API credentials not configured');
      }
      */
      
      // In a real implementation, we would make this call:
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/api/v2/auth/access_token/get';
      
      /*
      const signature = generateSignature(
        config.partnerId,
        config.partnerKey,
        path,
        timestamp
      );
      
      const refreshResponse = await axios.post(`${config.apiBase}${path}`, {
        refresh_token: refreshToken,
        partner_id: parseInt(config.partnerId),
        shop_id: 0 // Will be updated when we get refresh results
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': signature,
          'X-Shopee-Timestamp': timestamp
        }
      });
      */
      
      // For development, simulate a successful response
      const refreshResponse = {
        data: {
          error: '',
          message: 'success',
          request_id: `shopee-refresh-request-${Date.now()}`,
          access_token: `shopee-mock-token-refreshed-${Date.now()}`,
          refresh_token: `shopee-mock-refresh-${Date.now()}`,
          expire_in: 14400 // 4 hours in seconds
        }
      };
      
      // Calculate token expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshResponse.data.expire_in);
      
      // Return refresh result
      return {
        accessToken: refreshResponse.data.access_token,
        refreshToken: refreshResponse.data.refresh_token,
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      console.error('Shopee token refresh error:', error);
      throw new Error(`Shopee token refresh failed: ${error.message}`);
    }
  },
  
  /**
   * Revoke Shopee access
   * @param {string} userId - User ID
   * @param {Object} platform - Platform data from database
   * @returns {boolean} Success status
   */
  revokeAccess: async (userId, platform) => {
    // Shopee doesn't have a specific endpoint to revoke tokens
    // We can just delete the token from our database and not use it anymore
    console.log(`[MOCK] Revoked Shopee access for user ${userId}`);
    return true;
  },
  
  /**
   * Post content to Shopee (creates a product listing)
   * @param {string} userId - User ID
   * @param {Object} platformData - Platform connection data from database
   * @param {Object} contentData - Content to post (product details)
   * @returns {Object} Result of the post operation
   */
  postContent: async (userId, platformData, contentData) => {
    try {
      const accessToken = platformData.access_token;
      const shopId = parseInt(platformData.account_id);
      
      if (!accessToken) {
        throw new Error('Shopee access token not found in platform data');
      }
      if (!shopId) {
        throw new Error('Shopee shop ID not found in platform data');
      }
      
      // For posting a product to Shopee, we need more structured data
      // This is a simplified version - real implementation would have more fields
      const { 
        name, 
        description, 
        price,
        stock, 
        images,
        category 
      } = contentData;
      
      if (!name || !price) {
        throw new Error('Product name and price are required for Shopee listings');
      }
      
      console.log(`Attempting to post product to Shopee shop: ${shopId}`);
      
      // In a real implementation, we would make this call:
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/api/v2/product/add_item';
      
      /*
      const signature = generateSignature(
        config.partnerId,
        config.partnerKey,
        path,
        timestamp,
        {
          partner_id: parseInt(config.partnerId),
          shop_id: shopId,
          access_token: accessToken
        }
      );
      
      const productData = {
        original_price: parseFloat(price),
        description: description || '',
        weight: 1.0, // Default weight in kg
        item_name: name,
        normal_stock: parseInt(stock) || 100,
        category_id: parseInt(category) || 0, // Would need to fetch categories from Shopee
        images: (images || []).map(url => ({ url }))
      };
      
      const response = await axios.post(`${config.apiBase}${path}`, productData, {
        params: {
          partner_id: parseInt(config.partnerId),
          shop_id: shopId,
          access_token: accessToken,
          timestamp: timestamp,
          sign: signature
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      */
      
      // For development, simulate a successful response
      const mockItemId = Math.floor(Math.random() * 1000000);
      const response = {
        data: {
          error: '',
          message: 'success',
          response: {
            item_id: mockItemId,
            failure_list: [],
            success_list: [{
              model_id: 0,
              tier_variation: []
            }]
          }
        }
      };
      
      console.log('Shopee product creation successful, mock item ID:', mockItemId);
      
      return {
        success: true,
        postId: mockItemId.toString(),
        url: `https://shopee.sg/product/${shopId}/${mockItemId}`
      };
    } catch (error) {
      console.error('Error posting to Shopee:', error.response ? error.response.data : error.message);
      
      let errorMessage = 'Failed to post to Shopee.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error_description || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  }
};

module.exports = shopeeStrategy; 