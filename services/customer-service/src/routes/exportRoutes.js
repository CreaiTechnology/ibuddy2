const express = require('express');
const { ExportController } = require('../controllers/exportController');
const { authenticate, checkSubscription } = require('../middleware/auth');

const router = express.Router();
const exportController = new ExportController();

/**
 * 导出路由 - 提供数据导出功能
 */

// 导出客户数据
router.get('/customers', 
  authenticate, 
  checkSubscription('customer-management'),
  exportController.exportCustomers.bind(exportController)
);

// 导出标签数据
router.get('/tags', 
  authenticate, 
  checkSubscription('customer-management'),
  exportController.exportTags.bind(exportController)
);

// 导出互动记录数据
router.get('/interactions', 
  authenticate, 
  checkSubscription('customer-management'),
  exportController.exportInteractions.bind(exportController)
);

// 获取导出任务状态
router.get('/status/:id', 
  authenticate, 
  exportController.getExportStatus.bind(exportController)
);

// 下载导出文件
router.get('/download/:id', 
  authenticate, 
  exportController.downloadExport.bind(exportController)
);

// 获取最近的导出任务
router.get('/recent', 
  authenticate, 
  exportController.getRecentExports.bind(exportController)
);

module.exports = router; 