const supabase = require('../config/supabase');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const franc = require('franc'); // Language detection library

// Initialize Gemini (AI intent recognition)
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" }) : null;

// Simple cache for conditions (improve with TTL or LRU cache if needed)
const conditionCache = {};

// User context storage (in-memory for simplicity, replace with DB lookup)
const userContextStore = {}; 

/**
 * Fetches conditions from Supabase or cache
 * @param {Array<string>} conditionIds - Array of condition IDs
 * @returns {Promise<Array<Object>>} - Array of condition objects
 */
async function getConditions(conditionIds) {
  const conditionsToFetch = [];
  const cachedConditions = [];

  for (const id of conditionIds) {
    if (conditionCache[id]) {
      cachedConditions.push(conditionCache[id]);
    } else {
      conditionsToFetch.push(id);
    }
  }

  if (conditionsToFetch.length === 0) {
    return cachedConditions;
  }

  try {
    const { data, error } = await supabase
      .from('auto_reply_conditions')
      .select('*')
      .in('id', conditionsToFetch);

    if (error) throw error;
    
    // Add fetched conditions to cache
    data.forEach(condition => {
      conditionCache[condition.id] = condition;
    });

    return [...cachedConditions, ...data];
  } catch (error) {
    console.error('Error fetching conditions:', error);
    return cachedConditions; // Return cached ones even if fetch fails
  }
}

/**
 * Fetches user context (example implementation)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User context object
 */
async function getUserContext(userId) {
  // Replace with actual database lookup logic
  // Example: Fetch last 5 interactions, user preferences, etc.
  return userContextStore[userId] || { interactionHistory: [] };
}

/**
 * Updates user context (example implementation)
 * @param {string} userId - User ID
 * @param {Object} message - Incoming message
 * @param {Object} reply - Reply sent
 */
async function updateUserContext(userId, message, reply) {
  // Replace with actual database update logic
  const context = userContextStore[userId] || { interactionHistory: [] };
  context.interactionHistory.push({
    userMessage: message.text,
    reply: reply ? reply.text : null,
    timestamp: new Date(),
    matchType: reply ? reply.matchType : 'none'
  });
  // Limit history size
  if (context.interactionHistory.length > 10) {
    context.interactionHistory.shift();
  }
  userContextStore[userId] = context;
}

/**
 * Auto-reply service for handling message matching and response generation
 */
class AutoReplyService {
  /**
   * Process an incoming message and find an appropriate auto-reply
   * @param {Object} message - The incoming message object
   * @param {string} message.text - The message text
   * @param {string} message.platform - The platform the message came from
   * @param {Object} message.sender - Information about the sender (id, name, etc.)
   * @param {Date} message.timestamp - When the message was received
   * @param {Object} options - Processing options
   * @param {boolean} options.useIntentRecognition - Whether to use AI intent recognition
   * @param {boolean} options.personalizeResponse - Whether to personalize the response
   * @param {boolean} options.useContext - Whether to use user context
   * @returns {Promise<Object|null>} The response object { text, ruleId?, intentId?, matchType } or null if no match
   */
  async processMessage(message, options = {}) {
    const { 
      useIntentRecognition = true, 
      personalizeResponse = true,
      useContext = true
    } = options;
    
    let reply = null;
    const startTime = Date.now();
    
    try {
      // 1. Detect Language
      const detectedLang = franc(message.text, { minLength: 3, only: ['eng', 'cmn', 'msa'] }) || 'und'; // ISO 639-3 codes (English, Mandarin, Malay)
      const targetLang = (detectedLang !== 'und' && detectedLang !== 'eng') ? detectedLang : 'default'; // Use specific language or default

      // 2. Get User Context (if enabled)
      const userContext = useContext && message.sender.id ? await getUserContext(message.sender.id) : null;
      
      // 3. Find Direct Match (Rule-based)
      reply = await this.findDirectMatch(message, targetLang, userContext);
      
      // 4. Find Intent Match (AI-based, if no direct match and enabled)
      if (!reply && useIntentRecognition && geminiModel) {
        reply = await this.findIntentMatch(message, targetLang, userContext);
      }
      
      // 5. Personalize Response (if reply found and enabled)
      if (reply && personalizeResponse) {
        reply.text = await this.personalizeResponse(reply.text, message, userContext);
      }

      // 6. Update User Context (if enabled)
      if (useContext && message.sender.id) {
        await updateUserContext(message.sender.id, message, reply);
      }
      
      // Add processing time to the response
      if (reply) {
        reply.processingTime = Date.now() - startTime;
      }
      
      // 7. Log the message and response to the database
      await this.logMessage(message, reply);
      
      return reply;
    } catch (error) {
      console.error('Error processing message for auto-reply:', error);
      // Still try to log the message even if processing failed
      try {
        await this.logMessage(message, null);
      } catch (logError) {
        console.error('Error logging message:', logError);
      }
      return null;
    }
  }
  
