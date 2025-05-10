/**
 * Intent service for the AI Service
 * Manages intent recognition, mapping, and relationship graphs
 */
const { v4: uuidv4 } = require('uuid');
const natural = require('natural');
const { WordTokenizer, LogisticRegressionClassifier } = natural;
const tokenizer = new WordTokenizer();

// Import other services
const cacheService = require('./cacheService');
const contextService = require('./contextService');

// Supabase client (for DB operations)
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const useSupabase = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
const supabase = useSupabase 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// Intent confidence threshold
const INTENT_CONFIDENCE_THRESHOLD = parseFloat(process.env.INTENT_CONFIDENCE_THRESHOLD || '0.7');

// In-memory storage for intent models and relationship graphs
const intentModels = {};
const relationshipGraphs = {};

/**
 * Intent categories and their predefined examples
 */
const defaultIntents = {
  'greeting': [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    '你好', '早上好', '下午好', '晚上好', '嗨'
  ],
  'farewell': [
    'goodbye', 'bye', 'see you', 'see you later', 'talk to you later',
    '再见', '拜拜', '下次见', '回头见'
  ],
  'thanks': [
    'thank you', 'thanks', 'appreciate it', 'thank you very much',
    '谢谢', '感谢', '多谢', '非常感谢'
  ],
  'help': [
    'help', 'can you help me', 'i need help', 'assist me', 'support',
    '帮助', '需要帮助', '帮帮我', '救命'
  ],
  'information': [
    'what is', 'how does', 'tell me about', 'explain', 'describe',
    '什么是', '怎么做', '告诉我关于', '解释', '描述'
  ],
  'booking': [
    'book', 'reserve', 'make a reservation', 'schedule', 'appointment',
    '预订', '预约', '安排', '约'
  ],
  'cancel': [
    'cancel', 'stop', 'delete', 'remove', 'end',
    '取消', '停止', '删除', '移除', '结束'
  ],
  'confirm': [
    'confirm', 'yes', 'okay', 'sure', 'correct',
    '确认', '是的', '好的', '没问题', '正确'
  ],
  'reject': [
    'no', 'nope', 'not now', 'decline', 'reject',
    '不', '不是', '现在不行', '拒绝'
  ],
  'clarification': [
    'what do you mean', 'clarify', 'explain more', 'i don\'t understand',
    '什么意思', '解释清楚', '我不明白', '无法理解'
  ]
};

/**
 * Default intent relationships (parent-child and related intents)
 */
const defaultRelationships = {
  'greeting': {
    related: ['farewell', 'help'],
    children: [],
    parent: null
  },
  'farewell': {
    related: ['greeting', 'thanks'],
    children: [],
    parent: null
  },
  'booking': {
    related: ['information', 'confirm', 'cancel'],
    children: [],
    parent: null
  },
  'cancel': {
    related: ['booking', 'confirm', 'reject'],
    children: [],
    parent: null
  },
  'help': {
    related: ['information', 'clarification'],
    children: [],
    parent: null
  }
};

/**
 * Initialize intent service
 * @returns {Promise<boolean>} Whether initialization was successful
 */
async function initialize() {
  try {
    if (useSupabase) {
      // Load intents from database
      await loadIntentsFromDB();
      await loadRelationshipsFromDB();
    } else {
      // Initialize with default intents
      await initializeDefaultIntents();
    }
    
    console.log('Intent service initialized');
    return true;
  } catch (error) {
    console.error('Error initializing intent service:', error);
    return false;
  }
}

/**
 * Initialize service with default intents
 * @returns {Promise<void>}
 */
async function initializeDefaultIntents() {
  // Build classifier with default intents
  const classifier = new LogisticRegressionClassifier();
  
  // Add training data for each intent
  for (const [intent, examples] of Object.entries(defaultIntents)) {
    examples.forEach(example => {
      classifier.addDocument(example, intent);
    });
  }
  
  // Train the classifier
  classifier.train();
  
  // Store the classifier
  intentModels['default'] = classifier;
  
  // Initialize relationship graph
  relationshipGraphs['default'] = defaultRelationships;
}

/**
 * Load intents from database
 * @returns {Promise<void>}
 */
