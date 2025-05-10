/**
 * Authentication routes for the API Gateway
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Environment variables
const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    // Forward the request to the core service
    const response = await axios.post(`${CORE_SERVICE_URL}/auth/login`, req.body);
    
    // If login is successful, create a token
    if (response.data.success) {
      const { user } = response.data;
      
      // Create JWT token
      const token = jwt.sign(
        { 
          id: user.id,
          email: user.email,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      
      // Return user data and token
      return res.json({
        success: true,
        token: `Bearer ${token}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
    
    // If we reached here, something went wrong with the core service response
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
    
  } catch (error) {
    console.error('Login error:', error.message);
    
    // If the error comes from the core service, pass it along
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    // Otherwise, return a generic error
    return res.status(500).json({
      success: false,
      message: 'Authentication service unavailable'
    });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    // Forward the request to the core service
    const response = await axios.post(`${CORE_SERVICE_URL}/auth/register`, req.body);
    
    // Pass through the response from the core service
    return res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('Registration error:', error.message);
    
    // If the error comes from the core service, pass it along
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    // Otherwise, return a generic error
    return res.status(500).json({
      success: false,
      message: 'Registration service unavailable'
    });
  }
});

/**
 * @route GET /api/auth/verify
 * @desc Verify a token
 * @access Public
 */
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    return res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router; 