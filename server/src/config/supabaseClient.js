const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Or SUPABASE_ANON_KEY based on your needs

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found. Please check your .env file in the server directory.');
  // Optionally throw an error to prevent the app from starting without Supabase config
  // throw new Error('Supabase URL or Key not configured');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = supabase; 