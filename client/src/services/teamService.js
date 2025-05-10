import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

// Normalize team data (optional, but good practice)
const normalizeTeam = (team) => {
  return {
    id: team.id,
    name: team.name,
    colour: team.colour || team.color, // 兼容color或colour字段
    max_overlap: team.max_overlap
    // Add other fields if needed
  };
};

/**
 * 从API获取团队数据
 * @returns {Promise<Array>} - Array of normalized team objects
 */
export const fetchTeams = async () => {
  // 删除禁用团队功能的检查，确保团队始终加载
  
  console.log('[teamService] 正在从API获取团队数据...');
  try {
    // 使用和appointmentService一致的路径格式
    const response = await axiosInstance.get('/teams');
    console.log('[teamService] 团队数据获取成功:', response.data);
    
    // 确保数据是数组，然后标准化
    if (Array.isArray(response.data)) {
      return response.data.map(team => normalizeTeam(team));
    } else {
      console.error('[teamService] API返回的数据格式不正确:', response.data);
      // 不显示错误提示，避免影响用户体验
      console.warn('[teamService] 返回空团队列表');
      return []; // 返回空数组
    }
  } catch (error) {
    console.error('[teamService] 获取团队数据失败:', error);
    
    // 仅在控制台记录错误，不向用户显示错误提示
    // 这避免了在API尚未实现时出现错误弹窗
    console.warn('[teamService] API不可用，返回空团队列表');
    
    // 静默失败，返回空数组
    return [];
  }
};

/**
 * 创建新团队
 * @param {Object} teamData - 新团队数据 { name, colour, max_overlap }
 * @returns {Promise<Object>} - 创建的团队对象
 */
export const createTeam = async (teamData) => {
  console.log('[teamService] 正在创建团队:', teamData);
  try {
    const response = await axiosInstance.post('/teams', teamData);
    toast.success('团队创建成功');
    return normalizeTeam(response.data);
  } catch (error) {
    console.error('[teamService] 创建团队失败:', error.response?.data || error);
    toast.error('创建团队失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    throw error; 
  }
};

/**
 * 更新现有团队
 * @param {string} teamId - 要更新的团队ID
 * @param {Object} teamData - 更新的团队数据
 * @returns {Promise<Object>} - 更新后的团队对象
 */
export const updateTeam = async (teamId, teamData) => {
  console.log(`[teamService] 正在更新团队 ${teamId}:`, teamData);
  try {
    const response = await axiosInstance.put(`/teams/${teamId}`, teamData);
    toast.success('团队更新成功');
    return normalizeTeam(response.data);
  } catch (error) {
    console.error(`[teamService] 更新团队失败 ${teamId}:`, error.response?.data || error);
    toast.error('更新团队失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    throw error;
  }
};

/**
 * 删除团队
 * @param {string} teamId - 要删除的团队ID
 * @returns {Promise<void>}
 */
export const deleteTeam = async (teamId) => {
  console.log(`[teamService] 正在删除团队 ${teamId}`);
  try {
    await axiosInstance.delete(`/teams/${teamId}`);
    toast.success('团队删除成功');
  } catch (error) {
    console.error(`[teamService] 删除团队失败 ${teamId}:`, error.response?.data || error);
    toast.error('删除团队失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    throw error;
  }
};

// 导出所有函数
const teamService = {
  fetchTeams,
  createTeam,
  updateTeam,
  deleteTeam
};

export default teamService; 