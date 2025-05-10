/**
 * Profile routes for the Core Service
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const dbService = require('../services/dbService');
const { roleCheck } = require('../middleware/auth');

/**
 * @route GET /profiles
 * @desc Get all profiles (admin only)
 * @access Protected
 */
router.get('/', roleCheck('admin'), asyncHandler(async (req, res) => {
  const { limit = 10, offset = 0, orderBy = 'created_at', sort = 'desc' } = req.query;
  
  const { data, count } = await dbService.query('profiles', {
    limit: parseInt(limit),
    offset: parseInt(offset),
    orderBy: {
      field: orderBy,
      ascending: sort.toLowerCase() === 'asc'
    }
  });
  
  res.json({
    success: true,
    profiles: data,
    pagination: {
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * @route GET /profiles/:userId
 * @desc Get profile by user ID
 * @access Protected
 */
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check access permission (admin or own profile)
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    throw new ApiError('Permission denied', 403);
  }
  
  const { data } = await dbService.query('profiles', {
    filters: [
      { field: 'user_id', eq: true, value: userId }
    ]
  });
  
  if (!data || data.length === 0) {
    throw new ApiError('Profile not found', 404);
  }
  
  res.json({
    success: true,
    profile: data[0]
  });
}));

/**
 * @route PUT /profiles/:userId
 * @desc Update profile by user ID
 * @access Protected
 */
router.put('/:userId', [
  body('display_name').optional().notEmpty().withMessage('Display name cannot be empty'),
  body('bio').optional(),
  body('avatar_url').optional(),
  body('preferences').optional().isObject().withMessage('Preferences must be an object')
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check access permission (admin or own profile)
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    throw new ApiError('Permission denied', 403);
  }
  
  // Find the profile
  const { data } = await dbService.query('profiles', {
    filters: [
      { field: 'user_id', eq: true, value: userId }
    ]
  });
  
  if (!data || data.length === 0) {
    throw new ApiError('Profile not found', 404);
  }
  
  const profileId = data[0].id;
  
  // Update profile
  const { display_name, bio, avatar_url, preferences } = req.body;
  
  const updateData = {
    updated_at: new Date().toISOString()
  };
  
  if (display_name !== undefined) updateData.display_name = display_name;
  if (bio !== undefined) updateData.bio = bio;
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
  if (preferences !== undefined) updateData.preferences = preferences;
  
  const updatedProfile = await dbService.update('profiles', profileId, updateData);
  
  res.json({
    success: true,
    profile: updatedProfile
  });
}));

/**
 * @route POST /profiles/:userId/upload-avatar
 * @desc Upload avatar url for a profile
 * @access Protected
 */
router.post('/:userId/upload-avatar', [
  body('avatar_url').notEmpty().withMessage('Avatar URL is required')
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { avatar_url } = req.body;
  
  // Check access permission (admin or own profile)
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    throw new ApiError('Permission denied', 403);
  }
  
  // Find the profile
  const { data } = await dbService.query('profiles', {
    filters: [
      { field: 'user_id', eq: true, value: userId }
    ]
  });
  
  if (!data || data.length === 0) {
    throw new ApiError('Profile not found', 404);
  }
  
  const profileId = data[0].id;
  
  // Update avatar URL
  const updatedProfile = await dbService.update('profiles', profileId, {
    avatar_url,
    updated_at: new Date().toISOString()
  });
  
  res.json({
    success: true,
    profile: updatedProfile
  });
}));

/**
 * @route POST /profiles/:userId/preferences
 * @desc Update user preferences
 * @access Protected
 */
router.post('/:userId/preferences', [
  body('preferences').isObject().withMessage('Preferences must be an object')
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;
  
  // Check access permission (admin or own profile)
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    throw new ApiError('Permission denied', 403);
  }
  
  // Find the profile
  const { data } = await dbService.query('profiles', {
    filters: [
      { field: 'user_id', eq: true, value: userId }
    ]
  });
  
  if (!data || data.length === 0) {
    throw new ApiError('Profile not found', 404);
  }
  
  const profileId = data[0].id;
  const currentPreferences = data[0].preferences || {};
  
  // Merge preferences
  const updatedPreferences = {
    ...currentPreferences,
    ...preferences
  };
  
  // Update preferences
  const updatedProfile = await dbService.update('profiles', profileId, {
    preferences: updatedPreferences,
    updated_at: new Date().toISOString()
  });
  
  res.json({
    success: true,
    profile: updatedProfile
  });
}));

module.exports = router; 