/**
 * AI service implementation
 * Manages all AI model interactions including:
 * - Message processing
 * - Context-aware responses
 * - Model selection and fallback
 */
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
const franc = require('franc');
const { ApiError } = require('../middleware/errorHandler');

// Import other services
const cacheService = require('./cacheService');
const messageQueue = process.env.ENABLE_MESSAGE_QUEUE === 'true' 
  ? require('./messageQueue') 
  : null;
const intentService = require('./intentService');
const responseFormatter = require('./responseFormatterService');
const abTestingService = require('./abTestingService');

// Environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_AI_MODEL = process.env.DEFAULT_AI_MODEL || 'gemini-2.0-flash-lite';
const ENABLE_MODEL_FALLBACK = process.env.ENABLE_MODEL_FALLBACK === 'true';
const MAX_TOKENS_PER_REQUEST = parseInt(process.env.MAX_TOKENS_PER_REQUEST || '2048');
const AI_REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT || '15000');

// Initialize the Google Generative AI client
const genAI = GEMINI_API_KEY 
  ? new GoogleGenerativeAI(GEMINI_API_KEY) 
  : null;

// Initialize the OpenAI client
const openai = OPENAI_API_KEY 
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

// Initialize the OpenRouter client
const openrouter = OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://yourapp.com',
        'X-Title': 'iBuddy AI Assistant'
      }
    })
  : null;

// Model configs
const modelConfigs = {
  'gemini-2.0-flash-lite': {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: MAX_TOKENS_PER_REQUEST
  },
  'gemini-1.5-pro-latest': {
    temperature: 0.9,
    topK: 32,
    topP: 0.9,
    maxOutputTokens: MAX_TOKENS_PER_REQUEST
  },
  'gpt-4o-mini': {
    temperature: 0.8,
    top_p: 0.95,
    max_tokens: MAX_TOKENS_PER_REQUEST,
    presence_penalty: 0,
    frequency_penalty: 0
  }
};

// Available models (with fallback order)
const availableModels = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro-latest',
  'gpt-4o-mini'
];

// Model providers
const modelProviders = {
  'gemini-2.0-flash-lite': 'google',
  'gemini-1.5-pro-latest': 'google',
  'gpt-4o-mini': 'openrouter'
};

// 添加模型使用统计
const modelStats = {
  usage: {
    'gemini-2.0-flash-lite': 0,
    'gemini-1.5-pro-latest': 0,
    'gpt-4o-mini': 0
  },
  performance: {
    'gemini-2.0-flash-lite': [],
    'gemini-1.5-pro-latest': [],
    'gpt-4o-mini': []
  },
  failures: {
    'gemini-2.0-flash-lite': 0,
    'gemini-1.5-pro-latest': 0,
    'gpt-4o-mini': 0
  }
};

/**
 * Check if AI models are available
 * @returns {Promise<boolean>} Whether models are available
 */
