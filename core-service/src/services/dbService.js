/**
 * Database service for Supabase integration
 * Provides database access methods for all models
 */
const { createClient } = require('@supabase/supabase-js');
const { ApiError } = require('../middleware/errorHandler');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Check if Supabase is configured
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Warning: Supabase credentials not configured. Database operations will fail.');
}

// Create Supabase client
const supabase = createClient(
  SUPABASE_URL || 'https://example.supabase.co',
  SUPABASE_SERVICE_KEY || 'dummy-key'
);

/**
 * Check database connection
 * @returns {Promise<boolean>} Whether the connection is successful
 */
async function checkConnection() {
  try {
    // Simple query to check connection
    const { data, error } = await supabase
      .from('health_check')
      .select('*')
      .limit(1);
      
    if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows returned"
      throw new Error(`Database connection error: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Generic query function
 * @param {string} table - Table name
 * @param {Object} query - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(table, query = {}) {
  try {
    let queryBuilder = supabase.from(table).select(query.select || '*');
    
    // Apply filters if provided
    if (query.filters) {
      query.filters.forEach(filter => {
        if (filter.eq) {
          queryBuilder = queryBuilder.eq(filter.field, filter.value);
        } else if (filter.neq) {
          queryBuilder = queryBuilder.neq(filter.field, filter.value);
        } else if (filter.gt) {
          queryBuilder = queryBuilder.gt(filter.field, filter.value);
        } else if (filter.gte) {
          queryBuilder = queryBuilder.gte(filter.field, filter.value);
        } else if (filter.lt) {
          queryBuilder = queryBuilder.lt(filter.field, filter.value);
        } else if (filter.lte) {
          queryBuilder = queryBuilder.lte(filter.field, filter.value);
        } else if (filter.like) {
          queryBuilder = queryBuilder.like(filter.field, `%${filter.value}%`);
        } else if (filter.in) {
          queryBuilder = queryBuilder.in(filter.field, filter.value);
        }
      });
    }
    
    // Apply pagination
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }
    
    if (query.offset) {
      queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 10) - 1);
    }
    
    // Apply ordering
    if (query.orderBy) {
      queryBuilder = queryBuilder.order(query.orderBy.field, { 
        ascending: query.orderBy.ascending !== false 
      });
    }
    
    const { data, error, count } = await queryBuilder;
    
    if (error) {
      throw new ApiError(`Database query error: ${error.message}`, 500, { code: error.code });
    }
    
    return { data, count };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Database error: ${error.message}`, 500);
  }
}

/**
 * Get a single item by ID
 * @param {string} table - Table name
 * @param {string|number} id - Item ID
 * @param {string} select - Fields to select
 * @returns {Promise<Object>} Item data
 */
async function getById(table, id, select = '*') {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(`Item not found with ID: ${id}`, 404);
      }
      throw new ApiError(`Database error: ${error.message}`, 500, { code: error.code });
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Database error: ${error.message}`, 500);
  }
}

/**
 * Create a new item
 * @param {string} table - Table name
 * @param {Object} data - Item data
 * @returns {Promise<Object>} Created item
 */
async function create(table, data) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
      
    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw new ApiError('Duplicate entry', 409, { 
          detail: error.details,
          code: error.code
        });
      }
      
      throw new ApiError(`Failed to create item: ${error.message}`, 500, { 
        code: error.code 
      });
    }
    
    return result[0];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Database error: ${error.message}`, 500);
  }
}

/**
 * Update an existing item
 * @param {string} table - Table name
 * @param {string|number} id - Item ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated item
 */
async function update(table, id, data) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
      
    if (error) {
      throw new ApiError(`Failed to update item: ${error.message}`, 500, { 
        code: error.code 
      });
    }
    
    if (!result.length) {
      throw new ApiError(`Item not found with ID: ${id}`, 404);
    }
    
    return result[0];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Database error: ${error.message}`, 500);
  }
}

/**
 * Delete an item
 * @param {string} table - Table name
 * @param {string|number} id - Item ID
 * @returns {Promise<boolean>} Success status
 */
async function remove(table, id) {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
      
    if (error) {
      throw new ApiError(`Failed to delete item: ${error.message}`, 500, { 
        code: error.code 
      });
    }
    
    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Database error: ${error.message}`, 500);
  }
}

module.exports = {
  supabase,
  checkConnection,
  query,
  getById,
  create,
  update,
  remove
}; 