/**
 * Core Service for ibuddy2 microservices
 * Handles user management, authentication, and database access
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const profileRoutes = require('./routes/profiles');
const userExperienceRoutes = require('./routes/user-experience');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// Import services
const messageQueue = require('./services/messageQueue');
const cacheService = require('./services/cacheService');

// Setup winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'core-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Setup Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Add request ID to each request for tracking
app.use((req, res, next) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  next();
});

// Add logger to request
app.use((req, res, next) => {
  req.logger = logger.child({ requestId: req.id });
  next();
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Initialize services if enabled
if (process.env.ENABLE_REDIS_CACHE === 'true') {
  cacheService.initialize()
    .then(() => logger.info('Redis cache initialized'))
    .catch(err => logger.error('Redis cache initialization failed', { error: err.message }));
}

if (process.env.ENABLE_MESSAGE_QUEUE === 'true') {
  messageQueue.initialize()
    .then(() => logger.info('Message queue initialized'))
    .catch(err => logger.error('Message queue initialization failed', { error: err.message }));
}

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/users', authMiddleware, usersRoutes);
app.use('/profiles', authMiddleware, profileRoutes);
app.use('/user-experience', authMiddleware, userExperienceRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Core Service running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

module.exports = app; 