async function checkAiModelsAvailability() {
  if (!genAI && !openai && !openrouter) {
    return false;
  }
  
  try {
    if (modelProviders[DEFAULT_AI_MODEL] === 'google' && genAI) {
      const model = genAI.getGenerativeModel({ model: DEFAULT_AI_MODEL });
      await model.generateContent("test");
      return true;
    } else if (modelProviders[DEFAULT_AI_MODEL] === 'openai' && openai) {
      await openai.chat.completions.create({
        model: DEFAULT_AI_MODEL,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      });
      return true;
    } else if (modelProviders[DEFAULT_AI_MODEL] === 'openrouter' && openrouter) {
      await openrouter.chat.completions.create({
        model: `openai/${DEFAULT_AI_MODEL}`,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('AI model availability check failed:', error);
    return false;
  }
}

/**
 * Process a message using AI
 * @param {Object} messageData - Message data object
 * @param {string} messageData.text - Message text
 * @param {string} messageData.userId - User ID
 * @param {string} messageData.sessionId - Session ID
 * @param {string} messageData.platform - Platform identifier
 * @param {Object} messageData.context - User context
 * @param {Object} messageData.formatOptions - Response formatting options
 * @returns {Promise<Object>} AI response
 */
async function processMessage(messageData) {
  const messageId = uuidv4();
  const startTime = Date.now();
  
  // Check if any AI service is available
  if (!genAI && !openai && !openrouter) {
    throw new ApiError('AI service is not configured', 503);
  }
  
  // Check for cached response
  const cacheKey = `ai:response:${messageData.userId}:${encodeURIComponent(messageData.text.toLowerCase().trim())}`;
  const cachedResponse = await cacheService.get(cacheKey);
  
  if (cachedResponse) {
    return {
      ...JSON.parse(cachedResponse),
      messageId,
      cached: true
    };
  }
  
  // Detect language (optional)
  const detectedLang = franc(messageData.text, { minLength: 3 });
  
  // 进行意图识别
  let intentResult = null;
  try {
    intentResult = await intentService.recognizeIntent(
      messageData.text,
      'default',
      messageData.context
    );
  } catch (error) {
    console.warn('Intent recognition failed:', error);
    // 继续处理，意图识别失败不应阻止消息处理
  }
  
  // 获取用户A/B测试分配
  let testAssignments = null;
  let selectedModel = null;
  
  if (messageData.userId) {
    try {
      testAssignments = await abTestingService.getUserAssignments(messageData.userId);
      
      // 如果有活跃测试，查找当前激活的测试
      const activeTests = await abTestingService.getActiveTests();
      for (const test of activeTests) {
        if (testAssignments[test.id]) {
          // 使用测试分配的模型
          selectedModel = testAssignments[test.id].model;
          console.log(`User ${messageData.userId} is in A/B test: ${test.name}, using model: ${selectedModel}`);
          break; // 一次只使用一个测试的模型
        }
      }
    } catch (error) {
      console.warn('Error getting A/B test assignments:', error);
    }
  }
  
  // 如果用户没有测试分配，使用常规选择逻辑
  if (!selectedModel) {
    selectedModel = chooseAppropriateModel(messageData);
  }
  
  // Build prompt with context
  const prompt = await buildPromptWithContext(messageData);
  
  // Generate response with fallback
  try {
    const response = await generateResponseWithFallback(prompt, selectedModel);
    
    // 记录性能数据
    const processingTime = Date.now() - startTime;
    recordModelPerformance(response.model, processingTime, messageData.text.length);
    
    // 获取目标平台，用于响应格式化
    const platform = messageData.platform || 'web';
    const formatOptions = messageData.formatOptions || {};
    
    // 根据目标平台格式化响应
    const formattedResponse = responseFormatter.formatRichResponse(
      response.text,
      platform,
      formatOptions
    );
    
    // Structure the final response
    const aiResponse = {
      messageId,
      text: response.text,
      intent: intentResult?.intent || null,
      confidence: intentResult?.confidence || null,
      model: response.model,
      language: detectedLang !== 'und' ? detectedLang : null,
      processingTime,
      timestamp: new Date().toISOString(),
      formatted: formattedResponse
    };
    
    // If intent was recognized, add related intents for context
    if (intentResult?.intent) {
      aiResponse.relatedIntents = intentService.getRelatedIntents(intentResult.intent);
    }
    
    // 如果用户在A/B测试中，记录测试结果
    if (messageData.userId && testAssignments) {
      for (const [testId, assignment] of Object.entries(testAssignments)) {
        if (assignment.model === response.model) {
          // 记录此测试的结果
          await abTestingService.recordTestResult({
            userId: messageData.userId,
            testId,
            messageId,
            metrics: {
              processingTime,
              // 其他测试指标可以在用户提供反馈时添加
            }
          });
        }
      }
    }
    
    // Cache the response
    await cacheService.set(
      cacheKey, 
      JSON.stringify(aiResponse),
      60 * 5 // 5 minutes TTL
    );
    
    return aiResponse;
  } catch (error) {
    // 记录失败
    console.error(`Error processing message with AI:`, error);
    throw error;
  }
}

/**
 * Choose the most appropriate model based on message complexity and type
 * @param {Object} messageData - Message data
 * @returns {string} Selected model name
 */
function chooseAppropriateModel(messageData) {
  // 如果禁用了自动模型选择，则返回默认模型
  if (process.env.ENABLE_AUTO_MODEL_SELECTION !== 'true') {
    return DEFAULT_AI_MODEL;
  }
  
  const { text, context } = messageData;
  
  // 获取配置的阈值，如果未配置则使用默认值
  const COMPLEXITY_THRESHOLD_MEDIUM = parseInt(process.env.COMPLEXITY_THRESHOLD_MEDIUM || '100');
  const COMPLEXITY_THRESHOLD_HIGH = parseInt(process.env.COMPLEXITY_THRESHOLD_HIGH || '200');
  
  // 复杂度分析
  let complexityScore = 0;
  
  // 基于文本长度的复杂度
  complexityScore += text.length * 0.1;
  
  // 基于特定关键词和模式的复杂度
  const complexPatterns = [
    'explain', 'analyze', 'compare', 'difference', 'why', 'how', 
    '分析', '比较', '解释', '为什么', '如何', '区别', '优缺点'
  ];
  
  for (const pattern of complexPatterns) {
    if (text.toLowerCase().includes(pattern.toLowerCase())) {
      complexityScore += 50;
      break; // 只加一次分数，避免多次匹配同类型关键词
    }
  }
  
  // 基于上下文历史长度的复杂度
  if (context && context.history) {
    complexityScore += context.history.length * 5;
  }
  
  // 模型选择逻辑
  if (complexityScore >= COMPLEXITY_THRESHOLD_HIGH) {
    // 高复杂度查询使用最强大的模型
    return 'gpt-4o-mini';
  } else if (complexityScore >= COMPLEXITY_THRESHOLD_MEDIUM) {
    // 中等复杂度查询使用中等模型
    return 'gemini-1.5-pro-latest';
  } else {
    // 简单查询使用快速模型
    return 'gemini-2.0-flash-lite';
  }
}

/**
 * Build a prompt with user context
 * @param {Object} messageData - Message data
 * @returns {string} The full prompt
 */
async function buildPromptWithContext(messageData) {
  const { text, userId, sessionId, context } = messageData;
  
  // 如果没有上下文信息，直接返回原始文本
  if (!userId) {
    return text;
  }
  
  try {
    // 使用contextService获取智能上下文
    const contextService = require('./contextService');
    
    // 使用messageData中的文本尝试提取主题，以获取相关的上下文
    let topic = null;
    if (text && text.length > 10) {
      // 简单的主题提取逻辑
      const simpleTopicRegex = /(?:关于|about|regarding|on)\s+([a-zA-Z\u4e00-\u9fa5]{2,20})/i;
      const match = text.match(simpleTopicRegex);
      if (match && match[1]) {
        topic = match[1].toLowerCase();
      }
    }
    
    // 获取智能上下文数据，可能包括短期、中期和长期记忆
    const aiContext = await contextService.getAIContext(userId, sessionId, {
      includeShortTerm: true,
      includeMidTerm: true,
      includeLongTerm: true,
      includeUserProfile: true,
      topic: topic,
      maxItems: 15
    });
    
    // 如果没有历史记录，返回原始文本
    if (!aiContext.history || aiContext.history.length === 0) {
      return text;
    }
    
    // 构建上下文部分
    let contextPart = "\n\n以下是对话历史：\n";
    
    // 添加历史消息
    aiContext.history.forEach((item, index) => {
      if (item.isSummary) {
        // 如果是摘要，使用特殊格式
        contextPart += `[摘要：${item.userMessage.replace('[Summary of ', '').replace(']', '')}]\n`;
      } else {
        // 普通消息
        contextPart += `用户: ${item.userMessage}\n`;
        if (item.aiResponse) {
          contextPart += `助手: ${item.aiResponse}\n`;
        }
      }
      
      // 在消息之间添加分隔线，除了最后一条
      if (index < aiContext.history.length - 1) {
        contextPart += "---\n";
      }
    });
    
    // 添加用户档案信息（如果存在）
    if (aiContext.userProfile) {
      contextPart += "\n\n用户信息：\n";
      contextPart += aiContext.userProfile + "\n";
    }
    
    // 添加当前消息提示
    contextPart += "\n根据以上上下文，回答用户的当前消息：\n";
    
    return contextPart + text;
  } catch (error) {
    console.error('Error building context for prompt:', error);
    
    // 出错时使用备用上下文构建逻辑
    let fallbackPrompt = text;
    
    if (context && context.history && context.history.length > 0) {
      const historyLimit = parseInt(process.env.CONTEXT_WINDOW_SIZE || '10');
      const recentHistory = context.history.slice(-historyLimit);
      
      let fallbackContextPart = "\n\n对话历史：\n";
      
      recentHistory.forEach(item => {
        fallbackContextPart += `用户: ${item.userMessage}\n`;
        if (item.aiResponse) {
          fallbackContextPart += `助手: ${item.aiResponse}\n`;
        }
      });
      
      fallbackContextPart += "\n根据以上上下文，回答当前消息：\n";
      
      fallbackPrompt = fallbackContextPart + text;
    }
    
    return fallbackPrompt;
  }
}

/**
 * Generate response with fallback to other models if needed
 * @param {string} prompt - The input prompt
 * @param {string} preferredModel - The preferred model to use first
 * @returns {Promise<Object>} Generated response
 */
async function generateResponseWithFallback(prompt, preferredModel = DEFAULT_AI_MODEL) {
  // 构建模型尝试顺序列表，从首选模型开始
  let modelList = [preferredModel];
  
  // 如果启用了回退，添加其他模型作为备选
  if (ENABLE_MODEL_FALLBACK) {
    // 过滤掉已包含的首选模型
    const otherModels = availableModels.filter(model => model !== preferredModel);
    modelList = [...modelList, ...otherModels];
  }
  
  let lastError = null;
  
  // 按顺序尝试每个模型
  for (const modelName of modelList) {
    const provider = modelProviders[modelName];
    
    // 检查提供商API密钥是否可用
    if ((provider === 'google' && !genAI) || 
        (provider === 'openai' && !openai) ||
        (provider === 'openrouter' && !openrouter)) {
      console.log(`Skipping model ${modelName} as ${provider} API is not configured`);
      continue;
    }
    
    try {
      const startTime = Date.now();
      
      // 根据模型提供商调用不同的生成函数
      let response;
      if (provider === 'google') {
        response = await generateWithGoogleModel(modelName, prompt);
      } else if (provider === 'openai') {
        response = await generateWithOpenAIModel(modelName, prompt);
      } else if (provider === 'openrouter') {
        response = await generateWithOpenRouterModel(modelName, prompt);
      } else {
        throw new Error(`Unknown model provider: ${provider}`);
      }
      
      // 记录模型成功使用
      modelStats.usage[modelName] = (modelStats.usage[modelName] || 0) + 1;
      
      return {
        text: response,
        model: modelName
      };
    } catch (error) {
      console.error(`Error with model ${modelName}:`, error);
      // 记录模型失败
      modelStats.failures[modelName] = (modelStats.failures[modelName] || 0) + 1;
      lastError = error;
      
      // 继续尝试下一个模型
      continue;
    }
  }
  
  // 如果所有模型都失败
  throw new ApiError(
    `All AI models failed: ${lastError?.message}`,
    503,
    { originalError: lastError }
  );
}

/**
 * Generate a response with Google model
 * @param {string} modelName - The model name to use
 * @param {string} prompt - The input prompt
 * @returns {Promise<string>} Generated text
 */
async function generateWithGoogleModel(modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const generationConfig = modelConfigs[modelName] || {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: MAX_TOKENS_PER_REQUEST
  };
  
  // Create a promise with timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('AI request timed out')), AI_REQUEST_TIMEOUT);
  });
  
  // Create the generation promise
  const generationPromise = model.generateContent([prompt], generationConfig)
    .then(result => {
      const response = result.response;
      return response.text();
    });
  
  // Race between timeout and generation
  return Promise.race([generationPromise, timeoutPromise]);
}

/**
 * Generate a response with OpenAI model
 * @param {string} modelName - The model name to use
 * @param {string} prompt - The input prompt
 * @returns {Promise<string>} Generated text
 */
async function generateWithOpenAIModel(modelName, prompt) {
  const config = modelConfigs[modelName] || {
    temperature: 0.8,
    top_p: 0.95,
    max_tokens: MAX_TOKENS_PER_REQUEST
  };
  
  // Create a promise with timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('AI request timed out')), AI_REQUEST_TIMEOUT);
  });
  
  // Create the generation promise
  const generationPromise = openai.chat.completions.create({
    model: modelName,
    messages: [{ role: "user", content: prompt }],
    temperature: config.temperature,
    top_p: config.top_p,
    max_tokens: config.max_tokens,
    presence_penalty: config.presence_penalty || 0,
    frequency_penalty: config.frequency_penalty || 0
  }).then(response => {
    return response.choices[0].message.content;
  });
  
  // Race between timeout and generation
  return Promise.race([generationPromise, timeoutPromise]);
}

