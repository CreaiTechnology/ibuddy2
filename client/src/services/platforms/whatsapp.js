import api from '../../api/axiosInstance';

const whatsapp = {
  // 授权
  authorize: async () => {
    try {
      // 在实际场景中，这里会调用后端API进行授权
      const response = await api.post('/api/platforms/whatsapp/authorize');
      return response.data;
    } catch (error) {
      console.error('WhatsApp authorization failed:', error);
      throw error;
    }
  },

  // 解绑
  unbind: async () => {
    try {
      // 在实际场景中，这里会调用后端API进行解绑
      const response = await api.post('/api/platforms/whatsapp/unbind');
      return response.data;
    } catch (error) {
      console.error('WhatsApp unbind failed:', error);
      throw error;
    }
  },

  // 获取账号信息
  getAccountInfo: async () => {
    try {
      // 在实际场景中，这里会调用后端API获取账号信息
      const response = await api.get('/api/platforms/whatsapp/account');
      return response.data;
    } catch (error) {
      console.error('Failed to get WhatsApp account info:', error);
      throw error;
    }
  }
};

export default whatsapp; 