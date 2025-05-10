import api from '../../api/axiosInstance';

const xiaohongshu = {
  // 授权
  authorize: async () => {
    try {
      // 小红书使用OAuth流程，不直接通过API授权
      // 这里只是获取授权URL，具体授权流程在PlatformApiManagement.jsx中处理
      const response = await api.get('/api/platforms/xiaohongshu/auth-url');
      return response.data;
    } catch (error) {
      console.error('Xiaohongshu authorization URL retrieval failed:', error);
      throw error;
    }
  },

  // 解绑
  unbind: async () => {
    try {
      // 调用后端API进行解绑
      const response = await api.post('/api/platforms/xiaohongshu/unbind');
      return response.data;
    } catch (error) {
      console.error('Xiaohongshu unbind failed:', error);
      throw error;
    }
  },

  // 获取账号信息
  getAccountInfo: async () => {
    try {
      // 调用后端API获取账号信息
      const response = await api.get('/api/platforms/xiaohongshu/account');
      return response.data;
    } catch (error) {
      console.error('Failed to get Xiaohongshu account info:', error);
      throw error;
    }
  },

  // 获取授权URL
  getAuthUrl: async () => {
    try {
      const response = await api.get('/api/platforms/xiaohongshu/auth-url');
      return response.data;
    } catch (error) {
      console.error('Failed to get Xiaohongshu authorization URL:', error);
      throw error;
    }
  }
};

export default xiaohongshu; 