async function loadIntentsFromDB() {
  try {
    // Check if intents table exists
    const { data: intents, error } = await supabase
      .from('intents')
      .select('*');
    
    if (error) {
      console.error('Error loading intents from DB:', error);
      // Fall back to default intents
      await initializeDefaultIntents();
      return;
    }
    
    if (!intents || intents.length === 0) {
      console.log('No intents found in DB, initializing defaults');
      // Seed the database with default intents
      await seedDefaultIntentsToDB();
      // Use default intents for now
      await initializeDefaultIntents();
      return;
    }
    
    // Group intents by model_id
    const intentsByModel = {};
    intents.forEach(intent => {
      const modelId = intent.model_id || 'default';
      if (!intentsByModel[modelId]) {
        intentsByModel[modelId] = [];
      }
      intentsByModel[modelId].push(intent);
    });
    
    // Build classifiers for each model
    for (const [modelId, modelIntents] of Object.entries(intentsByModel)) {
      const classifier = new LogisticRegressionClassifier();
      
      // Load training examples for each intent
      const { data: examples, error: examplesError } = await supabase
        .from('intent_examples')
        .select('*')
        .in('intent_id', modelIntents.map(i => i.id));
      
      if (examplesError) {
        console.error('Error loading intent examples:', examplesError);
        continue;
      }
      
      // Group examples by intent
      const examplesByIntent = {};
      examples.forEach(example => {
        if (!examplesByIntent[example.intent_id]) {
          examplesByIntent[example.intent_id] = [];
        }
        examplesByIntent[example.intent_id].push(example.text);
      });
      
      // Add documents to classifier
      modelIntents.forEach(intent => {
        const intentExamples = examplesByIntent[intent.id] || [];
        intentExamples.forEach(example => {
          classifier.addDocument(example, intent.name);
        });
      });
      
      // Train the classifier
      classifier.train();
      
      // Store the classifier
      intentModels[modelId] = classifier;
    }
  } catch (error) {
    console.error('Error in loadIntentsFromDB:', error);
    // Fall back to default intents
    await initializeDefaultIntents();
  }
}

/**
 * Load intent relationships from database
 * @returns {Promise<void>}
 */
async function loadRelationshipsFromDB() {
  try {
    // Check if relationships table exists
    const { data: relationships, error } = await supabase
      .from('intent_relationships')
      .select('*');
    
    if (error) {
      console.error('Error loading relationships from DB:', error);
      // Use default relationships
      relationshipGraphs['default'] = defaultRelationships;
      return;
    }
    
    if (!relationships || relationships.length === 0) {
      console.log('No relationships found in DB, initializing defaults');
      // Seed the database with default relationships
      await seedDefaultRelationshipsToDB();
      // Use default relationships for now
      relationshipGraphs['default'] = defaultRelationships;
      return;
    }
    
    // Build relationship graphs
    const graphs = {};
    relationships.forEach(rel => {
      const modelId = rel.model_id || 'default';
      if (!graphs[modelId]) {
        graphs[modelId] = {};
      }
      if (!graphs[modelId][rel.intent_name]) {
        graphs[modelId][rel.intent_name] = {
          related: [],
          children: [],
          parent: null
        };
      }
      
      // Add relationship based on type
      if (rel.relationship_type === 'related') {
        graphs[modelId][rel.intent_name].related.push(rel.related_intent_name);
      } else if (rel.relationship_type === 'parent') {
        graphs[modelId][rel.intent_name].parent = rel.related_intent_name;
        // Also add as child to parent
        if (!graphs[modelId][rel.related_intent_name]) {
          graphs[modelId][rel.related_intent_name] = {
            related: [],
            children: [],
            parent: null
          };
        }
        graphs[modelId][rel.related_intent_name].children.push(rel.intent_name);
      }
    });
    
    // Store the graphs
    Object.assign(relationshipGraphs, graphs);
  } catch (error) {
    console.error('Error in loadRelationshipsFromDB:', error);
    // Use default relationships
    relationshipGraphs['default'] = defaultRelationships;
  }
}

/**
 * Seed default intents to database
 * @returns {Promise<void>}
 */
