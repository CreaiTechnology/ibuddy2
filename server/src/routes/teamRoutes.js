const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

// 获取所有团队
router.get('/', teamController.getTeams);

// 获取单个团队
router.get('/:id', teamController.getTeamById);

// 创建新团队
router.post('/', teamController.createTeam);

// 更新团队
router.put('/:id', teamController.updateTeam);

// 删除团队
router.delete('/:id', teamController.deleteTeam);

module.exports = router; 