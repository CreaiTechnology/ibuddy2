/**
 * Context service for the AI Service
 * Manages user conversation history and context
 * Multi-level context storage system (short-term, mid-term, long-term)
 */
const cacheService = require('./cacheService');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const natural = require('natural');
const { TfIdf } = natural;

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Context window sizes
const SHORT_TERM_WINDOW_SIZE = parseInt(process.env.SHORT_TERM_WINDOW_SIZE || '5');
const MID_TERM_WINDOW_SIZE = parseInt(process.env.MID_TERM_WINDOW_SIZE || '15');
const LONG_TERM_WINDOW_SIZE = parseInt(process.env.LONG_TERM_WINDOW_SIZE || '50');

// Context compression settings
const ENABLE_CONTEXT_COMPRESSION = process.env.ENABLE_CONTEXT_COMPRESSION === 'true';
const COMPRESSION_THRESHOLD = parseInt(process.env.COMPRESSION_THRESHOLD || '10');
const COMPRESSION_TARGET = parseInt(process.env.COMPRESSION_TARGET || '5');

// Check if Supabase is configured
const useSupabase = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

// Initialize Supabase client
const supabase = useSupabase 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// In-memory context store (used when Supabase is not configured)
const memoryContextStore = {};

/**
 * Get user context
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (optional)
 * @param {string} contextLevel - Context level (short/mid/long or null for all)
 * @returns {Promise<Object>} User context
 */
async function getUserContext(userId, sessionId = null, contextLevel = null) {
  // Cache key
  const contextKey = `context:${userId}${sessionId ? `:${sessionId}` : ''}`;
  
  // Check cache first
  const cachedContext = await cacheService.get(contextKey);
  if (cachedContext) {
    const fullContext = JSON.parse(cachedContext);
    
    // If specific context level is requested, return only that level
    if (contextLevel && ['short', 'mid', 'long'].includes(contextLevel)) {
      return {
        ...fullContext,
        history: fullContext[`${contextLevel}TermMemory`] || []
      };
    }
    
    return fullContext;
  }
  
  let context;
  
  if (useSupabase) {
    try {
      // Query by userId and optional sessionId
      let query = supabase
        .from('user_contexts')
        .select('*')
        .eq('user_id', userId);
        
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        query = query.is('session_id', null);
      }
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      if (data) {
        context = data.context;
        
        // Ensure context has proper memory structures
        context = ensureMemoryStructures(context);
      } else {
        // Create default context
        context = createDefaultContext();
        
        // Save to database
        const { error: insertError } = await supabase
          .from('user_contexts')
          .insert({
            user_id: userId,
            session_id: sessionId,
            context
          });
          
        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      console.error('Error fetching user context from Supabase:', error);
      // Fallback to default context
      context = createDefaultContext();
    }
  } else {
    // Use in-memory store
    const storeKey = `${userId}${sessionId ? `:${sessionId}` : ''}`;
    context = memoryContextStore[storeKey] || createDefaultContext();
    
    // Ensure context has proper memory structures
    context = ensureMemoryStructures(context);
  }
  
  // Cache the context
  await cacheService.set(contextKey, JSON.stringify(context), 60 * 30); // 30 min cache
  
  // If specific context level is requested, return only that level
  if (contextLevel && ['short', 'mid', 'long'].includes(contextLevel)) {
    return {
      ...context,
      history: context[`${contextLevel}TermMemory`] || []
    };
  }
  
  return context;
}

/**
 * Update user context with new interaction
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (optional)
 * @param {Object} interaction - Interaction object
 * @returns {Promise<Object>} Updated context
 */
async function updateUserContext(userId, sessionId = null, interaction) {
  // Get current context
  const context = await getUserContext(userId, sessionId);
  
  // Create interaction with metadata
  const interactionWithMetadata = {
    ...interaction,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    importance: calculateInteractionImportance(interaction),
    topics: extractTopics(interaction)
  };
  
  // Update all memory levels
  updateMemoryLevels(context, interactionWithMetadata);
  
  // Update lastActivity timestamp
  context.lastActivity = new Date().toISOString();
  
  // Update interaction count
  context.interactionCount = (context.interactionCount || 0) + 1;
  
  // Update user profile based on interaction
  updateUserProfile(context, interactionWithMetadata);
  
  // Compress context if needed
  if (ENABLE_CONTEXT_COMPRESSION && 
      context.midTermMemory.length > COMPRESSION_THRESHOLD) {
    compressContext(context);
  }
  
  // Save the updated context
  await saveContext(userId, sessionId, context);
  
  return context;
}

