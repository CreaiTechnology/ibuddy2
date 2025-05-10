/**
 * User controller for the Core Service
 * Handles user-related operations
 */
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const dbService = require('../services/dbService');
const cacheService = require('../services/cacheService');
const bcrypt = require('bcryptjs');

// Cache configuration
const CACHE_TTL = 60 * 15; // 15 minutes cache
const USER_CACHE_PREFIX = 'user:';
const USERS_LIST_CACHE_PREFIX = 'users:list:';

/**
 * Get all users with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUsers = asyncHandler(async (req, res) => {
  const { limit = 10, offset = 0, orderBy = 'created_at', sort = 'desc' } = req.query;
  
  // Try to get from cache
  const cacheKey = `${USERS_LIST_CACHE_PREFIX}${limit}:${offset}:${orderBy}:${sort}`;
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }
  
  // Get from database
  const { data, count } = await dbService.query('users', {
    select: 'id, email, name, role, created_at, updated_at, last_login',
    limit: parseInt(limit),
    offset: parseInt(offset),
    orderBy: {
      field: orderBy,
      ascending: sort.toLowerCase() === 'asc'
    }
  });
  
  const result = {
    success: true,
    users: data,
    pagination: {
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  };
  
  // Save to cache
  await cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL);
  
  res.json(result);
});

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Try to get from cache
  const cacheKey = `${USER_CACHE_PREFIX}${id}`;
  const cachedUser = await cacheService.get(cacheKey);
  
  if (cachedUser) {
    return res.json({
      success: true,
      user: JSON.parse(cachedUser)
    });
  }
  
  // Get from database
  const user = await dbService.getById('users', id, 'id, email, name, role, created_at, updated_at, last_login');
  
  // Save to cache
  await cacheService.set(cacheKey, JSON.stringify(user), CACHE_TTL);
  
  res.json({
    success: true,
    user
  });
});

/**
 * Get user by email (internal function)
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
const getUserByEmail = async (email) => {
  // Try to get from cache
  const cacheKey = `${USER_CACHE_PREFIX}email:${email.toLowerCase()}`;
  const cachedUser = await cacheService.get(cacheKey);
  
  if (cachedUser) {
    return JSON.parse(cachedUser);
  }
  
  // Get from database
  const { data } = await dbService.query('users', {
    filters: [
      { field: 'email', eq: true, value: email.toLowerCase() }
    ]
  });
  
  const user = data && data.length > 0 ? data[0] : null;
  
  // If user found, save to cache
  if (user) {
    await cacheService.set(cacheKey, JSON.stringify(user), CACHE_TTL);
    // Also update ID cache
    await cacheService.set(`${USER_CACHE_PREFIX}${user.id}`, JSON.stringify(user), CACHE_TTL);
  }
  
  return user;
};

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createUser = asyncHandler(async (req, res) => {
  const { email, password, name, role = 'user' } = req.body;
  
  // Check if user exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new ApiError('User already exists with this email', 409);
  }
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Create user
  const user = await dbService.create('users', {
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  // Create initial profile
  await dbService.create('profiles', {
    user_id: user.id,
    display_name: name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  // Clear user list cache
  await cacheService.clearPrefix(USERS_LIST_CACHE_PREFIX);
  
  // Return user data (excluding password)
  const { password: _, ...userData } = user;
  
  // Cache new user
  await cacheService.set(`${USER_CACHE_PREFIX}${user.id}`, JSON.stringify(userData), CACHE_TTL);
  await cacheService.set(`${USER_CACHE_PREFIX}email:${email.toLowerCase()}`, JSON.stringify(user), CACHE_TTL);
  
  res.status(201).json({
    success: true,
    user: userData
  });
});

/**
 * Update a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  
  // Get the existing user
  const existingUser = await dbService.getById('users', id);
  
  // Check if updating email and it's different
  if (email && email !== existingUser.email) {
    // Check if email is already in use
    const emailExists = await getUserByEmail(email);
    if (emailExists && emailExists.id !== parseInt(id)) {
      throw new ApiError('Email is already in use', 409);
    }
  }
  
  // Prepare update data
  const updateData = {
    updated_at: new Date().toISOString()
  };
  
  if (name) updateData.name = name;
  if (email) updateData.email = email.toLowerCase();
  if (role) updateData.role = role;
  
  // Hash password if it's being updated
  if (password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(password, salt);
  }
  
  // Update user
  const updatedUser = await dbService.update('users', id, updateData);
  
  // Clear cache
  await cacheService.del(`${USER_CACHE_PREFIX}${id}`);
  if (existingUser.email) {
    await cacheService.del(`${USER_CACHE_PREFIX}email:${existingUser.email.toLowerCase()}`);
  }
  if (email) {
    await cacheService.del(`${USER_CACHE_PREFIX}email:${email.toLowerCase()}`);
  }
  await cacheService.clearPrefix(USERS_LIST_CACHE_PREFIX);
  
  // Return updated user (excluding password)
  const { password: _, ...userData } = updatedUser;
  
  // Update cache
  await cacheService.set(`${USER_CACHE_PREFIX}${id}`, JSON.stringify(userData), CACHE_TTL);
  if (email) {
    await cacheService.set(`${USER_CACHE_PREFIX}email:${email.toLowerCase()}`, JSON.stringify(updatedUser), CACHE_TTL);
  }
  
  res.json({
    success: true,
    user: userData
  });
});

/**
 * Delete a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get the user to ensure it exists
  await dbService.getById('users', id);
  
  // Delete associated profile (won't throw if none exists)
  try {
    await dbService.supabase
      .from('profiles')
      .delete()
      .eq('user_id', id);
  } catch (error) {
    req.logger?.warn(`Failed to delete profile for user ${id}`, { error: error.message });
  }
  
  // Delete the user
  await dbService.remove('users', id);
  
  // Clear cache
  await cacheService.del(`${USER_CACHE_PREFIX}${id}`);
  if (existingUser.email) {
    await cacheService.del(`${USER_CACHE_PREFIX}email:${existingUser.email.toLowerCase()}`);
  }
  await cacheService.clearPrefix(USERS_LIST_CACHE_PREFIX);
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Get user data excluding password
  const user = await dbService.getById('users', userId, 'id, email, name, role, created_at, updated_at, last_login');
  
  // Get profile data
  const { data: profiles } = await dbService.query('profiles', {
    filters: [
      { field: 'user_id', eq: true, value: userId }
    ]
  });
  
  const profile = profiles && profiles.length > 0 ? profiles[0] : null;
  
  res.json({
    success: true,
    user,
    profile
  });
});

module.exports = {
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser
}; 