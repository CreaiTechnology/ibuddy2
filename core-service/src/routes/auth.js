/**
 * Authentication routes for the Core Service
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const dbService = require('../services/dbService');
const userController = require('../controllers/userController');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', [
  // Validation
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError('Validation error', 400, { errors: errors.array() });
  }
  
  const { email, password, name, role = 'user' } = req.body;
  
  // Check if user exists
  const existingUser = await userController.getUserByEmail(email);
  if (existingUser) {
    throw new ApiError('User already exists with this email', 409);
  }
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Create user
  const user = await dbService.create('users', {
    email,
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
  
  // Generate JWT
  const token = jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  
  // Return user data and token (excluding password)
  const { password: _, ...userData } = user;
  
  res.status(201).json({
    success: true,
    token: `Bearer ${token}`,
    user: userData
  });
}));

/**
 * @route POST /auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', [
  // Validation
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError('Validation error', 400, { errors: errors.array() });
  }
  
  const { email, password } = req.body;
  
  // Find user
  const user = await userController.getUserByEmail(email);
  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }
  
  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401);
  }
  
  // Generate JWT
  const token = jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  
  // Update last login
  await dbService.update('users', user.id, {
    last_login: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  // Return user data and token (excluding password)
  const { password: _, ...userData } = user;
  
  res.json({
    success: true,
    token: `Bearer ${token}`,
    user: userData
  });
}));

/**
 * @route GET /auth/verify
 * @desc Verify JWT token
 * @access Public
 */
router.get('/verify', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    throw new ApiError('No token provided', 401);
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user data
    const user = await dbService.getById('users', decoded.id, 'id, email, name, role, created_at, updated_at');
    
    if (!user) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new ApiError('Invalid or expired token', 401);
    }
    throw error;
  }
}));

/**
 * @route POST /auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError('Validation error', 400, { errors: errors.array() });
  }
  
  const { email } = req.body;
  
  // Find user
  const user = await userController.getUserByEmail(email);
  if (!user) {
    // Don't reveal that the user doesn't exist
    return res.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    });
  }
  
  // Generate reset token (expires in 1 hour)
  const resetToken = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Store reset token in database
  await dbService.update('users', user.id, {
    reset_token: resetToken,
    reset_token_expires: new Date(Date.now() + 3600000).toISOString(),
    updated_at: new Date().toISOString()
  });
  
  // In a real application, you would send an email with the reset link
  // For this example, we'll just return the token
  res.json({
    success: true,
    message: 'If your email is registered, you will receive a password reset link',
    // Only include this in development
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
}));

/**
 * @route POST /auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError('Validation error', 400, { errors: errors.array() });
  }
  
  const { token, password } = req.body;
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user with valid reset token
    const { data, error } = await dbService.supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .eq('reset_token', token)
      .gte('reset_token_expires', new Date().toISOString())
      .single();
      
    if (error || !data) {
      throw new ApiError('Invalid or expired token', 401);
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update password and clear reset token
    await dbService.update('users', data.id, {
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
      updated_at: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new ApiError('Invalid or expired token', 401);
    }
    throw error;
  }
}));

module.exports = router; 