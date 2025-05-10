const express = require('express');
const { TagController } = require('../controllers/tagController');
const { authenticate, checkSubscription } = require('../middleware/auth');
const { validateTag } = require('../middleware/validation');

const router = express.Router();
const tagController = new TagController();

/**
 * 标签路由 - 管理客户标签
 */

// 获取所有标签
router.get('/', 
  authenticate, 
  checkSubscription('customer-management'),
  tagController.getAllTags.bind(tagController)
);

// 获取单个标签
router.get('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  tagController.getTag.bind(tagController)
);

// 创建新标签
router.post('/', 
  authenticate, 
  checkSubscription('customer-management'),
  validateTag,
  tagController.createTag.bind(tagController)
);

// 更新标签
router.put('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  validateTag,
  tagController.updateTag.bind(tagController)
);

// 删除标签
router.delete('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  tagController.deleteTag.bind(tagController)
);

// 为客户添加标签
router.post('/customer/:customerId/add/:tagId', 
  authenticate, 
  checkSubscription('customer-management'),
  tagController.addTagToCustomer.bind(tagController)
);

// 从客户移除标签
router.delete('/customer/:customerId/remove/:tagId', 
  authenticate, 
  checkSubscription('customer-management'),
  tagController.removeTagFromCustomer.bind(tagController)
);

module.exports = router; 