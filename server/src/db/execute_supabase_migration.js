require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Load Supabase client
const supabase = require('../config/supabase');

// Function to execute a SQL file
async function executeSqlFile(filePath) {
  console.log(`Executing SQL file: ${filePath}`);
  
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }
  
  // Read SQL file
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    // Execute the SQL using the supabase client's direct query method
    console.log('Executing SQL...');
    const { data, error } = await supabase.from('migration_log').insert({
      name: path.basename(filePath),
      executed_at: new Date().toISOString()
    }).select();
    
    if (error && error.code !== '42P01') { // Ignore "relation doesn't exist" error
      throw error;
    }
    
    // Execute the actual migration SQL
    const result = await supabase.query(sql);
    
    if (result.error) {
      throw result.error;
    }
    
    console.log('SQL executed successfully');
    return result.data;
  } catch (err) {
    console.error('Error executing SQL:', err);
    throw err;
  }
}

// Get the SQL file path from command line argument or use default
const sqlFile = process.argv[2] || path.join(__dirname, 'alter_appointments_table.sql');

// Execute the SQL file
executeSqlFile(sqlFile)
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  }); 