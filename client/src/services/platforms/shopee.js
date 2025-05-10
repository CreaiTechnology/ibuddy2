import api from '../../api/axiosInstance';

const shopee = {
  // 授权
  authorize: async () => {
    try {
      // Shopee可能使用API密钥授权或OAuth流程
      const response = await api.post('/api/platforms/shopee/authorize');
      return response.data;
    } catch (error) {
      console.error('Shopee authorization failed:', error);
      throw error;
    }
  },

  // 解绑
  unbind: async () => {
    try {
      // 调用后端API进行解绑
      const response = await api.post('/api/platforms/shopee/unbind');
      return response.data;
    } catch (error) {
      console.error('Shopee unbind failed:', error);
      throw error;
    }
  },

  // 获取账号信息
  getAccountInfo: async () => {
    try {
      // 调用后端API获取账号信息
      const response = await api.get('/api/platforms/shopee/account');
      return response.data;
    } catch (error) {
      console.error('Failed to get Shopee account info:', error);
      throw error;
    }
  },

  // 获取授权URL（如果Shopee使用OAuth流程）
  getAuthUrl: async () => {
    try {
      const response = await api.get('/api/platforms/shopee/auth-url');
      return response.data;
    } catch (error) {
      console.error('Failed to get Shopee authorization URL:', error);
      throw error;
    }
  }
};

export default shopee; 