/**
 * Update all memory levels with new interaction
 * @param {Object} context - User context
 * @param {Object} interaction - Interaction with metadata
 */
function updateMemoryLevels(context, interaction) {
  // Ensure all memory levels exist
  context.shortTermMemory = context.shortTermMemory || [];
  context.midTermMemory = context.midTermMemory || [];
  context.longTermMemory = context.longTermMemory || [];
  
  // Forward compatability - copy from old history structure if present
  if (context.history && context.history.length > 0 && context.shortTermMemory.length === 0) {
    context.shortTermMemory = [...context.history];
    context.midTermMemory = [...context.history];
    // Only add important historical entries to long-term
    context.longTermMemory = context.history.filter(item => 
      calculateInteractionImportance(item) > 0.7
    );
    // Clear old structure
    delete context.history;
  }
  
  // Add to all memory levels
  context.shortTermMemory.push(interaction);
  context.midTermMemory.push(interaction);
  
  // Only add to long-term memory if important enough
  if (interaction.importance > 0.7) {
    context.longTermMemory.push(interaction);
  }
  
  // Limit memory sizes
  if (context.shortTermMemory.length > SHORT_TERM_WINDOW_SIZE) {
    context.shortTermMemory = context.shortTermMemory.slice(-SHORT_TERM_WINDOW_SIZE);
  }
  
  if (context.midTermMemory.length > MID_TERM_WINDOW_SIZE) {
    context.midTermMemory = context.midTermMemory.slice(-MID_TERM_WINDOW_SIZE);
  }
  
  if (context.longTermMemory.length > LONG_TERM_WINDOW_SIZE) {
    // For long-term memory, remove least important items first
    context.longTermMemory.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    context.longTermMemory = context.longTermMemory.slice(0, LONG_TERM_WINDOW_SIZE);
    // Re-sort by time
    context.longTermMemory.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }
}

/**
 * Calculate the importance of an interaction
 * @param {Object} interaction - Interaction object
 * @returns {number} Importance score (0-1)
 */
function calculateInteractionImportance(interaction) {
  if (!interaction) return 0;
  
  // Default importance
  let importance = 0.5;
  
  // If importance is already calculated, use it
  if (interaction.importance !== undefined) {
    return interaction.importance;
  }
  
  const userMessage = interaction.userMessage || '';
  const aiResponse = interaction.aiResponse || '';
  
  // Factors affecting importance:
  
  // 1. Message length (longer messages may be more substantial)
  const messageLength = userMessage.length + aiResponse.length;
  if (messageLength > 200) importance += 0.1;
  if (messageLength > 500) importance += 0.1;
  
  // 2. Question markers indicate important queries
  if (userMessage.includes('?')) importance += 0.1;
  
  // 3. Key phrases that suggest importance
  const importantPhrases = [
    'important', 'critical', 'essential', 'remember', 'don\'t forget',
    'deadline', 'urgent', 'priority', 'key', 'main', 'significant',
    '重要', '关键', '必须', '记住', '不要忘记', '截止日期', '紧急'
  ];
  
  for (const phrase of importantPhrases) {
    if (userMessage.toLowerCase().includes(phrase.toLowerCase())) {
      importance += 0.15;
      break;
    }
  }
  
  // 4. If the interaction has explicit topics
  if (interaction.topics && interaction.topics.length > 0) {
    importance += 0.1;
  }
  
  // Normalize to 0-1 range
  return Math.min(Math.max(importance, 0), 1);
}

/**
 * Extract topics from an interaction
 * @param {Object} interaction - Interaction object
 * @returns {Array} Array of topics
 */
function extractTopics(interaction) {
  // If already has topics, return them
  if (interaction.topics) return interaction.topics;
  
  const userMessage = interaction.userMessage || '';
  const aiResponse = interaction.aiResponse || '';
  const fullText = `${userMessage} ${aiResponse}`;
  
  // Use TF-IDF to extract potential topics
  const tfidf = new TfIdf();
  tfidf.addDocument(fullText);
  
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 
                    'of', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 
                    'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 
                    'might', 'must', 'shall', '的', '是', '在', '了', '和', '与'];
  
  // Get top terms
  const terms = [];
  tfidf.listTerms(0).forEach(item => {
    const term = item.term.toLowerCase();
    if (term.length > 2 && !stopWords.includes(term)) {
      terms.push(term);
    }
  });
  
  // Take top 5 terms as topics
  return terms.slice(0, 5);
}

/**
 * Compress context to reduce token usage
 * @param {Object} context - User context
 */
