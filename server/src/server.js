const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const platformRoutes = require('./routes/platformRoutes');
const contentRoutes = require('./routes/contentRoutes');
const brandProfileRoutes = require('./routes/brandProfileRoutes');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Initialize Supabase
const supabase = require('./config/supabase'); 
// Initialize Gemini (ensure it runs after dotenv.config)
const { geminiModel } = require('./config/gemini');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/platforms', authMiddleware, platformRoutes);
app.use('/api/content', authMiddleware, contentRoutes);
app.use('/api/brand-profile', authMiddleware, brandProfileRoutes);

// Add authentication middleware to protected routes
// Note: For simplicity, we're not enforcing auth on routes now
// Example with auth:
// app.use('/api/platforms', authMiddleware, platformRoutes);
// app.use('/api/content', authMiddleware, contentRoutes);

// Home route
app.get('/', (req, res) => {
  res.send(`iBuddy API Server Running (Supabase Configured: ${!!supabase}, Gemini Configured: ${!!geminiModel})`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Global Error Handler]", err);
  // If the error has a status code, use it, otherwise default to 500
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only include stack trace in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    // Include error code if available (e.g., from database errors)
    code: err.code
  });
});

// Server startup
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  if (!supabase && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Supabase client not initialized in production!');
  } else if (!supabase) {
    console.warn('⚠️ Supabase client not initialized. Check environment variables.');
  }
  // Add check for Gemini model
  if (!geminiModel && process.env.GEMINI_API_KEY) {
     console.error('CRITICAL: Gemini client initialization failed despite API key being present!');
  } else if (!geminiModel) {
     console.warn('⚠️ Gemini client not initialized. Check GEMINI_API_KEY.');
  }
});

module.exports = app; 