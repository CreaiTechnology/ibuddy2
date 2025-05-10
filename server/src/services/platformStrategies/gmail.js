/**
 * Gmail Platform Integration Strategy (using googleapis)
 */
const { google } = require('googleapis');
const axios = require('axios'); // Keep axios for potential direct calls if needed

// Google Cloud API Configuration - GET THESE FROM ENVIRONMENT VARIABLES
const config = {
  clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/platforms/gmail/callback'
};

// --- Helper function to create an OAuth2 client ---
const createOAuth2Client = () => {
  if (!config.clientId || !config.clientSecret || config.clientId === 'YOUR_GOOGLE_CLIENT_ID') {
    console.error('Google Cloud credentials (Client ID or Secret) are not configured!');
    // Avoid throwing here so the module can load, but check in methods
    return null;
  }
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
};

const gmailStrategy = {
  /**
   * Generate the Google OAuth 2.0 authorization URL for Gmail access.
   */
  getAuthUrl: async (userId) => {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      throw new Error('Google Cloud integration is not configured correctly.');
    }

    // Define required scopes. Adjust based on needed permissions.
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',    // Get user's email address
      'https://www.googleapis.com/auth/userinfo.profile',  // Get user's basic profile info (name, picture)
      'https://www.googleapis.com/auth/gmail.send',         // Allow sending emails
      // 'https://www.googleapis.com/auth/gmail.readonly', // Allow reading emails (if needed)
      // Add other Gmail scopes as necessary (e.g., labels, modify, etc.)
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      prompt: 'consent'       // Ensure refresh token is granted, even on re-auth
    });

    console.log(`Generated Google Auth URL for user ${userId}: ${authUrl}`);
    return { authUrl };
  },

  /**
   * Authorize Gmail using the callback code.
   */
  authorize: async (userId, authData) => {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      throw new Error('Google Cloud integration is not configured correctly.');
    }
    if (!authData.code) {
      throw new Error('Authorization code is required from Google callback');
    }

    try {
      // --- Exchange code for tokens --- 
      console.log(`Exchanging Google auth code for user ${userId}`);
      const { tokens } = await oauth2Client.getToken(authData.code);
      console.log(`Tokens received for user ${userId}:`, tokens); // Contains access_token, refresh_token, expiry_date, id_token, etc.

      if (!tokens.access_token) {
          throw new Error('Access token not received from Google');
      }
      // IMPORTANT: Store the refresh_token securely associated with the userId
      // It's typically only returned the first time the user authorizes.
      const refreshToken = tokens.refresh_token;
      const accessToken = tokens.access_token;
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

      // --- Get User Info --- 
      oauth2Client.setCredentials(tokens);
      // Use OAuth2 API to get user info from the id_token or userinfo endpoint
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfoResponse = await oauth2.userinfo.get();
      const userInfo = userInfoResponse.data;
      console.log(`User info received for ${userId}:`, userInfo); // Contains id, email, name, picture, etc.
      
      const accountId = userInfo.id; // Google User ID
      const accountName = userInfo.email; // Use email as the primary display name

      return {
        accountId: accountId,
        accountName: accountName,
        accessToken: accessToken,
        refreshToken: refreshToken, // Return refresh token for service layer to store
        expiresAt: expiresAt,
        metadata: { // Store other useful info
          name: userInfo.name,
          picture: userInfo.picture,
          email: userInfo.email
        }
      };
    } catch (error) {       
      console.error('Google authorization error:', error.response ? error.response.data : error.message);
      throw new Error(`Google authorization failed: ${error.message}`);
    }
  },

  /**
   * Refresh access token for Gmail using a stored refresh token.
   * @param {string} userId - User ID
   * @param {string} currentAccessToken - (Not typically needed for refresh)
   * @param {string} currentRefreshToken - The stored refresh token for the user
   */
  refreshToken: async (userId, currentAccessToken, currentRefreshToken) => {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      throw new Error('Google Cloud integration is not configured correctly.');
    }
    if (!currentRefreshToken) {
      throw new Error('Refresh token is required to refresh Google access');
    }

    try {
        console.log(`Refreshing Google token for user ${userId} using refresh token.`);
        oauth2Client.setCredentials({ refresh_token: currentRefreshToken });
        
        // refreshAccessToken should automatically use the refresh token
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('New Google credentials obtained:', credentials);
        
        const newAccessToken = credentials.access_token;
        const newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null;
        
        if (!newAccessToken) {
            throw new Error('Refreshed access token not received from Google');
        }
        
        // Note: A new refresh token is usually NOT returned here.
        return {
            accessToken: newAccessToken,
            refreshToken: currentRefreshToken, // Return the same refresh token
            expiresAt: newExpiresAt
        };
    } catch (error) {
        console.error('Google token refresh error:', error.response ? error.response.data : error.message);
        // Handle specific errors like invalid_grant (refresh token revoked/expired)
        if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
             throw new Error('Google refresh token is invalid or revoked. User needs to re-authenticate.');
        }
        throw new Error(`Google token refresh failed: ${error.message}`);
    }
  },

  /**
   * Revoke Google access using a stored token.
   * @param {string} userId - User ID
   * @param {Object} platform - Platform data containing accessToken or refreshToken
   */
  revokeAccess: async (userId, platform) => {
    const oauth2Client = createOAuth2Client();
     if (!oauth2Client) {
      console.warn('Google Cloud integration not configured, cannot revoke token.');
      return false; // Or throw? Depends on desired behavior
    }
    
    // Google's revoke endpoint usually works with either access or refresh token
    const tokenToRevoke = platform.refreshToken || platform.accessToken;
     if (!tokenToRevoke) {
      console.warn(`No token found for user ${userId} to revoke Google access.`);
      return false; // Cannot revoke without a token
    }
    
    try {
        console.log(`Revoking Google access for user ${userId}`);
        const revokeResult = await oauth2Client.revokeToken(tokenToRevoke);
        console.log('Google token revocation result:', revokeResult.status, revokeResult.statusText);
        // Check status, should be 200 OK
        if (revokeResult.status === 200) {
             return true;
        } else {
             console.error('Google token revocation failed with status:', revokeResult.status);
             return false;
        }
    } catch (error) {
        console.error('Google token revocation error:', error.response ? error.response.data : error.message);
        // Don't necessarily throw, as the token might already be invalid
        return false; 
    }
  },

  /**
   * Post content (send email) using Gmail API.
   * @param {string} userId - User ID
   * @param {Object} platformData - Platform connection data (needs accessToken, potentially refreshToken)
   * @param {Object} contentData - Content to post { to, subject, body }
   */
  postContent: async (userId, platformData, contentData) => {
    const oauth2Client = createOAuth2Client();
     if (!oauth2Client) {
      throw new Error('Google Cloud integration is not configured correctly.');
    }
    
    const { to, subject, body } = contentData;
    if (!to || !subject || !body) {
      throw new Error('Recipient (to), subject, and body are required to send email.');
    }
    
    let accessToken = platformData.access_token;
    const refreshToken = platformData.refresh_token;
    const expiresAt = platformData.expires_at ? new Date(platformData.expires_at) : null;
    
    // --- Check if token needs refresh --- 
    if (expiresAt && expiresAt < new Date() && refreshToken) {
        console.log(`Gmail access token expired for user ${userId}, attempting refresh.`);
        try {
            const refreshed = await gmailStrategy.refreshToken(userId, accessToken, refreshToken);
            accessToken = refreshed.accessToken; 
            // Here, the platformService should ideally update the stored token/expiry
        } catch (refreshError) {
            console.error(`Failed to refresh Gmail token for user ${userId}:`, refreshError);
            throw new Error(`Gmail token expired and refresh failed: ${refreshError.message}. Please re-authenticate.`);
        }
    } else if (!accessToken) {
         throw new Error('Missing Gmail access token.');
    }
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // --- Construct and Send Email --- 
    // Emails need to be base64 encoded
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      body
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      console.log(`Sending email via Gmail for user ${userId} to ${to}`);
      const response = await gmail.users.messages.send({
        userId: 'me', // 'me' indicates the authenticated user
        requestBody: {
          raw: encodedMessage
        }
      });
      
      const messageId = response.data.id;
      console.log(`Gmail email sent successfully for user ${userId}. Message ID: ${messageId}`);
      
      return {
        success: true,
        postId: messageId, // Use Gmail message ID
        metadata: { recipient: to, subject: subject }
      };
    } catch (error) {
      console.error(`Error sending Gmail email for user ${userId}:`, error.response ? error.response.data.error : error.message);
      const errMsg = error.response?.data?.error?.message || error.message || 'Failed to send Gmail email';
      throw new Error(errMsg);
    }
  }
};

module.exports = gmailStrategy; 