async function seedDefaultIntentsToDB() {
  try {
    // Insert default intent categories
    const intentInserts = [];
    for (const intent of Object.keys(defaultIntents)) {
      intentInserts.push({
        name: intent,
        description: `Default ${intent} intent`,
        model_id: 'default',
        created_at: new Date().toISOString()
      });
    }
    
    const { data: insertedIntents, error: insertError } = await supabase
      .from('intents')
      .insert(intentInserts)
      .select();
    
    if (insertError) {
      console.error('Error inserting default intents:', insertError);
      return;
    }
    
    // Map intent names to IDs
    const intentMap = {};
    insertedIntents.forEach(intent => {
      intentMap[intent.name] = intent.id;
    });
    
    // Insert examples for each intent
    const exampleInserts = [];
    for (const [intent, examples] of Object.entries(defaultIntents)) {
      examples.forEach(example => {
        exampleInserts.push({
          intent_id: intentMap[intent],
          text: example,
          created_at: new Date().toISOString()
        });
      });
    }
    
    const { error: exampleError } = await supabase
      .from('intent_examples')
      .insert(exampleInserts);
    
    if (exampleError) {
      console.error('Error inserting default examples:', exampleError);
    }
  } catch (error) {
    console.error('Error in seedDefaultIntentsToDB:', error);
  }
}

/**
 * Seed default relationships to database
 * @returns {Promise<void>}
 */
async function seedDefaultRelationshipsToDB() {
  try {
    const relationshipInserts = [];
    
    // Process default relationships
    for (const [intent, relationships] of Object.entries(defaultRelationships)) {
      // Add related intents
      relationships.related.forEach(relatedIntent => {
        relationshipInserts.push({
          intent_name: intent,
          related_intent_name: relatedIntent,
          relationship_type: 'related',
          model_id: 'default',
          created_at: new Date().toISOString()
        });
      });
      
      // Add parent relationship
      if (relationships.parent) {
        relationshipInserts.push({
          intent_name: intent,
          related_intent_name: relationships.parent,
          relationship_type: 'parent',
          model_id: 'default',
          created_at: new Date().toISOString()
        });
      }
    }
    
    const { error } = await supabase
      .from('intent_relationships')
      .insert(relationshipInserts);
    
    if (error) {
      console.error('Error inserting default relationships:', error);
    }
  } catch (error) {
    console.error('Error in seedDefaultRelationshipsToDB:', error);
  }
}

/**
 * Recognize intent from text
 * @param {string} text - Input text
 * @param {string} modelId - Intent model ID
 * @param {Object} context - User context (optional)
 * @returns {Promise<Object>} Recognized intent
 */
async function recognizeIntent(text, modelId = 'default', context = null) {
  // Ensure model exists
  if (!intentModels[modelId]) {
    modelId = 'default';
    
    // If default model doesn't exist, initialize
    if (!intentModels[modelId]) {
      await initializeDefaultIntents();
    }
  }
  
  // Get classifier
  const classifier = intentModels[modelId];
  
  // Get cached intent if available
  const cacheKey = `intent:${modelId}:${text.toLowerCase().trim()}`;
  const cachedIntent = await cacheService.get(cacheKey);
  if (cachedIntent) {
    return JSON.parse(cachedIntent);
  }
  
  // Process text and get classifications
  const tokens = tokenizer.tokenize(text.toLowerCase());
  let classifications = [];
  
  try {
    classifications = classifier.getClassifications(text.toLowerCase());
  } catch (error) {
    console.error('Error getting classifications:', error);
    classifications = [];
  }
  
  // Find the highest confidence intent
  let highestConfidence = 0;
  let recognizedIntent = null;
  
  classifications.forEach(classification => {
    if (classification.value > highestConfidence) {
      highestConfidence = classification.value;
      recognizedIntent = classification.label;
    }
  });
  
  // Apply context-based adjustments if context is provided
  if (context && context.history) {
    const contextAdjustedResult = adjustIntentWithContext(
      recognizedIntent, 
      highestConfidence, 
      context,
      modelId
    );
    
    recognizedIntent = contextAdjustedResult.intent;
    highestConfidence = contextAdjustedResult.confidence;
  }
  
  // Create the result
  const result = {
    intent: highestConfidence >= INTENT_CONFIDENCE_THRESHOLD ? recognizedIntent : null,
    confidence: highestConfidence,
    allIntents: classifications.map(c => ({ intent: c.label, confidence: c.value })),
    originalText: text,
    tokens: tokens
  };
  
  // Cache the result
  await cacheService.set(cacheKey, JSON.stringify(result), 60 * 60); // 1 hour
  
  return result;
}

/**
 * Adjust intent recognition based on conversation context
 * @param {string} intent - Recognized intent
 * @param {number} confidence - Intent confidence
 * @param {Object} context - User context
 * @param {string} modelId - Intent model ID
 * @returns {Object} Adjusted intent and confidence
 */
