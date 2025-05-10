import api from '../../api/axiosInstance';

const lazada = {
  // 授权
  authorize: async () => {
    try {
      // Lazada可能使用API密钥授权或OAuth流程
      const response = await api.post('/api/platforms/lazada/authorize');
      return response.data;
    } catch (error) {
      console.error('Lazada authorization failed:', error);
      throw error;
    }
  },

  // 解绑
  unbind: async () => {
    try {
      // 调用后端API进行解绑
      const response = await api.post('/api/platforms/lazada/unbind');
      return response.data;
    } catch (error) {
      console.error('Lazada unbind failed:', error);
      throw error;
    }
  },

  // 获取账号信息
  getAccountInfo: async () => {
    try {
      // 调用后端API获取账号信息
      const response = await api.get('/api/platforms/lazada/account');
      return response.data;
    } catch (error) {
      console.error('Failed to get Lazada account info:', error);
      throw error;
    }
  },

  // 获取授权URL（如果Lazada使用OAuth流程）
  getAuthUrl: async () => {
    try {
      const response = await api.get('/api/platforms/lazada/auth-url');
      return response.data;
    } catch (error) {
      console.error('Failed to get Lazada authorization URL:', error);
      throw error;
    }
  }
};

export default lazada; 