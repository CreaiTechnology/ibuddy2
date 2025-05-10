const express = require('express');
const { InteractionController } = require('../controllers/interactionController');
const { authenticate, checkSubscription } = require('../middleware/auth');
const { validateInteraction, validateBulkInteractions } = require('../middleware/validation');

const router = express.Router();
const interactionController = new InteractionController();

/**
 * 互动路由 - 管理客户互动记录
 */

// 获取单个互动记录
router.get('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  interactionController.getInteraction.bind(interactionController)
);

// 创建新互动记录
router.post('/', 
  authenticate, 
  checkSubscription('customer-management'),
  validateInteraction,
  interactionController.createInteraction.bind(interactionController)
);

// 更新互动记录
router.put('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  validateInteraction,
  interactionController.updateInteraction.bind(interactionController)
);

// 删除互动记录
router.delete('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  interactionController.deleteInteraction.bind(interactionController)
);

// 批量创建互动记录
router.post('/bulk', 
  authenticate, 
  checkSubscription('customer-management'),
  validateBulkInteractions,
  interactionController.bulkCreateInteractions.bind(interactionController)
);

// 获取最近互动记录
router.get('/recent/all', 
  authenticate, 
  checkSubscription('customer-management'),
  interactionController.getRecentInteractions.bind(interactionController)
);

// 获取客户的互动记录
router.get('/customer/:customerId', 
  authenticate, 
  checkSubscription('customer-management'),
  interactionController.getCustomerInteractions.bind(interactionController)
);

module.exports = router; 