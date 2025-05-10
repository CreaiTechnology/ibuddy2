const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// 获取所有预约（支持过滤）
router.get('/', appointmentController.getAppointments);

// 获取可用时间段建议
router.get('/suggestions', appointmentController.getAppointmentSuggestions);

// 获取预约数据用于地图视图
router.get('/map-data', appointmentController.getMapAppointments);

// 获取单个预约
router.get('/:id', appointmentController.getAppointmentById);

// 创建新预约
router.post('/', appointmentController.createAppointment);

// 更新预约
router.put('/:id', appointmentController.updateAppointment);

// 删除预约
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router; 