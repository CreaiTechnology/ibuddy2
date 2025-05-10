/**
 * 客户服务的客户路由
 */
const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { roleCheck } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

/**
 * @route GET /customers
 * @desc 获取所有客户
 * @access 授权
 */
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页限制必须是1-100之间的整数'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于等于1的整数'),
  query('sort').optional(),
  query('status').optional(),
  query('search').optional(),
  query('tags').optional(),
  query('source').optional(),
  query('lifecycle').optional()
], asyncHandler(customerController.getCustomers));

/**
 * @route GET /customers/stats
 * @desc 获取客户统计信息
 * @access 授权
 */
router.get('/stats', asyncHandler(customerController.getCustomerStats));

/**
 * @route GET /customers/:id
 * @desc 通过ID获取客户
 * @access 授权
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('无效的客户ID')
], asyncHandler(customerController.getCustomerById));

/**
 * @route GET /customers/:id/interactions
 * @desc 获取客户的互动历史
 * @access 授权
 */
router.get('/:id/interactions', [
  param('id').isMongoId().withMessage('无效的客户ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页限制必须是1-100之间的整数'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于等于1的整数'),
  query('types').optional()
], asyncHandler(customerController.getCustomerInteractions));

/**
 * @route POST /customers
 * @desc 创建新客户
 * @access 授权
 */
router.post('/', [
  body('firstName').notEmpty().withMessage('名字不能为空').trim(),
  body('lastName').notEmpty().withMessage('姓氏不能为空').trim(),
  body('organization').optional().trim(),
  body('contacts').optional().isArray(),
  body('contacts.*.type').optional().isIn(['email', 'phone', 'wechat', 'telegram', 'whatsapp', 'other']).withMessage('联系方式类型无效'),
  body('contacts.*.value').optional().notEmpty().withMessage('联系方式值不能为空'),
  body('addresses').optional().isArray(),
  body('tags').optional().isArray(),
  body('customFields').optional().isArray(),
  body('status').optional().isIn(['active', 'inactive', 'lead', 'potential', 'archived']).withMessage('状态值无效'),
  body('source').optional().isIn(['referral', 'website', 'campaign', 'social', 'direct', 'other']).withMessage('来源值无效'),
  body('notes').optional().trim(),
  body('lifecycle').optional().isIn(['prospect', 'lead', 'customer', 'former', 'champion']).withMessage('生命周期值无效')
], asyncHandler(customerController.createCustomer));

/**
 * @route PUT /customers/:id
 * @desc 更新客户
 * @access 授权
 */
router.put('/:id', [
  param('id').isMongoId().withMessage('无效的客户ID'),
  body('firstName').optional().notEmpty().withMessage('名字不能为空').trim(),
  body('lastName').optional().notEmpty().withMessage('姓氏不能为空').trim(),
  body('organization').optional().trim(),
  body('contacts').optional().isArray(),
  body('addresses').optional().isArray(),
  body('tags').optional().isArray(),
  body('customFields').optional().isArray(),
  body('status').optional().isIn(['active', 'inactive', 'lead', 'potential', 'archived']).withMessage('状态值无效'),
  body('source').optional().isIn(['referral', 'website', 'campaign', 'social', 'direct', 'other']).withMessage('来源值无效'),
  body('notes').optional().trim(),
  body('lifecycle').optional().isIn(['prospect', 'lead', 'customer', 'former', 'champion']).withMessage('生命周期值无效')
], asyncHandler(customerController.updateCustomer));

/**
 * @route DELETE /customers/:id
 * @desc 删除客户（软删除）
 * @access 授权（管理员）
 */
router.delete('/:id', [
  param('id').isMongoId().withMessage('无效的客户ID')
], roleCheck(['admin', 'manager']), asyncHandler(customerController.deleteCustomer));

module.exports = router; 