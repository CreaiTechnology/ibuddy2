// eslint-disable-next-line unicode-bom
import { platforms } from './platforms';
import api from '../api/axiosInstance';

// 平台服务
const platformService = {
  // 获取所有平台的授权状态
  getPlatformStatus: async () => {
    try {
      console.log('调用API: /platforms/status');
      const response = await api.get('/platforms/status');
      console.log('API调用成功:', response.data);
      return response.data;
    } catch (error) {
      console.error('获取平台状态失败:', error);
      throw error;
    }
  },
  
  // 授权特定平台
  authorizePlatform: async (platformKey) => {
    try {
      if (!platforms[platformKey]) {
        throw new Error(`平台 ${platformKey} 不受支持`);
      }
      
      console.log(`调用API: /platforms/${platformKey}/authorize`);
      const response = await api.post(`/platforms/${platformKey}/authorize`);
      console.log('授权API调用成功:', response.data);
      return response.data;
    } catch (error) {
      console.error(`授权平台 ${platformKey} 失败:`, error);
      throw error;
    }
  },
  
  // 解绑特定平台
  unbindPlatform: async (platformKey) => {
    try {
      if (!platforms[platformKey]) {
        throw new Error(`平台 ${platformKey} 不受支持`);
      }
      
      console.log(`调用API: /platforms/${platformKey}/unbind`);
      const response = await api.post(`/platforms/${platformKey}/unbind`);
      console.log('解绑API调用成功:', response.data);
      return response.data;
    } catch (error) {
      console.error(`解绑平台 ${platformKey} 失败:`, error);
      throw error;
    }
  },
  
  // 获取平台账号信息
  getPlatformAccountInfo: async (platformKey) => {
    try {
      if (!platforms[platformKey]) {
        throw new Error(`平台 ${platformKey} 不受支持`);
      }
      
      console.log(`调用API: /platforms/${platformKey}/account`);
      const response = await api.get(`/platforms/${platformKey}/account`);
      console.log('获取账号信息API调用成功:', response.data);
      return response.data;
    } catch (error) {
      console.error(`获取 ${platformKey} 账号信息失败:`, error);
      throw error;
    }
  },
  
  // 获取OAuth URL用于平台授权（例如Facebook）
  getPlatformAuthUrl: async (platformKey) => {
    try {
      console.log(`获取平台授权URL: ${platformKey}`);
      const response = await api.get(`/platforms/${platformKey}/auth-url`);
      console.log('获取授权URL成功:', response.data);
      return response.data;
    } catch (error) {
      console.error(`获取 ${platformKey} 授权URL失败:`, error);
      throw error;
    }
  },

  // 新增：连接 WhatsApp Cloud API
  connectWhatsApp: async (credentials) => {
    const { apiToken, phoneNumberId } = credentials;
    try {
      console.log(`连接 WhatsApp: Phone Number ID = ${phoneNumberId}`);
      // 调用后端 POST /api/platforms/whatsapp/authorize
      // 将凭证作为请求体发送
      const response = await api.post('/platforms/whatsapp/authorize', { 
        apiToken: apiToken, 
        phoneNumberId: phoneNumberId 
      });
      console.log('WhatsApp 连接成功:', response.data);
      // 后端成功时应该返回类似 { success: true, accountInfo: { accountId: ..., accountName: ..., metadata: ... } } 的结构
      return response.data.accountInfo; // 返回账号信息供前端更新状态
    } catch (error) {
      console.error('连接 WhatsApp 失败:', error.response ? error.response.data : error);
      // 重新抛出错误，以便在调用处捕获并显示给用户
      throw error; 
    }
  }
};

export default platformService;
