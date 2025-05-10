/**
 * WhatsApp Platform Integration Strategy (Cloud API - Permanent Token)
 */

const axios = require('axios');

// WhatsApp Cloud API Configuration
const config = {
  // Base URL for WhatsApp Cloud API (Meta Graph API)
  apiBase: process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v19.0',
  // Permanent Token and Phone Number ID are provided by the user during authorization
};

/**
 * Helper function to make WhatsApp API requests.
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API path relative to apiBase (e.g., `/${phoneNumberId}/whatsapp_business_profile`)
 * @param {string} apiToken - User-provided permanent API token.
 * @param {object} [params] - Query parameters.
 * @param {object} [data] - Request body data.
 * @returns {Promise<object>} Axios response data.
 */
const makeWhatsappRequest = async (method, path, apiToken, params = {}, data = null) => {
  const requestUrl = `${config.apiBase}${path}`;
  console.log(`[WhatsApp Request] ${method.toUpperCase()} ${requestUrl}`);
  if (params) console.log(`[WhatsApp Request] Params: ${JSON.stringify(params)}`);
  if (data) console.log(`[WhatsApp Request] Body: ${JSON.stringify(data)}`);

  try {
    // ======================================================
    // ACTUAL API CALL - Enabled
    // ======================================================
    
    const response = await axios({
      method: method,
      url: requestUrl,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      params: params,
      data: data
    });

    console.log('[WhatsApp Response] Status:', response.status);
    console.log('[WhatsApp Response] Data:', response.data);

    // Check for API errors within the response data if applicable
    // WhatsApp API might return 200 OK but include error details in the body
    if (response.data.error) {
         throw new Error(`WhatsApp API Error: ${response.data.error.message} (Code: ${response.data.error.code})`);
    }

    return response.data;
    

    // ======================================================
    // MOCK RESPONSE (Commented out)
    // ======================================================
    /*
    console.warn('[MOCK] WhatsApp API call not executed. Returning mock data.');
    if (path.includes('whatsapp_business_profile')) { // Mock response for profile verification
      return {
          data: [{
              business_profile: {
                  about: "Mock About Text",
                  address: "Mock Address",
                  description: "Mock Business Description",
                  email: "mock@example.com",
                  profile_picture_url: "https://via.placeholder.com/150",
                  websites: ["https://example.com"],
                  vertical: "RETAIL"
              }
          }]
      };
    } else if (path.includes('/messages') && method.toUpperCase() === 'POST') { // Mock response for sending message
         return {
             messaging_product: "whatsapp",
             contacts: [{ input: data.to, wa_id: data.to }],
             messages: [{ id: `wamid.mock_${Date.now()}` }]
         };
    }
    return { success: true }; // Default mock
    */
    // ======================================================

  } catch (error) {
    console.error(`WhatsApp API request failed for ${path}:`, error.response ? error.response.data : error.message);
    const errMsg = error.response?.data?.error?.message || error.message || 'WhatsApp API request failed';
    throw new Error(errMsg);
  }
};


