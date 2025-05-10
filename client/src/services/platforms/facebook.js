import api from '../../api/axiosInstance';

const facebook = {
  // 授权
  authorize: async () => {
    try {
      // Facebook使用OAuth流程，不直接通过API授权
      // 这里只是获取授权URL，具体授权流程在PlatformApiManagement.jsx中处理
      const response = await api.get('/api/platforms/facebook/auth-url');
      return response.data;
    } catch (error) {
      console.error('Facebook authorization URL retrieval failed:', error);
      throw error;
    }
  },

  // 解绑
  unbind: async () => {
    try {
      // 调用后端API进行解绑
      const response = await api.post('/api/platforms/facebook/unbind');
      return response.data;
    } catch (error) {
      console.error('Facebook unbind failed:', error);
      throw error;
    }
  },

  // 获取账号信息
  getAccountInfo: async () => {
    try {
      // 调用后端API获取账号信息
      const response = await api.get('/api/platforms/facebook/account');
      return response.data;
    } catch (error) {
      console.error('Failed to get Facebook account info:', error);
      throw error;
    }
  },

  // 获取授权URL
  getAuthUrl: async () => {
    try {
      const response = await api.get('/api/platforms/facebook/auth-url');
      return response.data;
    } catch (error) {
      console.error('Failed to get Facebook authorization URL:', error);
      throw error;
    }
  }
};

export default facebook; 