function adjustIntentWithContext(intent, confidence, context, modelId = 'default') {
  // Get relationship graph
  const graph = relationshipGraphs[modelId] || relationshipGraphs['default'] || {};
  
  // If no history or intent, return original
  if (!context.history || !intent || context.history.length === 0) {
    return { intent, confidence };
  }
  
  // Get the most recent history items
  const recentHistory = context.history.slice(-3);
  let previousIntents = [];
  
  // Extract previous intents if available
  recentHistory.forEach(item => {
    if (item.intent) {
      previousIntents.push(item.intent);
    }
  });
  
  // If no previous intents or no relationships for current intent, return original
  if (previousIntents.length === 0 || !graph[intent]) {
    return { intent, confidence };
  }
  
  // Get relationships for the current intent
  const intentRelationships = graph[intent];
  const relatedIntents = intentRelationships.related || [];
  const parentIntent = intentRelationships.parent;
  const childIntents = intentRelationships.children || [];
  
  // Calculate confidence boost based on context
  let confidenceBoost = 0;
  
  // Check if current intent is related to previous intents
  const mostRecentIntent = previousIntents[previousIntents.length - 1];
  if (mostRecentIntent) {
    // Boost if current intent is directly related to most recent intent
    if (relatedIntents.includes(mostRecentIntent)) {
      confidenceBoost += 0.1;
    }
    
    // Boost if current intent is a child of most recent intent
    if (parentIntent === mostRecentIntent) {
      confidenceBoost += 0.15;
    }
    
    // Smaller boost if current intent is the parent of most recent intent
    if (childIntents.includes(mostRecentIntent)) {
      confidenceBoost += 0.05;
    }
  }
  
  // Apply confidence boost, not exceeding 1.0
  const adjustedConfidence = Math.min(confidence + confidenceBoost, 1.0);
  
  return {
    intent: intent,
    confidence: adjustedConfidence
  };
}

/**
 * Get related intents
 * @param {string} intent - Base intent
 * @param {string} modelId - Intent model ID
 * @returns {Array} Array of related intents
 */
function getRelatedIntents(intent, modelId = 'default') {
  // Get relationship graph
  const graph = relationshipGraphs[modelId] || relationshipGraphs['default'] || {};
  
  if (!intent || !graph[intent]) {
    return [];
  }
  
  return {
    related: graph[intent].related || [],
    parent: graph[intent].parent,
    children: graph[intent].children || []
  };
}

/**
 * Train intent with new examples
 * @param {string} intent - Intent name
 * @param {Array} examples - New examples
 * @param {string} modelId - Intent model ID
 * @returns {Promise<boolean>} Success status
 */
async function trainIntent(intent, examples, modelId = 'default') {
  try {
    // Ensure model exists
    if (!intentModels[modelId]) {
      modelId = 'default';
      
      // If default model doesn't exist, initialize
      if (!intentModels[modelId]) {
        await initializeDefaultIntents();
      }
    }
    
    // Get classifier
    const classifier = intentModels[modelId];
    
    // Add new examples
    examples.forEach(example => {
      classifier.addDocument(example, intent);
    });
    
    // Retrain the classifier
    classifier.train();
    
    // Update database if using Supabase
    if (useSupabase) {
      await storeIntentExamples(intent, examples, modelId);
    }
    
    return true;
  } catch (error) {
    console.error('Error training intent:', error);
    return false;
  }
}

/**
 * Store intent examples in database
 * @param {string} intent - Intent name
 * @param {Array} examples - New examples
 * @param {string} modelId - Intent model ID
 * @returns {Promise<void>}
 */