const whatsappStrategy = {
  /**
   * Authorize WhatsApp by verifying user-provided credentials.
   * @param {string} userId - User ID.
   * @param {Object} authData - Authorization data containing apiToken and phoneNumberId.
   * @returns {Object} Authorization result with verified account info and token.
   */
  authorize: async (userId, authData) => {
    console.log(`Authorizing WhatsApp for user ${userId}`);
    const { apiToken, phoneNumberId } = authData;

    if (!apiToken || !phoneNumberId) {
      throw new Error('WhatsApp API Token and Phone Number ID are required.');
    }

    try {
      // --- Verify Credentials by making an API call --- 
      // Example: Get Business Profile (confirm endpoint and required fields)
      const verificationPath = `/${phoneNumberId}?fields=name,display_phone_number,verified_name`; // Example verification call
      // const verificationPath = `/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;
      console.log(`Verifying WhatsApp credentials for Phone Number ID: ${phoneNumberId}`);
      
      // Use the helper function to make the request
      const verificationResponse = await makeWhatsappRequest('get', verificationPath, apiToken);

      // --- Process Verification Response --- 
      // Adjust based on the actual response structure of the verification endpoint used
      let accountName = `WhatsApp (${phoneNumberId})`; // Default name
      let accountId = phoneNumberId;
      let metadata = { verified: false }; // Default metadata
      
      // Example processing if using `/PHONE_ID?fields=...`
      if (verificationResponse) {
          accountName = verificationResponse.verified_name || verificationResponse.name || `WhatsApp (${verificationResponse.display_phone_number || phoneNumberId})`;
          accountId = verificationResponse.id || phoneNumberId;
          metadata = { 
              displayPhoneNumber: verificationResponse.display_phone_number,
              verifiedName: verificationResponse.verified_name,
              name: verificationResponse.name,
              verified: true 
          }; 
      } 
      /* Example processing if using /whatsapp_business_profile
      if (verificationResponse && verificationResponse.data && verificationResponse.data.length > 0) {
         const profile = verificationResponse.data[0].business_profile;
         accountName = `WhatsApp Business (${phoneNumberId})`; // Or use a name from profile if available
         accountId = phoneNumberId;
         metadata = { ...profile, verified: true };
      } else {
         throw new Error('Could not retrieve valid business profile during verification.');
      }
      */

      console.log(`WhatsApp credentials verified for ${accountName}`);

      // WhatsApp Cloud API uses a permanent token, so no refresh token or expiry needed in the same way
      // We store the permanent token provided by the user.
      return {
        accountId: accountId,      // Use Phone Number ID or verified ID
        accountName: accountName,  // Use verified name or default
        accessToken: apiToken,     // Store the user-provided permanent token
        refreshToken: null,        // No refresh token for permanent tokens
        expiresAt: null,           // Permanent token essentially doesn't expire
        metadata: metadata         // Store verification details or profile info
      };
    } catch (error) {
      console.error('WhatsApp authorization/verification error:', error);
      // Provide a more specific error message if verification failed
      if (error.message.includes('WhatsApp API request failed') || error.message.includes('WhatsApp API Error')) {
           throw new Error(`WhatsApp credential verification failed: ${error.message}. Please check your API Token and Phone Number ID.`);
      } else {
           throw new Error(`WhatsApp authorization failed: ${error.message}`);
      }
    }
  },

  /**
   * Refresh access token for WhatsApp (Not applicable for permanent tokens)
   */
  refreshToken: async (userId, accessToken, refreshToken) => {
    console.warn(`WhatsApp Cloud API uses permanent tokens. Refresh called for user ${userId}, but no action needed.`);
    // Return the existing token details as they don't change
    return {
      accessToken: accessToken,
      refreshToken: null,
      expiresAt: null
    };
  },

  /**
   * Revoke WhatsApp access (Mock implementation - just logs)
   */
  revokeAccess: async (userId, platform) => {
    console.log(`[MOCK] Revoking WhatsApp access for user ${userId}. Token removal should happen in database.`);
    // In a real app, you'd delete the stored token for this user/platform connection.
    // Access is typically revoked by the user in their Meta Business settings.
    return true;
  },
  
  /**
   * Post content (send message) to WhatsApp
   * @param {string} userId - User ID
   * @param {Object} platformData - Platform connection data (containing accessToken, accountId/phoneNumberId)
   * @param {Object} contentData - Content to post { recipientPhoneNumber, messageText }
   * @returns {Object} Result of the send operation
   */
  postContent: async (userId, platformData, contentData) => {
    const apiToken = platformData.access_token; // The permanent token
    const phoneNumberId = platformData.account_id; // Stored Phone Number ID
    const { recipientPhoneNumber, messageText } = contentData;

    if (!apiToken || !phoneNumberId) {
      throw new Error('WhatsApp token or Phone Number ID missing in platform data.');
    }
    if (!recipientPhoneNumber || !messageText) {
      throw new Error('Recipient phone number and message text are required for WhatsApp.');
    }

    const path = `/${phoneNumberId}/messages`;
    const messageData = {
      messaging_product: 'whatsapp',
      to: recipientPhoneNumber,
      type: 'text',
      text: { body: messageText }
    };

    try {
      const response = await makeWhatsappRequest('post', path, apiToken, {}, messageData);
      
      // Process response - extract message ID
      const messageId = response.messages?.[0]?.id;
      if (!messageId) {
        console.warn('WhatsApp send API did not return a message ID in the expected format.', response);
        // Even without ID, it might have succeeded
      }
      
      console.log(`WhatsApp message sent successfully to ${recipientPhoneNumber}, Message ID: ${messageId || 'N/A'}`);
      
      return {
        success: true,
        postId: messageId || `sent_${Date.now()}`, // Use message ID or a placeholder
        metadata: { recipient: recipientPhoneNumber }
      };
    } catch (error) {
      console.error(`Error sending WhatsApp message to ${recipientPhoneNumber}:`, error);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }
};

module.exports = whatsappStrategy; 