function compressContext(context) {
  // Compression mainly targets mid-term memory
  if (!context.midTermMemory || context.midTermMemory.length <= COMPRESSION_TARGET) {
    return;
  }
  
  // Strategy 1: Summarize similar consecutive exchanges
  const compressed = [];
  let currentGroup = [];
  let currentTopic = null;
  
  // Group by topic
  for (const item of context.midTermMemory) {
    const itemTopics = item.topics || [];
    
    // If first item or shares topics with current group, add to group
    if (currentGroup.length === 0 || 
        (currentTopic && itemTopics.some(t => currentTopic.includes(t)))) {
      currentGroup.push(item);
      // Update current topic set
      currentTopic = currentTopic ? 
        [...new Set([...currentTopic, ...itemTopics])] : 
        [...itemTopics];
    } else {
      // Process existing group if it has multiple items
      if (currentGroup.length > 1) {
        compressed.push(summarizeGroup(currentGroup));
      } else if (currentGroup.length === 1) {
        compressed.push(currentGroup[0]);
      }
      
      // Start new group
      currentGroup = [item];
      currentTopic = [...(item.topics || [])];
    }
  }
  
  // Process the last group
  if (currentGroup.length > 1) {
    compressed.push(summarizeGroup(currentGroup));
  } else if (currentGroup.length === 1) {
    compressed.push(currentGroup[0]);
  }
  
  // If compression isn't effective enough, fallback to importance-based filtering
  if (compressed.length > COMPRESSION_TARGET) {
    // Sort by importance and keep highest
    compressed.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    context.midTermMemory = compressed.slice(0, COMPRESSION_TARGET);
    // Re-sort by timestamp
    context.midTermMemory.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  } else {
    context.midTermMemory = compressed;
  }
  
  // Mark as compressed
  context.compressed = true;
  context.lastCompression = new Date().toISOString();
}

/**
 * Summarize a group of related interactions
 * @param {Array} group - Group of related interactions
 * @returns {Object} Summarized interaction
 */
function summarizeGroup(group) {
  if (!group || group.length === 0) return null;
  if (group.length === 1) return group[0];
  
  // Get earliest and latest timestamps
  const timestamps = group.map(item => new Date(item.timestamp));
  const earliestTimestamp = new Date(Math.min(...timestamps));
  const latestTimestamp = new Date(Math.max(...timestamps));
  
  // Collect all topics
  const allTopics = [];
  group.forEach(item => {
    if (item.topics) {
      allTopics.push(...item.topics);
    }
  });
  
  // Get unique topics and sort by frequency
  const topicFrequency = {};
  allTopics.forEach(topic => {
    topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
  });
  
  const uniqueTopics = [...new Set(allTopics)]
    .sort((a, b) => topicFrequency[b] - topicFrequency[a])
    .slice(0, 5); // Keep top 5
  
  // Create summary text
  const itemCount = group.length;
  const topicText = uniqueTopics.join(', ');
  const firstUserMessage = group[0].userMessage;
  const lastUserMessage = group[group.length - 1].userMessage;
  
  const userMessage = `[Summary of ${itemCount} related messages about ${topicText}]`;
  const aiResponse = `[Discussion included: "${firstUserMessage}" → various exchanges → "${lastUserMessage}"]`;
  
  // Determine highest importance
  const maxImportance = Math.max(...group.map(item => item.importance || 0));
  
  // Create summary interaction
  return {
    id: uuidv4(),
    userMessage,
    aiResponse,
    timestamp: earliestTimestamp.toISOString(),
    endTimestamp: latestTimestamp.toISOString(),
    importance: maxImportance, 
    topics: uniqueTopics,
    isSummary: true,
    originalCount: itemCount,
    originalIds: group.map(item => item.id)
  };
}

/**
 * Update user profile based on interaction
 * @param {Object} context - User context
 * @param {Object} interaction - Interaction with metadata
 */
