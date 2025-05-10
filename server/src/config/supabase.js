const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Use the Service Role Key for backend operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// Check for the Service Role Key
if (!supabaseUrl || !supabaseServiceKey) { 
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided in the environment variables.');
  // Optionally exit if running in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  console.warn('⚠️ Supabase client not initialized due to missing environment variables.');
}

// Initialize Supabase client only if variables are present, using the Service Role Key
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) // Use the Service Role Key here
  : null;

// Log success or failure
if (supabase) {
  console.log('Supabase client initialized successfully using Service Role Key.');
} else if (supabaseUrl && !supabaseServiceKey) {
  console.error('SupABASE Service Role Key is missing, client not initialized.');
} else if (!supabaseUrl && supabaseServiceKey) {
   console.error('SupABASE URL is missing, client not initialized.');
}

module.exports = supabase; 