/**
 * Generate a response with OpenRouter model
 * @param {string} modelName - The model name to use
 * @param {string} prompt - The input prompt
 * @returns {Promise<string>} Generated text
 */
async function generateWithOpenRouterModel(modelName, prompt) {
  const config = modelConfigs[modelName] || {
    temperature: 0.8,
    top_p: 0.95,
    max_tokens: MAX_TOKENS_PER_REQUEST
  };
  
  // Create a promise with timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('AI request timed out')), AI_REQUEST_TIMEOUT);
  });
  
  // Create the generation promise
  const generationPromise = openrouter.chat.completions.create({
    model: `openai/${modelName}`,
    messages: [{ role: "user", content: prompt }],
    temperature: config.temperature,
    top_p: config.top_p,
    max_tokens: config.max_tokens,
    presence_penalty: config.presence_penalty || 0,
    frequency_penalty: config.frequency_penalty || 0
  }).then(response => {
    return response.choices[0].message.content;
  });
  
  // Race between timeout and generation
  return Promise.race([generationPromise, timeoutPromise]);
}

/**
 * Record feedback about an AI response
 * @param {string} messageId - The message ID
 * @param {string} userId - The user ID
 * @param {number} rating - Rating (1-5)
 * @param {string} comment - Optional comment
 * @returns {Promise<void>}
 */
