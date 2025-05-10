const supabase = require('../config/supabase');
const autoReplyService = require('../services/autoReplyService');

// Helper function for error handling
const handleSupabaseError = (error, res, message) => {
  console.error(message, error);
  res.status(error.status || 500).json({ 
    message: error.message || 'An unexpected error occurred', 
    details: error.details 
  });
};

/*
 * Basic CRUD operations for auto-reply rules
 */
exports.getAllRules = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('auto_reply_rules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, 'Error fetching auto-reply rules:');
  }
};

exports.getRuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('auto_reply_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle() to return null instead of error if not found
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, `Error fetching rule with id ${req.params.id}:`);
  }
};

exports.createRule = async (req, res) => {
  try {
    const { 
      keyword, 
      response, 
      match_type = 'exact', // Renamed from matchType
      is_regex = false,
      is_active = true, 
      conditions = [],
      language = 'default' // Added language field
    } = req.body;
    
    if (!keyword || !response) {
      return res.status(400).json({ message: 'Keyword and response are required' });
    }
    
    // Validate regex if is_regex is true
    if (is_regex) {
      try {
        new RegExp(keyword);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid regular expression pattern' });
      }
    }
    
    const { data, error } = await supabase
      .from('auto_reply_rules')
      .insert([
        { 
          keyword, 
          response, 
          match_type, 
          is_regex,
          is_active,
          conditions,
          language
        }
      ])
      .select()
      .single(); // Insert returns an array, get the single object
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    handleSupabaseError(error, res, 'Error creating auto-reply rule:');
  }
};

exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { keyword, response, match_type, is_regex, is_active, conditions, language } = req.body;
    
    // Build update object dynamically
    const updates = {};
    if (keyword !== undefined) updates.keyword = keyword;
    if (response !== undefined) updates.response = response;
    if (match_type !== undefined) updates.match_type = match_type;
    if (is_regex !== undefined) updates.is_regex = is_regex;
    if (is_active !== undefined) updates.is_active = is_active;
    if (conditions !== undefined) updates.conditions = conditions;
    if (language !== undefined) updates.language = language;
    
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields provided for update' });
    }
    
    // Validate regex if updating to regex and pattern provided
    if (updates.is_regex && updates.keyword) {
      try {
        new RegExp(updates.keyword);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid regular expression pattern' });
      }
    }
    
    const { data, error } = await supabase
      .from('auto_reply_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
        return res.status(404).json({ message: 'Rule not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, `Error updating rule with id ${req.params.id}:`);
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('auto_reply_rules')
      .delete()
      .eq('id', id)
      .select(); // Check if something was deleted
    
    if (error) throw error;
    if (data && data.length === 0) { // Check if the rule existed
        return res.status(404).json({ message: 'Rule not found' });
    }

    res.status(200).json({ message: 'Rule deleted successfully' });
  } catch (error) {
    handleSupabaseError(error, res, `Error deleting rule with id ${req.params.id}:`);
  }
};

/*
 * CRUD operations for conditions
 */
exports.getAllConditions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('auto_reply_conditions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, 'Error fetching conditions:');
  }
};

exports.getConditionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('auto_reply_conditions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Condition not found' });
    }
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, `Error fetching condition with id ${req.params.id}:`);
  }
};

exports.createCondition = async (req, res) => {
  try {
    const { 
      name, 
      type, // time, user, platform, context
      parameters, // JSON object with condition parameters
      description
    } = req.body;
    
    if (!name || !type || !parameters) {
      return res.status(400).json({ message: 'Name, type, and parameters are required' });
    }
    
    const { data, error } = await supabase
      .from('auto_reply_conditions')
      .insert([{ name, type, parameters, description }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    handleSupabaseError(error, res, 'Error creating condition:');
  }
};

exports.updateCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, parameters, description } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (parameters !== undefined) updates.parameters = parameters;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields provided for update' });
    }

    const { data, error } = await supabase
      .from('auto_reply_conditions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Condition not found' });
    }
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, `Error updating condition with id ${req.params.id}:`);
  }
};

exports.deleteCondition = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('auto_reply_conditions')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (data && data.length === 0) {
        return res.status(404).json({ message: 'Condition not found' });
    }

    res.status(200).json({ message: 'Condition deleted successfully' });
  } catch (error) {
    handleSupabaseError(error, res, `Error deleting condition with id ${req.params.id}:`);
  }
};

/*
 * CRUD operations for intents
 */
exports.getAllIntents = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('auto_reply_intents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, 'Error fetching intents:');
  }
};

exports.getIntentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('auto_reply_intents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Intent not found' });
    }
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, `Error fetching intent with id ${req.params.id}:`);
  }
};

