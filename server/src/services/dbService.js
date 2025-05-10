// const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase'); // Import the shared, configured client

/**
 * Fetches all records from the 'services' table.
 * @returns {Promise<Array>} A promise that resolves to an array of service objects.
 * @throws {Error} If Supabase client is not initialized or query fails.
 */
const fetchAllServices = async () => {
    // Check the imported shared client
    if (!supabase) {
        throw new Error("Supabase client is not initialized.");
    }

    console.log("DB Service: Fetching all services using shared client...");
    
    // Use the shared client for the query
    const { data, error } = await supabase
        .from('services') 
        .select('*');     

    if (error) {
        console.error("DB Service Error fetching services:", error);
        throw new Error(`Failed to fetch services: ${error.message}`);
    }

    console.log(`DB Service: Fetched ${data?.length || 0} services.`);
    return data || []; 
};

// Add other database functions here as needed, always using the shared 'supabase' client

// Example: Fetch teams (if this logic belongs here)
const fetchAllTeams = async () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized.");
    }
    console.log("DB Service: Fetching all teams using shared client...");
    const { data, error } = await supabase.from('teams').select('*');
    if (error) {
        console.error("DB Service Error fetching teams:", error);
        throw new Error(`Failed to fetch teams: ${error.message}`);
    }
    console.log(`DB Service: Fetched ${data?.length || 0} teams.`);
    return data || [];
};

// Export the functions
module.exports = {
    fetchAllServices,
    fetchAllTeams, // Add other exported functions
}; 