/**
 * User routes for the Core Service
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { roleCheck } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route GET /users
 * @desc Get all users (admin only)
 * @access Protected
 */
router.get('/', roleCheck('admin'), asyncHandler(userController.getUsers));

/**
 * @route GET /users/me
 * @desc Get current user profile
 * @access Protected
 */
router.get('/me', asyncHandler(userController.getCurrentUser));

/**
 * @route GET /users/:id
 * @desc Get user by ID (admin only)
 * @access Protected
 */
router.get('/:id', roleCheck('admin'), asyncHandler(userController.getUserById));

/**
 * @route POST /users
 * @desc Create a new user (admin only)
 * @access Protected
 */
router.post('/', 
  roleCheck('admin'),
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['user', 'admin']).withMessage('Role must be either user or admin')
  ],
  asyncHandler(userController.createUser)
);

/**
 * @route PUT /users/:id
 * @desc Update a user
 * @access Protected
 */
router.put('/:id', 
  [
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role must be either user or admin')
  ],
  asyncHandler(async (req, res, next) => {
    // Check if user is admin or updating their own profile
    if (req.user.role === 'admin' || req.user.id === parseInt(req.params.id)) {
      // If user is not admin, remove role from request
      if (req.user.role !== 'admin') {
        delete req.body.role;
      }
      return userController.updateUser(req, res, next);
    }
    return res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  })
);

/**
 * @route DELETE /users/:id
 * @desc Delete a user (admin only)
 * @access Protected
 */
router.delete('/:id', roleCheck('admin'), asyncHandler(userController.deleteUser));

module.exports = router; 