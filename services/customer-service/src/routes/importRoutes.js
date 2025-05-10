const express = require('express');
const multer = require('multer');
const { ImportController } = require('../controllers/importController');
const { authenticate, checkSubscription } = require('../middleware/auth');
const config = require('../config');

// 配置文件上传
const upload = multer({
  dest: config.UPLOAD_DIR || 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    const allowedMimes = [
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

const router = express.Router();
const importController = new ImportController();

/**
 * 导入路由 - 提供数据导入功能
 */

// 导入客户数据
router.post('/customers', 
  authenticate, 
  checkSubscription('customer-management'),
  upload.single('file'),
  importController.importCustomers.bind(importController)
);

// 导入标签数据
router.post('/tags', 
  authenticate, 
  checkSubscription('customer-management'),
  upload.single('file'),
  importController.importTags.bind(importController)
);

// 获取导入任务状态
router.get('/status/:id', 
  authenticate, 
  importController.getImportStatus.bind(importController)
);

// 获取最近的导入任务
router.get('/recent', 
  authenticate, 
  importController.getRecentImports.bind(importController)
);

// 取消进行中的导入任务
router.post('/cancel/:id', 
  authenticate, 
  importController.cancelImport.bind(importController)
);

module.exports = router; 