// const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase'); // Import the shared, configured client

// Remove redundant initialization and env checks
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_ANON_KEY; 
// if (!supabaseUrl || !supabaseKey) { ... }
// const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const authMiddleware = async (req, res, next) => {
    // Development bypass - enable this by setting env vars NODE_ENV=development and BYPASS_AUTH=true
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
        console.warn("⚠️ AUTH BYPASSED: Running in development mode with BYPASS_AUTH=true");
        // Use the MOCK_USER_ID from .env if available, otherwise fallback
        req.user = { id: process.env.MOCK_USER_ID || '00000000-0000-0000-0000-000000000000' }; // Use UUID placeholder
        return next();
    }

    // Check if the shared supabase client is available
    if (!supabase) {
        console.error("Auth Middleware Error: Shared Supabase client not initialized.");
        return res.status(503).json({ message: 'Authentication service unavailable.' });
    }

    // 1. Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        console.warn("Auth Middleware: No token provided.");
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    try {
        // 2. Verify the token using Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            console.error('Auth Middleware: Supabase token validation error:', error.message);
            // Differentiate between expired token and other errors if needed
            return res.status(401).json({ message: 'Invalid or expired token.', error: error.message });
        }

        if (!user) {
            console.warn('Auth Middleware: Token valid but no user found.');
            return res.status(401).json({ message: 'Invalid token: User not found.' });
        }

        // 3. Attach user information to the request object
        console.log(`Auth Middleware: User ${user.id} authenticated.`);
        req.user = user; // Attach the full user object from Supabase

        // 4. Call the next middleware or route handler
        next();

    } catch (err) {
        // Catch any unexpected errors during the process
        console.error('Auth Middleware: Unexpected error:', err);
        res.status(500).json({ message: 'Internal server error during authentication.' });
    }
};

module.exports = authMiddleware; 