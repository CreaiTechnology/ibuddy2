const express = require('express');
const { CustomerController } = require('../controllers/customerController');
const { authenticate, checkSubscription } = require('../middleware/auth');
const { validateCustomer } = require('../middleware/validation');

const router = express.Router();
const customerController = new CustomerController();

/**
 * 客户路由 - 管理客户信息
 */

// 获取所有客户
router.get('/', 
  authenticate, 
  checkSubscription('customer-management'),
  customerController.getAllCustomers.bind(customerController)
);

// 获取单个客户信息
router.get('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  customerController.getCustomer.bind(customerController)
);

// 创建新客户
router.post('/', 
  authenticate, 
  checkSubscription('customer-management'),
  validateCustomer,
  customerController.createCustomer.bind(customerController)
);

// 更新客户信息
router.put('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  validateCustomer,
  customerController.updateCustomer.bind(customerController)
);

// 删除客户
router.delete('/:id', 
  authenticate, 
  checkSubscription('customer-management'),
  customerController.deleteCustomer.bind(customerController)
);

// 按标签获取客户
router.get('/tag/:tagId', 
  authenticate, 
  checkSubscription('customer-management'),
  customerController.getCustomersByTag.bind(customerController)
);

// 搜索客户
router.get('/search/query', 
  authenticate, 
  checkSubscription('customer-management'),
  customerController.searchCustomers.bind(customerController)
);

// 获取客户统计
router.get('/stats/summary', 
  authenticate, 
  checkSubscription('customer-management'),
  customerController.getCustomerStats.bind(customerController)
);

module.exports = router; 