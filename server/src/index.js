require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const passport = require('passport'); 
const session = require('express-session'); 
const cookieParser = require('cookie-parser'); 
const { GoogleGenerativeAI } = require("@google/generative-ai"); 
const cors = require('cors');
const opencage = require('opencage-api-client'); 
const validateColor = require('validate-color').default; 
const path = require('path'); // Added path module
// const franc = require('franc'); // Language detection - potentially needed if server manages dependencies

// Import Configs and Services
const supabase = require('./config/supabase'); // Import the configured client
const authMiddleware = require('./middleware/authMiddleware');

// Import Routers
const platformRoutes = require('./routes/platformRoutes'); // Import platform routes
const serviceRoutes = require('./routes/serviceRoutes'); // Import service routes
const authRoutes = require('./routes/authRoutes'); // Import the new auth routes
const contentRoutes = require('./routes/contentRoutes'); // Assuming content routes exist
const brandProfileRoutes = require('./routes/brandProfileRoutes'); // Assuming brand profile routes exist
const appointmentRoutes = require('./routes/appointmentRoutes'); // 导入预约路由
const autoReplyRoutes = require('./routes/autoReplyRoutes'); // Re-import auto-reply routes
const mapRoutes = require('./routes/mapRoutes'); // 导入地图路由
const teamRoutes = require('./routes/teamRoutes'); // 导入团队路由
const userRoutes = require('./routes/userRoutes'); // 导入用户路由

// Check if Supabase client initialized correctly
if (!supabase) {
  console.error("FATAL: Supabase client failed to initialize. Check config/supabase.js and .env settings.");
  // Optionally exit or prevent server start
  // process.exit(1);
}

// --- Initialize Gemini --- 
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.warn("Warning: GEMINI_API_KEY not found in .env file. Chat API will not work.");
}
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite"}) : null;
// ------------------------

// --- Initialize OpenCage ---
const openCageApiKey = process.env.OPENCAGE_API_KEY;
if (!openCageApiKey) {
    console.warn("Warning: OPENCAGE_API_KEY not found in .env file. Geocoding may not work.");
}
// ------------------------

const app = express();
const PORT = process.env.PORT || 3001; // Keep port 3001 as confirmed

// --- Middleware ---
// Configure CORS more flexibly - allow client origin from env or default
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
console.log(`CORS enabled for origin: ${clientOrigin}`); // Log the allowed origin
app.use(cors({
  origin: clientOrigin,
  credentials: true
}));
app.use(express.json()); // For parsing application/json
app.use(cookieParser()); 
// Session middleware might still be needed if passport relies on it, keep for now
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'please_change_this_secret_in_env', 
    resave: false,
    saveUninitialized: false, 
}));
app.use(passport.initialize()); 
// app.use(passport.session()); // Keep commented out unless needed

// Middleware to attach Gemini model to request object
app.use((req, res, next) => {
    if (geminiModel) {
        req.geminiModel = geminiModel;
    } else {
        console.warn('Gemini model not available for request');
    }
    next();
});
// ------------------

// --- API Routes ---

// Basic Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Mount all API routes under /api
app.use('/api/platforms', platformRoutes); 
app.use('/api/services', serviceRoutes);
app.use('/api/auth', authRoutes); // Mount the new auth routes
app.use('/api/content', contentRoutes); // Mount content routes
app.use('/api/brand-profile', brandProfileRoutes); // Mount brand profile routes
app.use('/api/appointments', appointmentRoutes); // 挂载预约路由
app.use('/api/auto-reply', autoReplyRoutes); // Re-mount auto-reply routes
app.use('/api/map', mapRoutes); // 挂载地图路由
app.use('/api/user', userRoutes); // Mount user profile/plan routes

// --- Protected Routes ---
// Apply auth middleware *only* to routes that require authentication
app.use('/api/services', authMiddleware, serviceRoutes);
app.use('/api/content', authMiddleware, contentRoutes);
app.use('/api/teams', authMiddleware, teamRoutes); // 添加团队路由到受保护路由
// Note: autoReplyRoutes already applies authMiddleware internally

// Centralized Error Handling Middleware (Example - implement as needed)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    // Optionally include stack trace in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Verify Supabase connection details on startup (optional)
  if (supabase) {
    console.log('Supabase client initialized.');
    // console.log(`Supabase URL: ${process.env.SUPABASE_URL}`); // Be careful logging keys/URLs
    // console.log(`Supabase Key Type Used: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon'}`);
  } else {
    console.error('Supabase client failed to initialize!');
  }
  // Verify Gemini initialization
  if (geminiModel) {
      console.log('Gemini model initialized successfully.');
  } else {
      console.warn('Gemini model failed to initialize or GEMINI_API_KEY is missing.');
  }
});

// Export app for potential testing or other uses
module.exports = app; 