async function recordFeedback(messageId, userId, rating, comment = null) {
  // Here we would normally store this in a database
  // For now, we'll just log it
  console.log('Feedback recorded:', {
    messageId,
    userId,
    rating,
    comment
  });
  
  // 尝试更新对应消息的A/B测试结果
  if (userId) {
    try {
      const testAssignments = await abTestingService.getUserAssignments(userId);
      for (const [testId, assignment] of Object.entries(testAssignments)) {
        await abTestingService.recordTestResult({
          userId,
          testId,
          messageId,
          metrics: {
            rating
          }
        });
      }
    } catch (error) {
      console.error('Error updating A/B test result with feedback:', error);
    }
  }
  
  // If message queue is enabled, send feedback for analysis
  if (messageQueue) {
    await messageQueue.sendMessage('ai.feedback', {
      messageId,
      userId,
      rating,
      comment,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Record model performance data
 * @param {string} modelName - Name of the model used
 * @param {number} processingTime - Time taken to process in ms
 * @param {number} inputLength - Length of input text
 * @returns {void}
 */
function recordModelPerformance(modelName, processingTime, inputLength) {
  if (!modelStats.performance[modelName]) {
    modelStats.performance[modelName] = [];
  }
  
  // 保持性能记录的数组不会无限增长
  if (modelStats.performance[modelName].length >= 100) {
    modelStats.performance[modelName].shift(); // 删除最旧的记录
  }
  
  modelStats.performance[modelName].push({
    timestamp: new Date().toISOString(),
    processingTime,
    inputLength
  });
}

/**
 * Get model usage statistics
 * @returns {Object} Model usage stats
 */
function getModelStats() {
  // 计算每个模型的平均响应时间
  const averageResponseTimes = {};
  
  for (const [model, performanceData] of Object.entries(modelStats.performance)) {
    if (performanceData.length > 0) {
      const totalTime = performanceData.reduce((sum, data) => sum + data.processingTime, 0);
      averageResponseTimes[model] = totalTime / performanceData.length;
    } else {
      averageResponseTimes[model] = 0;
    }
  }
  
  return {
    usage: modelStats.usage,
    failures: modelStats.failures,
    averageResponseTimes,
    // 计算成功率
    successRates: Object.fromEntries(
      Object.entries(modelStats.usage).map(([model, count]) => {
        const total = count + (modelStats.failures[model] || 0);
        return [model, total > 0 ? (count / total) * 100 : 0];
      })
    )
  };
}

/**
 * Format a response for a specific platform
 * @param {string} text - Response text
 * @param {string} platform - Target platform
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted response
 */
function formatResponse(text, platform, options = {}) {
  return responseFormatter.formatRichResponse(text, platform, options);
}

module.exports = {
  processMessage,
  checkAiModelsAvailability,
  getModelStats,
  formatResponse,
  recordFeedback
}; 