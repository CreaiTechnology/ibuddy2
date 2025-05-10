require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database connection details from environment variables
const dbConfig = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST,
  port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
  database: process.env.DB_NAME || process.env.POSTGRES_DATABASE,
  user: process.env.DB_USER || process.env.POSTGRES_USER,
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? true : false
};

// Alternative: Use Supabase direct URL if it exists
if (process.env.SUPABASE_DB_URL) {
  dbConfig.connectionString = process.env.SUPABASE_DB_URL;
}

// Function to execute a SQL file
async function executeSqlFile(filePath) {
  console.log(`Executing SQL file: ${filePath}`);
  
  // Read SQL file
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Create a new database client
  const pool = new Pool(dbConfig);
  
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to database');
    
    try {
      // Execute the SQL
      console.log('Executing SQL...');
      const result = await client.query(sql);
      console.log('SQL executed successfully');
      return result;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Error executing SQL:', err);
    throw err;
  } finally {
    // Close the pool
    await pool.end();
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