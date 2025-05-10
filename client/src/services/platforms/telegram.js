import api from '../../api/axiosInstance';

const telegram = {
  // 授权
  authorize: async () => {
    try {
      // Telegram使用Bot Token进行授权
      const response = await api.post('/api/platforms/telegram/authorize');
      return response.data;
    } catch (error) {
      console.error('Telegram authorization failed:', error);
      throw error;
    }
  },

  // 解绑
  unbind: async () => {
    try {
      // 调用后端API进行解绑
      const response = await api.post('/api/platforms/telegram/unbind');
      return response.data;
    } catch (error) {
      console.error('Telegram unbind failed:', error);
      throw error;
    }
  },

  // 获取账号信息
  getAccountInfo: async () => {
    try {
      // 调用后端API获取账号信息
      const response = await api.get('/api/platforms/telegram/account');
      return response.data;
    } catch (error) {
      console.error('Failed to get Telegram account info:', error);
      throw error;
    }
  },

  // 获取授权URL（如果Telegram使用OAuth流程）
  getAuthUrl: async () => {
    try {
      const response = await api.get('/api/platforms/telegram/auth-url');
      return response.data;
    } catch (error) {
      console.error('Failed to get Telegram authorization URL:', error);
      throw error;
    }
  }
};

export default telegram; 