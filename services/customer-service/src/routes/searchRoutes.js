const express = require('express');
const { SearchController } = require('../controllers/searchController');
const { authenticate, checkSubscription } = require('../middleware/auth');

const router = express.Router();
const searchController = new SearchController();

/**
 * 搜索路由 - 提供各种搜索功能
 */

// 全局搜索
router.get('/global', 
  authenticate, 
  checkSubscription('customer-management'),
  searchController.globalSearch.bind(searchController)
);

// 高级客户搜索
router.get('/customers/advanced', 
  authenticate, 
  checkSubscription('customer-management'),
  searchController.advancedCustomerSearch.bind(searchController)
);

// 高级互动记录搜索
router.get('/interactions/advanced', 
  authenticate, 
  checkSubscription('customer-management'),
  searchController.advancedInteractionSearch.bind(searchController)
);

module.exports = router; 