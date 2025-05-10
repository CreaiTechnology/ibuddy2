/**
 * Lazada Platform Integration Strategy
 */
const axios = require('axios');
const crypto = require('crypto');
const { URLSearchParams } = require('url');

// Remove previous debug logs here if they existed

// Lazada API Configuration - GET THESE FROM ENVIRONMENT VARIABLES
const config = {
  // Base URLs for Lazada Open Platform API (confirm based on region/documentation)
  apiBase: process.env.LAZADA_API_BASE || 'https://api.lazada.sg/rest', // Example for SG, adjust as needed
  authBase: process.env.LAZADA_AUTH_BASE || 'https://auth.lazada.com/rest', // Auth endpoints
  authUrl: process.env.LAZADA_AUTH_URL || 'https://auth.lazada.com/oauth/authorize', // User auth page
  
  appKey: process.env.LAZADA_APP_KEY || 'YOUR_LAZADA_APP_KEY',         // Your Lazada App Key (Client ID)
  appSecret: process.env.LAZADA_APP_SECRET || 'YOUR_LAZADA_APP_SECRET',   // Your Lazada App Secret
  redirectUri: process.env.LAZADA_REDIRECT_URI || 'http://localhost:3001/api/platforms/lazada/callback' // Your callback URL configured in Lazada
};

/**
 * Generate Lazada API signature (Based on common Lazada signing practices)
 * Refer to official Lazada documentation for the exact signature method.
 * @param {string} appSecret - Your Lazada App Secret
 * @param {string} apiPath - The API path (e.g., /auth/token/create)
 * @param {Object} params - All request parameters (excluding sign, including common params like app_key, timestamp)
 * @returns {string} Uppercase MD5 or SHA256 signature
 */
const generateLazadaSignature = (appSecret, apiPath, params) => {
  // 1. Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort();
  // 2. Concatenate path and key-value pairs
  let signString = apiPath;
  sortedKeys.forEach(key => {
    signString += `${key}${params[key]}`;
  });
  // 3. Prepend and append appSecret (confirm this step with Lazada docs)
  // signString = appSecret + signString + appSecret; 
  
  // 4. Generate HMAC-SHA256 hash (or MD5, check Lazada docs)
  console.log(`[Lazada Signature] Base string for ${apiPath}: ${signString}`);
  const signature = crypto.createHmac('sha256', appSecret)
                        .update(signString)
                        .digest('hex')
                        .toUpperCase(); // Lazada often requires uppercase
  console.log(`[Lazada Signature] Generated sign for ${apiPath}: ${signature}`);
  return signature;
};

/**
 * Helper to make signed Lazada API requests
 */
const makeLazadaRequest = async (method, apiPath, params = {}, body = null, isAuthEndpoint = false) => {
  const commonParams = {
    app_key: config.appKey,
    timestamp: Date.now(), // Lazada typically uses milliseconds
    sign_method: 'sha256', // or 'md5' - check Lazada docs
  };
  
  const allParams = { ...commonParams, ...params };
  
  const signature = generateLazadaSignature(config.appSecret, apiPath, allParams);
  allParams.sign = signature;
  
  const urlBase = isAuthEndpoint ? config.authBase : config.apiBase;
  const requestUrl = `${urlBase}${apiPath}`;
  
  console.log(`[Lazada Request] ${method.toUpperCase()} ${requestUrl}`);
  console.log(`[Lazada Request] Params: ${JSON.stringify(allParams)}`);
  if (body) {
      console.log(`[Lazada Request] Body: ${JSON.stringify(body)}`);
  }

  try {
    // ======================================================
    // ACTUAL API CALL - Uncomment and adjust when ready
    // ======================================================
    /*
    const response = await axios({
      method: method,
      url: requestUrl,
      params: method.toUpperCase() === 'GET' ? allParams : null, // Add signed params to query for GET
      data: method.toUpperCase() === 'POST' ? { ...allParams, ...body } : null, // Add signed params and body for POST (check Lazada docs for exact format - maybe form-urlencoded or JSON)
      headers: {
        // Lazada might require specific headers, e.g., 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    });

    console.log('[Lazada Response] Status:', response.status);
    console.log('[Lazada Response] Data:', response.data);

    // Lazada API specific error handling
    if (response.data.code !== '0') { // '0' usually indicates success in Lazada API
      throw new Error(`Lazada API Error: ${response.data.message} (Code: ${response.data.code}, RequestId: ${response.data.request_id})`);
    }
    return response.data; // Return the actual response data
    */
    
    // ======================================================
    // MOCK RESPONSE (REMOVE WHEN USING REAL API CALL)
    // ======================================================
    console.warn('[MOCK] Lazada API call not executed. Returning mock data.');
    // Simulate different responses based on path for testing
    if (apiPath === '/auth/token/create') {
      return {
        code: '0', message: 'Success', request_id: `mock_req_${Date.now()}`,
        access_token: `lazada-mock-token-${Date.now()}`,
        refresh_token: `lazada-mock-refresh-${Date.now()}`,
        expires_in: 86400, // Typically 1 day for initial token
        refresh_expires_in: 15552000, // Typically 180 days for refresh token
        country: 'SG', 
        account_platform: 'seller', 
        account: 'Mock Lazada Seller',
        user_info: { seller_id: `mock_seller_${Date.now()}` }
      };
    } else if (apiPath === '/auth/token/refresh') {
       return {
        code: '0', message: 'Success', request_id: `mock_req_${Date.now()}`,
        access_token: `lazada-mock-token-refreshed-${Date.now()}`,
        refresh_token: `lazada-mock-refresh-${Date.now()}`,
        expires_in: 86400,
        refresh_expires_in: 15552000,
        country: 'SG', 
        account_platform: 'seller', 
        account: 'Mock Lazada Seller',
        user_info: { seller_id: `mock_seller_${Date.now()}` }
      };
    } else if (apiPath === '/seller/get') { // Example for getting seller info
        return {
            code: '0',
            data: {
                name: 'Mock Lazada Store Name',
                seller_id: `mock_seller_${Date.now()}`,
                location: 'Singapore',
                email: 'seller@mock.lazada.sg'
            },
            request_id: `mock_req_${Date.now()}`
        };
    }
    return { code: '0', message: 'Mock Success', request_id: `mock_req_${Date.now()}` }; // Default mock
    // ======================================================

  } catch (error) {
    console.error(`Lazada API request failed for ${apiPath}:`, error.response ? error.response.data : error.message);
    const errMsg = error.response?.data?.message || error.message || 'Lazada API request failed';
    throw new Error(errMsg);
  }
};