async function storeIntentExamples(intent, examples, modelId) {
  try {
    // Check if intent exists
    let { data: intents, error: intentError } = await supabase
      .from('intents')
      .select('id')
      .eq('name', intent)
      .eq('model_id', modelId);
    
    if (intentError) {
      console.error('Error checking intent:', intentError);
      return;
    }
    
    let intentId;
    
    if (!intents || intents.length === 0) {
      // Create new intent
      const { data: newIntent, error: createError } = await supabase
        .from('intents')
        .insert({
          name: intent,
          description: `User-created ${intent} intent`,
          model_id: modelId,
          created_at: new Date().toISOString()
        })
        .select('id');
      
      if (createError) {
        console.error('Error creating intent:', createError);
        return;
      }
      
      intentId = newIntent[0].id;
    } else {
      intentId = intents[0].id;
    }
    
    // Insert examples
    const exampleInserts = examples.map(example => ({
      intent_id: intentId,
      text: example,
      created_at: new Date().toISOString()
    }));
    
    const { error: exampleError } = await supabase
      .from('intent_examples')
      .insert(exampleInserts);
    
    if (exampleError) {
      console.error('Error inserting examples:', exampleError);
    }
  } catch (error) {
    console.error('Error in storeIntentExamples:', error);
  }
}

/**
 * Create intent relationship
 * @param {string} intent - Intent name
 * @param {string} relatedIntent - Related intent name
 * @param {string} relationType - Relationship type (related/parent/child)
 * @param {string} modelId - Intent model ID
 * @returns {Promise<boolean>} Success status
 */
async function createIntentRelationship(intent, relatedIntent, relationType = 'related', modelId = 'default') {
  try {
    // Ensure relationship graph exists
    if (!relationshipGraphs[modelId]) {
      relationshipGraphs[modelId] = {};
    }
    
    // Ensure intent nodes exist
    if (!relationshipGraphs[modelId][intent]) {
      relationshipGraphs[modelId][intent] = {
        related: [],
        children: [],
        parent: null
      };
    }
    
    if (!relationshipGraphs[modelId][relatedIntent]) {
      relationshipGraphs[modelId][relatedIntent] = {
        related: [],
        children: [],
        parent: null
      };
    }
    
    // Update relationships based on type
    if (relationType === 'related') {
      // Add as related intent (bidirectional)
      if (!relationshipGraphs[modelId][intent].related.includes(relatedIntent)) {
        relationshipGraphs[modelId][intent].related.push(relatedIntent);
      }
      
      if (!relationshipGraphs[modelId][relatedIntent].related.includes(intent)) {
        relationshipGraphs[modelId][relatedIntent].related.push(intent);
      }
    } else if (relationType === 'parent') {
      // Set parent-child relationship
      relationshipGraphs[modelId][intent].parent = relatedIntent;
      
      if (!relationshipGraphs[modelId][relatedIntent].children.includes(intent)) {
        relationshipGraphs[modelId][relatedIntent].children.push(intent);
      }
    } else if (relationType === 'child') {
      // Set child-parent relationship
      relationshipGraphs[modelId][intent].children.push(relatedIntent);
      relationshipGraphs[modelId][relatedIntent].parent = intent;
    }
    
    // Update database if using Supabase
    if (useSupabase) {
      await storeIntentRelationship(intent, relatedIntent, relationType, modelId);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating intent relationship:', error);
    return false;
  }
}

/**
 * Store intent relationship in database
 * @param {string} intent - Intent name
 * @param {string} relatedIntent - Related intent name
 * @param {string} relationType - Relationship type
 * @param {string} modelId - Intent model ID
 * @returns {Promise<void>}
 */
async function storeIntentRelationship(intent, relatedIntent, relationType, modelId) {
  try {
    // Prepare relationship record
    const relationship = {
      intent_name: intent,
      related_intent_name: relatedIntent,
      relationship_type: relationType === 'child' ? 'parent' : relationType,
      model_id: modelId,
      created_at: new Date().toISOString()
    };
    
    // If relationship type is related, it's bidirectional
    const relationships = [relationship];
    
    if (relationType === 'related') {
      relationships.push({
        intent_name: relatedIntent,
        related_intent_name: intent,
        relationship_type: relationType,
        model_id: modelId,
        created_at: new Date().toISOString()
      });
    } else if (relationType === 'child') {
      // Swap intentName and relatedIntentName for child relationship
      relationship.intent_name = relatedIntent;
      relationship.related_intent_name = intent;
    }
    
    // Store relationships
    const { error } = await supabase
      .from('intent_relationships')
      .upsert(relationships, { onConflict: ['intent_name', 'related_intent_name', 'model_id'] });
    
    if (error) {
      console.error('Error storing relationship:', error);
    }
  } catch (error) {
    console.error('Error in storeIntentRelationship:', error);
  }
}

module.exports = {
  initialize,
  recognizeIntent,
  getRelatedIntents,
  trainIntent,
  createIntentRelationship,
  defaultIntents
}; 