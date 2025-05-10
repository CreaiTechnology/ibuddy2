import { createClient } from '@supabase/supabase-js';

// Use environment variables (prefixed with REACT_APP_) for keys in React
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://mgheimlvdvazclsutmzf.supabase.co'; 
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naGVpbWx2ZHZhemNsc3V0bXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTM1MDAsImV4cCI6MjA1OTE2OTUwMH0.QfcKOfYqVqRB1UshudDO5VmsV7qx3bT0tPItLrY9Vno';

if (!supabaseUrl || supabaseUrl === 'https://mgheimlvdvazclsutmzf.supabase.co' || 
    !supabaseAnonKey || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naGVpbWx2ZHZhemNsc3V0bXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTM1MDAsImV4cCI6MjA1OTE2OTUwMH0.QfcKOfYqVqRB1UshudDO5VmsV7qx3bT0tPItLrY9Vno') {
    console.warn(
        'Supabase URL or Anon Key is not configured. Please create a .env file in the client directory with REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.'
    );
    // You might want to throw an error or handle this differently depending on your needs
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 