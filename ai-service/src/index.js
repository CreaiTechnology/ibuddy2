/**
 * AI Service for ibuddy2 microservices
 * Handles all AI-related functionality including auto-reply, intent recognition, etc.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const compression = require('compression');

// Import routes
const healthRoutes = require('./routes/health');
const chatRoutes = require('./routes/chat');
const intentRoutes = require('./routes/intent');
const autoReplyRoutes = require('./routes/autoReply');
const abTestRoutes = require('./routes/abTest');
const analyticsRoutes = require('./routes/analytics');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const { recordModelUsage } = require('./middleware/analyticsMiddleware');

// Import services
const intentService = require('./services/intentService');
const aiService = require('./services/aiService');

// Setup winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize message queue (if enabled)
const messageQueue = process.env.ENABLE_MESSAGE_QUEUE === 'true'
  ? require('./services/messageQueue')
  : null;

// Create Express app
const app = express();

// Basic middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('combined')); // HTTP request logging
app.use(compression());
app.use(recordModelUsage); // 添加分析中间件

// Inject logger into request object
app.use((req, res, next) => {
  req.logger = logger;
  next();
});

// Public routes
app.use('/health', healthRoutes);

// Protected routes
app.use('/chat', authMiddleware, chatRoutes);
app.use('/intent', authMiddleware, intentRoutes);
app.use('/auto-reply', authMiddleware, autoReplyRoutes);
app.use('/ab-test', authMiddleware, abTestRoutes);
app.use('/analytics', authMiddleware, analyticsRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Initialize intent service
    const intentInitialized = await intentService.initialize();
    if (intentInitialized) {
      logger.info('Intent service initialized successfully');
    } else {
      logger.warn('Intent service initialization failed, using fallback methods');
    }
    
    // Initialize AI model availability check
    const aiModelsAvailable = await aiService.checkAiModelsAvailability();
    if (aiModelsAvailable) {
      logger.info('AI models available and ready');
    } else {
      logger.warn('AI models not available, service may be degraded');
    }
    
    return true;
  } catch (error) {
    logger.error('Error initializing services:', error);
    return false;
  }
}

// Start server
const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, async () => {
  logger.info(`AI Service running on port ${PORT}`);
  console.log(`AI Service running on port ${PORT}`);
  
  // Initialize services after server start
  await initializeServices();
});

// Initialize message queue consumers
if (messageQueue) {
  messageQueue.initialize()
    .then(() => {
      logger.info('Message queue initialized');
      
      // 设置消息队列消费者
      setupMessageQueueConsumers(messageQueue, logger);
    })
    .catch((err) => {
      logger.error('Failed to initialize message queue', err);
    });
}

/**
 * Set up message queue consumers for various message types
 * @param {Object} queue - Message queue instance
 * @param {Object} logger - Logger instance
 */
function setupMessageQueueConsumers(queue, logger) {
  // AI request handler
  queue.consumeMessages('ai.request', async (msg) => {
    try {
      const data = JSON.parse(msg.content.toString());
      logger.debug(`Received ai.request message: ${data.type}`);
      
      // Process different types of AI requests
      if (data.type === 'message') {
        // Process a chat message
        const response = await aiService.processMessage({
          text: data.text,
          userId: data.userId,
          sessionId: data.sessionId,
          platform: data.platform,
          context: data.context
        });
        
        // Send response back if replyTo is provided
        if (data.replyTo) {
          await queue.sendMessage(data.replyTo, {
            type: 'response',
            messageId: response.messageId,
            text: response.text,
            intent: response.intent,
            requestId: data.requestId
          });
        }
      }
      else if (data.type === 'intent') {
        // Process an intent recognition request
        const intentResult = await intentService.recognizeIntent(
          data.text,
          data.modelId || 'default',
          data.context
        );
        
        // Send response back if replyTo is provided
        if (data.replyTo) {
          await queue.sendMessage(data.replyTo, {
            type: 'intent_result',
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            allIntents: intentResult.allIntents,
            requestId: data.requestId
          });
        }
      }
      
      // Acknowledge message
      queue.channel.ack(msg);
    } catch (error) {
      logger.error('Error processing queued message', error);
      // Reject message
      queue.channel.nack(msg, false, false);
    }
  });
  
  // Feedback handler
  queue.consumeMessages('ai.feedback', async (msg) => {
    try {
      const feedback = JSON.parse(msg.content.toString());
      logger.debug(`Received feedback for message ${feedback.messageId}`);
      
      // Process the feedback
      await aiService.recordFeedback(
        feedback.messageId,
        feedback.userId,
        feedback.rating,
        feedback.comment
      );
      
      // Acknowledge message
      queue.channel.ack(msg);
    } catch (error) {
      logger.error('Error processing feedback message', error);
      // Reject message
      queue.channel.nack(msg, false, false);
    }
  });
  
  // Intent training handler
  queue.consumeMessages('ai.train_intent', async (msg) => {
    try {
      const training = JSON.parse(msg.content.toString());
      logger.debug(`Received intent training for ${training.intent}`);
      
      // Train the intent model
      const success = await intentService.trainIntent(
        training.intent,
        training.examples,
        training.modelId || 'default'
      );
      
      // Send response back if replyTo is provided
      if (training.replyTo) {
        await queue.sendMessage(training.replyTo, {
          type: 'training_result',
          intent: training.intent,
          success,
          requestId: training.requestId
        });
      }
      
      // Acknowledge message
      queue.channel.ack(msg);
    } catch (error) {
      logger.error('Error processing intent training message', error);
      // Reject message
      queue.channel.nack(msg, false, false);
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close message queue connection if it exists
    if (messageQueue && messageQueue.connection) {
      messageQueue.connection.close();
      logger.info('Message queue connection closed');
    }
    
    process.exit(0);
  });
});

module.exports = app; // For testing 