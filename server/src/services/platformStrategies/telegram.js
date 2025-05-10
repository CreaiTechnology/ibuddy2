/**
 * Telegram Bot Platform Integration Strategy
 */

const axios = require('axios');

// Telegram Bot API Configuration
const config = {
  // Base URL for Telegram Bot API
  apiBase: process.env.TELEGRAM_API_BASE || 'https://api.telegram.org',
  // Bot Token is provided by the user during authorization
};

/**
 * Helper function to make Telegram Bot API requests.
 * @param {string} botToken - The bot token.
 * @param {string} method - Telegram API method name (e.g., 'getMe', 'sendMessage').
 * @param {object} [data] - Request body data (usually for POST methods).
 * @param {string} [httpMethod='post'] - HTTP method to use ('get' or 'post').
 * @returns {Promise<object>} Telegram API response result.
 */
const makeTelegramRequest = async (botToken, method, data = {}, httpMethod = 'post') => {
  const requestUrl = `${config.apiBase}/bot${botToken}/${method}`;
  const requestMethod = httpMethod.toLowerCase();
  console.log(`[Telegram Request] ${requestMethod.toUpperCase()} ${requestUrl}`);
  if (data && Object.keys(data).length > 0) console.log(`[Telegram Request] Data: ${JSON.stringify(data)}`);

  try {
    // ======================================================
    // ACTUAL API CALL - Uncomment and adjust when ready
    // ======================================================
    /*
    const response = await axios({
      method: requestMethod,
      url: requestUrl,
      data: requestMethod === 'post' ? data : null,
      params: requestMethod === 'get' ? data : null,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('[Telegram Response] Status:', response.status);
    console.log('[Telegram Response] Data:', response.data);

    // Telegram API specific error handling
    if (!response.data.ok) { // 'ok: false' indicates an error
      throw new Error(`Telegram API Error: ${response.data.description} (Code: ${response.data.error_code})`);
    }
    return response.data.result; // Return the actual result object
    */
    
    // ======================================================
    // MOCK RESPONSE (REMOVE WHEN USING REAL API CALL)
    // ======================================================
    console.warn('[MOCK] Telegram API call not executed. Returning mock data.');
    if (method === 'getMe') { // Mock response for token verification
      return {
        id: Math.floor(Math.random() * 1000000000),
        is_bot: true,
        first_name: 'Mock Bot',
        username: 'MockBotUsername',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: false
      };
    } else if (method === 'sendMessage') { // Mock response for sending message
        return {
            message_id: Math.floor(Math.random() * 10000),
            from: { id: 12345, is_bot: true, first_name: 'Mock Bot', username: 'MockBotUsername' },
            chat: { id: data.chat_id, type: 'private' }, // Assuming private chat for mock
            date: Math.floor(Date.now() / 1000),
            text: data.text
        };
    }
    return { ok: true }; // Default mock
    // ======================================================

  } catch (error) {
    console.error(`Telegram API request failed for ${method}:`, error.response ? error.response.data : error.message);
    const errMsg = error.response?.data?.description || error.message || 'Telegram API request failed';
    throw new Error(errMsg);
  }
};


const telegramStrategy = {
  /**
   * Authorize Telegram by verifying the user-provided Bot Token.
   * @param {string} userId - User ID.
   * @param {Object} authData - Authorization data containing { botToken }.
   * @returns {Object} Authorization result with verified bot info.
   */
  authorize: async (userId, authData) => {
    console.log(`Authorizing Telegram for user ${userId}`);
    const { botToken } = authData;

    if (!botToken || typeof botToken !== 'string' || !botToken.includes(':')) {
      throw new Error('Valid Telegram Bot Token is required.');
    }

    try {
      // --- Verify Token by calling getMe method --- 
      console.log(`Verifying Telegram Bot Token...`);
      const botInfo = await makeTelegramRequest(botToken, 'getMe', {}, 'get');

      if (!botInfo || !botInfo.is_bot) {
        throw new Error('Provided token does not belong to a valid Telegram bot.');
      }

      const accountId = botInfo.id.toString();
      const accountName = botInfo.username || botInfo.first_name;

      console.log(`Telegram Bot Token verified for bot: ${accountName} (ID: ${accountId})`);

      // Store the Bot Token itself as the accessToken, as it's needed for all API calls
      return {
        accountId: accountId,          // Bot User ID
        accountName: accountName,      // Bot Username or First Name
        accessToken: botToken,         // Store the bot token itself
        refreshToken: null,            // No refresh token for bots
        expiresAt: null,               // Bot tokens don't expire
        metadata: {                   // Store other bot info
            firstName: botInfo.first_name,
            isBot: botInfo.is_bot
        }
      };
    } catch (error) {
      console.error('Telegram authorization/verification error:', error);
      if (error.message.includes('Telegram API Error') || error.message.includes('Telegram API request failed')) {
           throw new Error(`Telegram Bot Token verification failed: ${error.message}. Please check the token.`);
      } else {
           throw new Error(`Telegram authorization failed: ${error.message}`);
      }
    }
  },

  /**
   * Refresh access token (Not applicable for Telegram Bots).
   */
  refreshToken: async (userId, accessToken, refreshToken) => {
    console.warn(`Telegram Bot Tokens do not need refreshing. Refresh called for user ${userId}.`);
    return {
      accessToken: accessToken,
      refreshToken: null,
      expiresAt: null
    };
  },

  /**
   * Revoke Telegram access (Mock implementation - just logs).
   */
  revokeAccess: async (userId, platform) => {
    console.log(`[MOCK] Revoking Telegram Bot access for user ${userId}. Token removal should happen in database. Bot owner can revoke token via BotFather.`);
    // In a real app, you'd delete the stored token.
    return true;
  },
  
  /**
   * Post content (send message) to Telegram.
   * @param {string} userId - User ID
   * @param {Object} platformData - Platform connection data (containing accessToken = botToken)
   * @param {Object} contentData - Content to post { chatId, messageText }
   * @returns {Object} Result of the send operation (Telegram Message object)
   */
  postContent: async (userId, platformData, contentData) => {
    const botToken = platformData.access_token; // The Bot Token
    const botId = platformData.account_id;
    const { chatId, messageText } = contentData;

    if (!botToken) {
      throw new Error('Telegram Bot Token missing in platform data.');
    }
    if (!chatId || !messageText) {
      throw new Error('Chat ID and message text are required for Telegram.');
    }

    const method = 'sendMessage';
    const messageData = {
      chat_id: chatId, 
      text: messageText,
      // Optional: parse_mode: 'HTML' or 'MarkdownV2'
      // Optional: disable_web_page_preview: true
      // etc.
    };

    try {
      const responseResult = await makeTelegramRequest(botToken, method, messageData, 'post');
      
      const messageId = responseResult.message_id;
      console.log(`Telegram message sent successfully to chat ${chatId}. Message ID: ${messageId}`);
      
      return {
        success: true,
        postId: messageId.toString(), // Use Telegram message ID
        metadata: { 
            chatId: chatId,
            fromBotId: responseResult.from?.id || botId,
            date: responseResult.date 
        }
      };
    } catch (error) {       
      console.error(`Error sending Telegram message to chat ${chatId}:`, error);
      throw new Error(`Failed to send Telegram message: ${error.message}`);
    }
  }
};

module.exports = telegramStrategy; 