  /**
   * Find a direct match using rules, considering language and context
   * @param {Object} message - The incoming message
   * @param {string} targetLang - Detected language code or 'default'
   * @param {Object|null} userContext - User context data
   * @returns {Promise<Object|null>} Matching response or null
   */
  async findDirectMatch(message, targetLang, userContext) {
    try {
      // Fetch active rules matching the language or default
      const { data: rules, error } = await supabase
        .from('auto_reply_rules')
        .select('*')
        .eq('is_active', true)
        .in('language', [targetLang, 'default']) // Match specific language or default
        .order('language', { ascending: false }); // Prioritize specific language matches
      
      if (error) throw error;
      if (!rules || rules.length === 0) return null;
      
      // Iterate through rules to find the best match
      for (const rule of rules) {
        const isMatch = await this.checkRuleMatch(rule, message);
        if (isMatch) {
          // Check conditions if they exist
          if (rule.conditions && rule.conditions.length > 0) {
            const conditionsMet = await this.evaluateConditions(rule.conditions, message, userContext);
            if (!conditionsMet) continue; // Skip if conditions fail
          }
          
          return {
            text: rule.response,
            ruleId: rule.id,
            matchType: 'direct'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding direct match:', error);
      return null;
    }
  }
  
  /**
   * Check if a rule matches the message text
   * @param {Object} rule - The rule object
   * @param {Object} message - The message object
   * @returns {Promise<boolean>} True if matches
   */
  async checkRuleMatch(rule, message) {
    const { keyword, match_type, is_regex } = rule;
    const messageTextLower = message.text.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    
    if (is_regex) {
      try {
        const pattern = new RegExp(keyword, 'i'); // Case insensitive regex
        return pattern.test(message.text);
      } catch (e) {
        console.error('Invalid regex pattern in rule:', rule.id, keyword, e);
        return false;
      }
    } else {
      switch (match_type) {
        case 'exact':
          return messageTextLower === keywordLower;
        case 'contains':
          return messageTextLower.includes(keywordLower);
        case 'starts_with':
          return messageTextLower.startsWith(keywordLower);
        case 'ends_with':
          return messageTextLower.endsWith(keywordLower);
        case 'fuzzy':
          return this.fuzzyMatch(keywordLower, messageTextLower);
        default:
          console.warn(`Unknown match_type: ${match_type} for rule ${rule.id}`);
          return false;
      }
    }
  }

  /**
   * Simple fuzzy matching logic (example)
   * @param {string} keyword 
   * @param {string} text 
   * @returns {boolean}
   */
  fuzzyMatch(keyword, text) {
    // Example: Levenshtein distance or similar could be used here
    // Simple word overlap for now:
    const keywordWords = keyword.split(/\s+/).filter(w => w.length > 2); // Ignore short words
    const textWords = new Set(text.split(/\s+/));
    if (keywordWords.length === 0) return false;

    let matches = 0;
    keywordWords.forEach(word => {
        if (textWords.has(word)) {
            matches++;
        }
    });
    // Match if > 60% of keyword words are present in the text
    return (matches / keywordWords.length) > 0.6;
  }
  
  /**
   * Evaluate rule conditions against message and context
   * @param {Array<string>} conditionIds - Array of condition IDs
   * @param {Object} message - The message object
   * @param {Object|null} userContext - User context data
   * @returns {Promise<boolean>} True if all conditions are met
   */
  async evaluateConditions(conditionIds, message, userContext) {
    try {
      const conditionObjects = await getConditions(conditionIds);
      if (conditionObjects.length !== conditionIds.length) {
        console.warn('Could not fetch all conditions for rule');
        // Decide handling: fail closed or open? Fail closed for now.
        return false;
      }

      for (const condition of conditionObjects) {
        const result = await this.evaluateSingleCondition(condition, message, userContext);
        if (!result) return false; // Early exit if one condition fails
      }
      
      return true; // All conditions passed
    } catch (error) {
      console.error('Error evaluating conditions:', error);
      return false; // Fail closed on error
    }
  }
  
  /**
   * Evaluate a single condition
   * @param {Object} condition - Condition object from DB
   * @param {Object} message - Message object
   * @param {Object|null} userContext - User context object
   * @returns {Promise<boolean>} True if condition is met
   */
  async evaluateSingleCondition(condition, message, userContext) {
    const { type, parameters } = condition;
    
    try {
      switch (type) {
        case 'time':
          return this.evaluateTimeCondition(parameters, message.timestamp);
        case 'user':
          return this.evaluateUserCondition(parameters, message.sender, userContext);
        case 'platform':
          return this.evaluatePlatformCondition(parameters, message.platform);
        case 'context': // New condition type for user context
          return this.evaluateContextCondition(parameters, userContext);
        default:
          console.warn(`Unknown condition type: ${type}`);
          return true; // Default to true (or false based on policy)
      }
    } catch (evalError) {
        console.error(`Error evaluating condition type ${type}:`, evalError);
        return false; // Fail condition on evaluation error
    }
  }
  
  // --- Condition Evaluation Logic --- //

  evaluateTimeCondition(parameters, timestamp) {
    const { dayOfWeek, timeOfDayStart, timeOfDayEnd, dateRangeStart, dateRangeEnd } = parameters;
    const messageDate = new Date(timestamp);

    if (dayOfWeek && Array.isArray(dayOfWeek) && dayOfWeek.length > 0) {
      if (!dayOfWeek.includes(messageDate.getDay())) return false;
    }
    if (timeOfDayStart !== undefined && timeOfDayEnd !== undefined) {
      const messageHour = messageDate.getHours();
      if (messageHour < timeOfDayStart || messageHour >= timeOfDayEnd) return false;
    }
    if (dateRangeStart && dateRangeEnd) {
      const startDate = new Date(dateRangeStart);
      const endDate = new Date(dateRangeEnd);
      if (messageDate < startDate || messageDate > endDate) return false;
    }
    return true;
  }

  evaluateUserCondition(parameters, sender, userContext) {
    const { userId, userType, attributes } = parameters;
    
    if (userId) {
      if (Array.isArray(userId) ? !userId.includes(sender.id) : userId !== sender.id) return false;
    }
    // User type might come from sender info or context
    const currentUserType = sender.userType || (userContext ? userContext.userType : null);
    if (userType && currentUserType !== userType) return false;
    
    if (attributes && typeof attributes === 'object') {
      const userDataSource = { ...sender, ...(userContext || {}) }; // Combine sources
      for (const [key, value] of Object.entries(attributes)) {
        if (userDataSource[key] !== value) return false;
      }
    }
    return true;
  }

  evaluatePlatformCondition(parameters, platform) {
    const { platforms } = parameters;
    if (platforms && Array.isArray(platforms) && platforms.length > 0) {
      return platforms.includes(platform);
    }
    return true; // No platform restriction
  }

  evaluateContextCondition(parameters, userContext) {
    if (!userContext) return false; // Cannot evaluate context if none exists
    const { interactionHistory } = userContext;
    const { 
        previousIntent, // Check the intent of the last interaction
        messageCount // Check number of messages in history
    } = parameters;

    if (previousIntent) {
        const lastInteraction = interactionHistory.length > 0 ? interactionHistory[interactionHistory.length - 1] : null;
        if (!lastInteraction || lastInteraction.matchType !== 'intent' || lastInteraction.intentName !== previousIntent) {
            return false;
        }
    }
    if (messageCount !== undefined) {
        if (interactionHistory.length < messageCount) {
            return false;
        }
    }
    // Add more context checks as needed
    return true;
  }

  // --- Intent Matching --- //

  /**
   * Find an intent match using AI, considering language and context
   * @param {Object} message - The message object
   * @param {string} targetLang - Language code or 'default'
   * @param {Object|null} userContext - User context data
   * @returns {Promise<Object|null>} Matching intent response or null
   */
  async findIntentMatch(message, targetLang, userContext) {
    if (!geminiModel) return null;
    
    try {
      // Fetch active intents for the target language or default
      const { data: intents, error } = await supabase
        .from('auto_reply_intents')
        .select('*')
        .eq('is_active', true)
        .in('language', [targetLang, 'default'])
        .order('language', { ascending: false }); // Prioritize specific language
      
      if (error) throw error;
      if (!intents || intents.length === 0) return null;
      
      // Construct prompt for Gemini
      const prompt = this.buildIntentPrompt(message, intents, userContext);
      
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const identifiedIntentName = response.text().trim();
      
      // Find the intent object by the identified name
      const matchedIntent = intents.find(intent => 
        intent.name.toLowerCase() === identifiedIntentName.toLowerCase()
      );
      
      if (matchedIntent) {
        return {
          text: matchedIntent.response,
          intentId: matchedIntent.id,
          intentName: matchedIntent.name, // Include name for context update
          matchType: 'intent'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding intent match:', error);
      return null;
    }
  }

  /**
   * Builds the prompt for Gemini intent recognition
   */
  buildIntentPrompt(message, intents, userContext) {
      let prompt = `Identify the single best matching intent for the user message. Respond ONLY with the intent name or "none".

User Message: "${message.text}"

Available Intents:
`;
      intents.forEach(intent => {
          prompt += `- ${intent.name}: (Examples: ${intent.examples.slice(0,3).join(', ')}${intent.examples.length > 3 ? '...' : ''})
`;
      });

      // Add context if available
      if (userContext && userContext.interactionHistory && userContext.interactionHistory.length > 0) {
          const lastInteraction = userContext.interactionHistory[userContext.interactionHistory.length - 1];
          prompt += `
Previous interaction context:
User said: "${lastInteraction.userMessage}"
We replied: "${lastInteraction.reply || 'No reply given'}" (Match: ${lastInteraction.matchType})
`;
      }

      prompt += `
Identified Intent Name:`;
      return prompt;
  }

  // --- Response Personalization --- //

  /**
   * Personalize the response text using placeholders and AI
   * @param {string} responseText - Original response text
   * @param {Object} message - Message object
   * @param {Object|null} userContext - User context
   * @returns {Promise<string>} Personalized response text
   */
  async personalizeResponse(responseText, message, userContext) {
    let personalizedText = responseText;
    const sender = message.sender;
    const context = { ...sender, ...(userContext || {}) }; // Combined context

    try {
      // Replace basic placeholders like {user}, {platform}
      personalizedText = personalizedText.replace(/\{(user|senderName)\}/gi, sender.name || 'there');
      personalizedText = personalizedText.replace(/\{platform\}/gi, message.platform || 'this platform');
      
      // Replace context placeholders like {userType}, {lastPurchaseDate}
      personalizedText = personalizedText.replace(/\{(\w+)\}/g, (match, key) => {
          return context[key] !== undefined ? context[key] : match; // Replace if key exists in context
      });

      // Time-based placeholders
      const now = new Date();
      personalizedText = personalizedText
          .replace(/\{time\}/gi, now.toLocaleTimeString())
          .replace(/\{date\}/gi, now.toLocaleDateString());

      // Handle AI personalization {ai:instruction}
      if (geminiModel && personalizedText.includes('{ai:')) {
        personalizedText = await this.handleAIPersonalization(personalizedText, message, context);
      }
      
      return personalizedText;
    } catch (error) {
      console.error('Error personalizing response:', error);
      return responseText; // Fallback to original text
    }
  }

  /**
   * Handle AI personalization placeholders {ai:instruction}
   */
  async handleAIPersonalization(text, message, context) {
    const aiRegex = /\{ai:(.*?)\}/gi;
    let processedText = text;
    let match;

    // Use Promise.all to handle multiple AI calls concurrently if needed
    const aiPromises = [];

    while ((match = aiRegex.exec(text)) !== null) {
      const [fullMatch, instruction] = match;
      
      const prompt = `Based on the user message and context, fulfill the instruction: "${instruction}".
      Keep the response brief and conversational, suitable for a chat reply.

      User Message: "${message.text}"
      User Name: ${context.name || 'Unknown'}
      Platform: ${message.platform || 'Unknown'}
      Context: ${JSON.stringify(context.interactionHistory || [])}
      
      Generated text:`;
      
      aiPromises.push(
          geminiModel.generateContent(prompt)
              .then(result => result.response.text().trim())
              .then(generatedText => ({ fullMatch, generatedText }))
              .catch(err => {
                  console.error('AI personalization failed for instruction:', instruction, err);
                  return { fullMatch, generatedText: '' }; // Replace with empty string on error
              })
      );
    }

    const results = await Promise.all(aiPromises);
    results.forEach(({ fullMatch, generatedText }) => {
        processedText = processedText.replace(fullMatch, generatedText);
    });

    return processedText;
  }

  /**
   * Get usage statistics for auto-reply
   * @param {string} timeRange - Time range for statistics: 'day', 'week', 'month'
   * @returns {Promise<Object>} Statistics object
   */
  async getStats(timeRange = 'week') {
    try {
      // In a real implementation, this would query the database for actual statistics
      // For now, we'll return mock data
      
      // Get rule counts
      const { data: rules, error } = await supabase
        .from('auto_reply_rules')
        .select('id, is_active');
        
      if (error) throw error;
      
      const activeRules = rules.filter(rule => rule.is_active).length;
      const totalRules = rules.length;
      
      // Generate mock daily triggers
      const dailyTriggers = this.generateMockDailyTriggers(timeRange);
      
      // Generate mock top rules
      const topRules = await this.getMockTopRules(5);
      
      return {
        totalRules,
        activeRules,
        disabledRules: totalRules - activeRules,
        lastUpdated: new Date().toISOString(),
        status: 'normal', // Could be 'normal', 'warning', 'error', 'maintenance'
        dailyTriggers,
        topRules,
        unmatchedStats: {
          count: Math.floor(Math.random() * 100),
          examples: [
            'Can you help me with my insurance policy?',
            'What are your opening hours?',
            'I need to speak with a human agent'
          ]
        }
      };
    } catch (error) {
      console.error('Error getting auto-reply stats:', error);
      throw error;
    }
  }
  
  /**
   * Generate mock daily triggers for demo purposes
   * @param {string} timeRange - Time range for statistics
   * @returns {Array} Array of daily trigger data
   */
  generateMockDailyTriggers(timeRange) {
    const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    const result = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      result.unshift({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 50
      });
    }
    
    return result;
  }
  
  /**
   * Get mock top rules for demo purposes
   * @param {number} limit - Number of top rules to return
   * @returns {Promise<Array>} Array of top rule data
   */
  async getMockTopRules(limit = 5) {
    try {
      // Get some actual rules to use for the mock data
      const { data: rules, error } = await supabase
        .from('auto_reply_rules')
        .select('id, keyword, name')
        .limit(limit);
        
      if (error) throw error;
      
      // Add mock trigger counts
      return rules.map(rule => ({
        ...rule,
        triggerCount: Math.floor(Math.random() * 100) + 10
      })).sort((a, b) => b.triggerCount - a.triggerCount);
    } catch (error) {
      console.error('Error getting mock top rules:', error);
      return [];
    }
  }
  
  /**
   * Get recent activities for auto-reply
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Array of activity data
   */
  async getRecentActivities(limit = 10) {
    try {
      // In a real implementation, this would query an activity log table
      // For now, return mock data
      const platforms = ['web', 'mobile', 'whatsapp', 'messenger'];
      const results = ['matched', 'unmatched'];
      const now = new Date();
      
      const activities = [];
      
      // Get some actual rules to reference
      const { data: rules, error } = await supabase
        .from('auto_reply_rules')
        .select('id')
        .limit(5);
        
      if (error) throw error;
      
      const ruleIds = rules.map(rule => rule.id);
      
      for (let i = 0; i < limit; i++) {
        const timestamp = new Date(now);
        timestamp.setMinutes(now.getMinutes() - i * 15 - Math.floor(Math.random() * 10));
        
        const result = results[Math.floor(Math.random() * results.length)];
        
        activities.push({
          id: `act-${i}`,
          type: 'message_processed',
          timestamp: timestamp.toISOString(),
          platform: platforms[Math.floor(Math.random() * platforms.length)],
          result,
          messagePreview: this.generateRandomMessage(),
          responsePreview: result === 'matched' ? this.generateRandomResponse() : null,
          ruleId: result === 'matched' && ruleIds.length > 0 ? 
                  ruleIds[Math.floor(Math.random() * ruleIds.length)] : 
                  null
        });
      }
      
      return activities;
    } catch (error) {
      console.error('Error getting recent activities:', error);
      throw error;
    }
  }
  
  /**
   * Get performance metrics
   * @param {string} timeRange - Time range for metrics: 'day', 'week', 'month'
   * @returns {Promise<Object>} Performance metrics object
   */
  async getPerformanceMetrics(timeRange = 'day') {
    try {
      // In a real implementation, this would query performance metrics
      // For now, return mock data
      
      // Adjust values based on time range
      const multiplier = timeRange === 'day' ? 1 : timeRange === 'week' ? 1.2 : 1.5;
      
      return {
        avgResponseTime: Math.round(120 + Math.random() * 30 * multiplier),
        p95ResponseTime: Math.round(280 + Math.random() * 60 * multiplier),
        successRate: (99.5 + Math.random() * 0.5).toFixed(1),
        errorRate: (0.1 + Math.random() * 0.4).toFixed(1),
        apiCalls: {
          total: Math.round(2000 + Math.random() * 1000 * multiplier),
          today: Math.round(200 + Math.random() * 100)
        },
        aiCalls: {
          total: Math.round(800 + Math.random() * 400 * multiplier),
          today: Math.round(50 + Math.random() * 50)
        }
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }
  
  /**
   * Generate a random message for mock data
   * @returns {string} Random message
   */
  generateRandomMessage() {
    const messages = [
      'Hello, can you help me?',
      'What are your business hours?',
      'I need information about shipping',
      'How can I track my order?',
      'Is there a discount code available?',
      'When will my order arrive?',
      'Do you have this product in stock?',
      'I have a problem with my account'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  /**
   * Generate a random response for mock data
   * @returns {string} Random response
   */
  generateRandomResponse() {
    const responses = [
      'Hi there! Of course, I\'m here to help!',
      'Our business hours are Monday-Friday, 9AM-5PM.',
      'We offer standard and expedited shipping options. Standard shipping takes 3-5 business days.',
      'You can track your order in your account or using the tracking number we sent in your confirmation email.',
      'You can use WELCOME10 for 10% off your first purchase.',
      'Orders typically arrive within 3-5 business days.',
      'Let me check our inventory. Please provide the product name or code.',
      'I\'m sorry to hear that. Could you please provide more details about the issue?'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Log message and response to the database
   * @param {Object} message - The incoming message
   * @param {Object|null} response - The response or null if no match
   * @returns {Promise<void>}
   */
  async logMessage(message, response) {
    try {
      const { text, platform, sender, timestamp = new Date() } = message;
      
      const { error } = await supabase
        .from('message_logs')
        .insert([
          { 
            text, 
            platform, 
            sender, 
            response, 
            timestamp 
          }
        ]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error logging message:', error);
      // Don't throw - logging should not interrupt the main flow
    }
  }
}

// Initialize and export the service singleton
module.exports = new AutoReplyService(); 