const lazadaStrategy = {
  /**
   * Generate the Lazada OAuth authorization URL
   */
  getAuthUrl: async (userId) => {
    console.log('DEBUG: Checking config.appKey:', config.appKey);
    if (!config.appKey || config.appKey === 'YOUR_LAZADA_APP_KEY') {
      console.error('Lazada App Key (Client ID) is not configured!');
      throw new Error('Lazada integration is not configured correctly.');
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      force_auth: 'true', // Can be true or false
      redirect_uri: config.redirectUri,
      client_id: config.appKey,
      // state: 'optional_state_value' // Optional CSRF protection
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    console.log(`Generated Lazada Auth URL for user ${userId}: ${authUrl}`);
    return { authUrl };
  },

  /**
   * Authorize Lazada using the callback code
   */
  authorize: async (userId, authData) => {
    if (!authData.code) {
      throw new Error('Authorization code is required from Lazada callback');
    }
    if (!config.appKey || !config.appSecret || config.appKey === 'YOUR_LAZADA_APP_KEY') {
      console.error('Lazada App Key or Secret is not configured!');
      throw new Error('Lazada integration is not configured correctly.');
    }
    
    const apiPath = '/auth/token/create';
    const params = { code: authData.code }; // Parameters required by the token creation API
    
    try {
      // Make the signed request to get the token
      const tokenResponse = await makeLazadaRequest('post', apiPath, params, null, true);
      
      // --- Process Token Response --- 
      const accessToken = tokenResponse.access_token;
      const refreshToken = tokenResponse.refresh_token;
      const expiresIn = tokenResponse.expires_in;
      const accountName = tokenResponse.account || 'Lazada Seller'; // Extract account name/ID
      const sellerId = tokenResponse.user_info?.seller_id || tokenResponse.account; // Extract Seller ID
      
      if (!accessToken) {
        throw new Error('Access token not received from Lazada');
      }
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      
      // --- (Optional) Get Seller Info --- 
      let sellerInfo = { name: accountName }; // Default
      /* 
      try {
          const sellerPath = '/seller/get'; // Confirm actual API path
          // Parameters for seller info might just need access_token, check docs
          const sellerParams = { access_token: accessToken }; 
          const sellerApiResponse = await makeLazadaRequest('get', sellerPath, sellerParams);
          sellerInfo = sellerApiResponse.data; // Adjust based on actual response structure
      } catch (infoError) {
          console.warn(`Could not fetch detailed Lazada seller info: ${infoError.message}`);
      }
      */

      return {
        accountId: sellerId, // Use Seller ID as accountId
        accountName: sellerInfo.name || accountName, // Use fetched name if available
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt.toISOString(),
        metadata: { // Store any other relevant info
          country: tokenResponse.country,
          accountPlatform: tokenResponse.account_platform,
          // Add more details from sellerInfo if needed
        }
      };
    } catch (error) {       
      console.error('Lazada authorization error:', error);
      throw new Error(`Lazada authorization failed: ${error.message}`);
    }
  },

  /**
   * Refresh access token for Lazada
   */
  refreshToken: async (userId, currentAccessToken, currentRefreshToken) => {
    if (!currentRefreshToken) {
      throw new Error('Refresh token is required to refresh Lazada access');
    }
     if (!config.appKey || !config.appSecret || config.appKey === 'YOUR_LAZADA_APP_KEY') {
      console.error('Lazada App Key or Secret is not configured!');
      throw new Error('Lazada integration is not configured correctly.');
    }

    const apiPath = '/auth/token/refresh';
    const params = { refresh_token: currentRefreshToken };

    try {
      const refreshResponse = await makeLazadaRequest('post', apiPath, params, null, true);
      
      const newAccessToken = refreshResponse.access_token;
      const newRefreshToken = refreshResponse.refresh_token;
      const expiresIn = refreshResponse.expires_in;
      
      if (!newAccessToken) {
          throw new Error('Refreshed access token not received from Lazada');
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken, // Lazada usually returns a new refresh token as well
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      console.error('Lazada token refresh error:', error);
      throw new Error(`Lazada token refresh failed: ${error.message}`);
    }
  },

  /**
   * Revoke Lazada access (Mock implementation)
   */
  revokeAccess: async (userId, platform) => {
    console.log(`[MOCK] Revoking Lazada access for user ${userId}. Manual removal might be needed in Lazada Seller Center.`);
    // No standard API for revocation, just return true
    return true;
  },

  /**
   * Post content to Lazada (Placeholder - implement based on needs)
   */
  postContent: async (userId, platformData, contentData) => {
    console.warn('Lazada postContent function is not implemented yet.');
    // TODO: Implement logic to post products or other content to Lazada
    // Requires understanding the specific Lazada API for content posting 
    // (e.g., /product/create) and making signed requests.
    throw new Error('Posting content to Lazada is not yet supported.');
  }
};

module.exports = lazadaStrategy; 