function updateUserProfile(context, interaction) {
  // Ensure user profile exists
  if (!context.userProfile) {
    context.userProfile = {
      topics: {},
      preferences: {},
      traits: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Update topics frequency
  const topics = interaction.topics || [];
  topics.forEach(topic => {
    context.userProfile.topics[topic] = (context.userProfile.topics[topic] || 0) + 1;
  });
  
  // Update last updated timestamp
  context.userProfile.lastUpdated = new Date().toISOString();
}

/**
 * Ensure context has proper memory structures
 * @param {Object} context - User context
 * @returns {Object} Context with memory structures
 */
function ensureMemoryStructures(context) {
  if (!context) {
    return createDefaultContext();
  }
  
  // Ensure all required memory structures exist
  context.shortTermMemory = context.shortTermMemory || [];
  context.midTermMemory = context.midTermMemory || [];
  context.longTermMemory = context.longTermMemory || [];
  
  // Migrate from legacy structure if needed
  if (context.history && !context.shortTermMemory.length) {
    context.shortTermMemory = [...context.history];
    context.midTermMemory = [...context.history];
    // Only add important historical entries to long-term
    context.longTermMemory = context.history.filter(item => 
      calculateInteractionImportance(item) > 0.7
    );
  }
  
  // Ensure user profile exists
  if (!context.userProfile) {
    context.userProfile = {
      topics: {},
      preferences: {},
      traits: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  return context;
}

/**
 * Save context to storage
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (optional)
 * @param {Object} context - Context object
 * @returns {Promise<void>}
 */
async function saveContext(userId, sessionId, context) {
  // Cache key
  const contextKey = `context:${userId}${sessionId ? `:${sessionId}` : ''}`;
  
  // Update cache
  await cacheService.set(contextKey, JSON.stringify(context), 60 * 30); // 30 min cache
  
  if (useSupabase) {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('user_contexts')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          context,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving user context to Supabase:', error);
    }
  } else {
    // Save to memory store
    const storeKey = `${userId}${sessionId ? `:${sessionId}` : ''}`;
    memoryContextStore[storeKey] = context;
  }
}

/**
 * Get chat history for a user
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (optional)
 * @param {string} memoryLevel - Memory level (short/mid/long)
 * @param {number} limit - Max number of history items
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Chat history
 */
async function getChatHistory(userId, sessionId = null, memoryLevel = 'short', limit = 50, offset = 0) {
  // Get user context
  const context = await getUserContext(userId, sessionId);
  
  // Select appropriate memory level
  let history;
  switch (memoryLevel) {
    case 'mid':
      history = context.midTermMemory || [];
      break;
    case 'long':
      history = context.longTermMemory || [];
      break;
    case 'short':
    default:
      history = context.shortTermMemory || [];
      break;
  }
  
  // Fallback to old history structure if needed
  if (history.length === 0 && context.history) {
    history = context.history;
  }
  
  // Sort by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  // Apply pagination
  const paginatedHistory = sortedHistory.slice(offset, offset + limit);
  
  return {
    items: paginatedHistory,
    total: history.length,
    level: memoryLevel
  };
}

/**
 * Get context for AI prompt construction
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (optional)
 * @param {Object} options - Context retrieval options
 * @returns {Promise<Object>} AI prompt context
 */
async function getAIContext(userId, sessionId = null, options = {}) {
  const defaultOptions = {
    includeShortTerm: true,
    includeMidTerm: true,
    includeLongTerm: true,
    includeUserProfile: true,
    maxItems: 20
  };
  
  const settings = { ...defaultOptions, ...options };
  const context = await getUserContext(userId, sessionId);
  
  // Items to include in AI context
  const contextItems = [];
  
  // Add short-term memory
  if (settings.includeShortTerm && context.shortTermMemory?.length) {
    contextItems.push(...context.shortTermMemory.slice(-SHORT_TERM_WINDOW_SIZE));
  }
  
  // Add relevant mid-term memory if topic is provided
  if (settings.includeMidTerm && context.midTermMemory?.length) {
    if (options.topic) {
      const relevantMidTerm = context.midTermMemory.filter(item => 
        (item.topics || []).includes(options.topic)
      );
      contextItems.push(...relevantMidTerm);
    } else {
      // Include some mid-term memories based on recency and importance
      const midTermItems = [...context.midTermMemory]
        .sort((a, b) => {
          // Score based on recency and importance
          const recencyA = new Date(a.timestamp).getTime();
          const recencyB = new Date(b.timestamp).getTime();
          const importanceA = a.importance || 0.5;
          const importanceB = b.importance || 0.5;
          
          return (recencyB + importanceB * 86400000) - (recencyA + importanceA * 86400000);
        })
        .slice(0, 5);
      
      contextItems.push(...midTermItems);
    }
  }
  
  // Add relevant long-term memory
  if (settings.includeLongTerm && context.longTermMemory?.length) {
    if (options.topic) {
      // Find long-term memories relevant to topic
      const relevantLongTerm = context.longTermMemory.filter(item => 
        (item.topics || []).includes(options.topic)
      ).slice(0, 3);
      
      contextItems.push(...relevantLongTerm);
    } else {
      // Include a few high-importance long-term memories
      const importantLongTerm = [...context.longTermMemory]
        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
        .slice(0, 2);
      
      contextItems.push(...importantLongTerm);
    }
  }
  
  // Remove duplicates
  const uniqueItems = [];
  const seenIds = new Set();
  
  for (const item of contextItems) {
    if (!seenIds.has(item.id)) {
      uniqueItems.push(item);
      seenIds.add(item.id);
    }
  }
  
  // Sort by timestamp
  uniqueItems.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Limit to max items
  const limitedItems = uniqueItems.slice(-settings.maxItems);
  
  // Build user profile summary if requested
  let userProfileSummary = null;
  if (settings.includeUserProfile && context.userProfile) {
    userProfileSummary = generateUserProfileSummary(context.userProfile);
  }
  
  return {
    history: limitedItems,
    userProfile: userProfileSummary,
    interactionCount: context.interactionCount || 0
  };
}

/**
 * Generate a text summary of user profile
 * @param {Object} userProfile - User profile data
 * @returns {string} User profile summary
 */
function generateUserProfileSummary(userProfile) {
  if (!userProfile) return null;
  
  // Get top topics
  const topTopics = Object.entries(userProfile.topics || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
  
  // Generate summary
  let summary = 'User Profile: ';
  
  if (topTopics.length > 0) {
    summary += `Common topics: ${topTopics.join(', ')}. `;
  }
  
  // Add preferences if any
  const preferences = Object.entries(userProfile.preferences || {});
  if (preferences.length > 0) {
    summary += 'Preferences: ';
    summary += preferences
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') + '. ';
  }
  
  // Add traits if any
  const traits = Object.entries(userProfile.traits || {});
  if (traits.length > 0) {
    summary += 'User traits: ';
    summary += traits
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') + '.';
  }
  
  return summary;
}

/**
 * Clear chat history for a user
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (optional)
 * @param {string} memoryLevel - Memory level to clear (short/mid/long/all)
 * @returns {Promise<void>}
 */
async function clearChatHistory(userId, sessionId = null, memoryLevel = 'all') {
  // Get current context
  const context = await getUserContext(userId, sessionId);
  
  // Clear appropriate memory level
  switch (memoryLevel) {
    case 'short':
      context.shortTermMemory = [];
      break;
    case 'mid':
      context.midTermMemory = [];
      break;
    case 'long':
      context.longTermMemory = [];
      break;
    case 'all':
    default:
      context.shortTermMemory = [];
      context.midTermMemory = [];
      context.longTermMemory = [];
      context.history = []; // Clear legacy structure too
      break;
  }
  
  // Save the updated context
  await saveContext(userId, sessionId, context);
  
  // If using Supabase, we could also run a more efficient update
  if (useSupabase) {
    try {
      const updateData = {};
      
      switch (memoryLevel) {
        case 'short':
          updateData['context->shortTermMemory'] = [];
          break;
        case 'mid':
          updateData['context->midTermMemory'] = [];
          break;
        case 'long':
          updateData['context->longTermMemory'] = [];
          break;
        case 'all':
        default:
          updateData['context->shortTermMemory'] = [];
          updateData['context->midTermMemory'] = [];
          updateData['context->longTermMemory'] = [];
          updateData['context->history'] = [];
          break;
      }
      
      updateData['updated_at'] = new Date().toISOString();
      
      let query = supabase
        .from('user_contexts')
        .update(updateData)
        .eq('user_id', userId);
        
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        query = query.is('session_id', null);
      }
      
      const { error } = await query;
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error clearing history in Supabase:', error);
    }
  }
}

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - User preferences to update
 * @returns {Promise<Object>} Updated user profile
 */
async function updateUserPreferences(userId, preferences) {
  const context = await getUserContext(userId);
  
  // Ensure user profile exists
  if (!context.userProfile) {
    context.userProfile = {
      topics: {},
      preferences: {},
      traits: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Update preferences
  context.userProfile.preferences = {
    ...context.userProfile.preferences,
    ...preferences
  };
  
  context.userProfile.lastUpdated = new Date().toISOString();
  
  // Save context
  await saveContext(userId, null, context);
  
  return context.userProfile;
}

/**
 * Create a default context object
 * @returns {Object} Default context
 */
function createDefaultContext() {
  return {
    shortTermMemory: [],
    midTermMemory: [],
    longTermMemory: [],
    userProfile: {
      topics: {},
      preferences: {},
      traits: {},
      lastUpdated: new Date().toISOString()
    },
    interactionCount: 0,
    lastActivity: new Date().toISOString(),
    created: new Date().toISOString()
  };
}

module.exports = {
  getUserContext,
  updateUserContext,
  saveContext,
  getChatHistory,
  clearChatHistory,
  getAIContext,
  updateUserPreferences
}; 