exports.createIntent = async (req, res) => {
  try {
    const { 
      name, 
      examples = [], // Array of example phrases for this intent
      response,
      is_active = true,
      language = 'default' // Added language field
    } = req.body;
    
    if (!name || !response || examples.length === 0) {
      return res.status(400).json({ 
        message: 'Intent name, response, and at least one example phrase are required' 
      });
    }
    
    const { data, error } = await supabase
      .from('auto_reply_intents')
      .insert([{ 
        name, 
        examples, 
        response,
        is_active,
        language
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    handleSupabaseError(error, res, 'Error creating intent:');
  }
};

exports.updateIntent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, examples, response, is_active, language } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (examples !== undefined) updates.examples = examples;
    if (response !== undefined) updates.response = response;
    if (is_active !== undefined) updates.is_active = is_active;
    if (language !== undefined) updates.language = language;
    
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields provided for update' });
    }

    const { data, error } = await supabase
      .from('auto_reply_intents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Intent not found' });
    }
    res.status(200).json(data);
  } catch (error) {
    handleSupabaseError(error, res, `Error updating intent with id ${req.params.id}:`);
  }
};

exports.deleteIntent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('auto_reply_intents')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    if (data && data.length === 0) {
        return res.status(404).json({ message: 'Intent not found' });
    }
    
    res.status(200).json({ message: 'Intent deleted successfully' });
  } catch (error) {
    handleSupabaseError(error, res, `Error deleting intent with id ${req.params.id}:`);
  }
};

/*
 * Message Processing
 */
exports.processIncomingMessage = async (req, res) => {
  try {
    const { 
        messageText,
        platform,
        senderId,
        senderInfo = {}, // Additional sender info for context/personalization
        timestamp = new Date()
    } = req.body;
    
    if (!messageText || !platform || !senderId) {
        return res.status(400).json({
            message: 'Missing required fields: messageText, platform, senderId'
        });
    }

    // Construct message object for the service
    const message = {
        text: messageText,
        platform,
        sender: {
            id: senderId,
            ...senderInfo // Include name, userType, etc.
        },
        timestamp
    };

    // Call the auto-reply service
    const reply = await autoReplyService.processMessage(message, {
        useIntentRecognition: true, // Enable/disable features via config or request
        personalizeResponse: true,
        useContext: true // Enable context usage
    });

    if (reply) {
        res.status(200).json({ reply: reply.text, matchInfo: reply });
    } else {
        res.status(200).json({ reply: null, message: 'No matching auto-reply found' });
    }

  } catch (error) {
      console.error('Error processing incoming message:', error);
      res.status(500).json({ message: 'Failed to process message', error: error.message });
  }
};

/**
 * Get statistics about auto-reply usage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStats = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'week'; // 'day', 'week', 'month'
    const stats = await autoReplyService.getStats(timeRange);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting auto-reply stats:', error);
    res.status(500).json({ error: 'Failed to retrieve auto-reply statistics' });
  }
};

/**
 * Get recent activities
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = await autoReplyService.getRecentActivities(limit);
    res.status(200).json(activities);
  } catch (error) {
    console.error('Error getting auto-reply activities:', error);
    res.status(500).json({ error: 'Failed to retrieve auto-reply activities' });
  }
};

/**
 * Get performance metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMetrics = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'day'; // 'day', 'week', 'month'
    const metrics = await autoReplyService.getPerformanceMetrics(timeRange);
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve performance metrics' });
  }
};

/**
 * Get message logs with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      dateFrom,
      dateTo,
      platform,
      matchType,
      search
    } = req.query;

    // Convert page and limit to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    // Build query
    let query = supabase
      .from('message_logs')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (dateFrom) {
      query = query.gte('timestamp', dateFrom);
    }
    
    if (dateTo) {
      // Add one day to include the end date fully
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('timestamp', endDate.toISOString());
    }
    
    if (platform) {
      query = query.eq('platform', platform);
    }
    
    if (matchType) {
      query = query.eq('response->matchType', matchType);
    }
    
    if (search) {
      query = query.or(`text.ilike.%${search}%,response->text.ilike.%${search}%`);
    }
    
    // Add pagination
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    
    query = query
      .order('timestamp', { ascending: false })
      .range(from, to);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limitNum);
    
    res.status(200).json({
      logs: data,
      page: pageNum,
      limit: limitNum,
      totalItems: count,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to retrieve message logs' });
  }
};

// Export these additional functions
exports.getStats = getStats;
exports.getActivities = getActivities;
exports.getMetrics = getMetrics; 