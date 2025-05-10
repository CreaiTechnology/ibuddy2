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
  }
};

export default platformService; 