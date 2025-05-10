/**
 * 服务客户端
 * 处理与其他微服务的HTTP通信
 */
const axios = require('axios');
const { ApiError } = require('../middleware/errorHandler');

// 服务配置
const services = {
  AI_SERVICE: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:3002',
    timeout: 30000 // 30秒
  },
  // 在这里添加其他服务...
};

// 创建API客户端，带有重试功能
function createApiClient(serviceConfig, authToken = null) {
  const client = axios.create({
    baseURL: serviceConfig.url,
    timeout: serviceConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    }
  });
  
  // 请求拦截器
  client.interceptors.request.use(
    config => {
      // 在请求发送前可以添加额外处理
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );
  
  // 响应拦截器
  client.interceptors.response.use(
    response => {
      return response.data;
    },
    async error => {
      // 处理服务不可用、超时等错误
      if (!error.response) {
        throw new ApiError(
          `服务不可用: ${serviceConfig.url}`,
          503,
          { originalError: error.message }
        );
      }
      
      // 处理HTTP错误
      const status = error.response.status;
      const data = error.response.data;
      
      // 转换为一致的错误格式
      throw new ApiError(
        data.message || `服务请求失败(${status})`,
        status,
        { originalError: data }
      );
    }
  );
  
  return client;
}

/**
 * AI服务客户端
 * 提供与AI服务通信的方法
 */
class AiServiceClient {
  constructor(userToken = null) {
    this.client = createApiClient(services.AI_SERVICE, userToken);
  }
  
  /**
   * 发送聊天消息
   * @param {Object} params - 聊天参数
   * @returns {Promise<Object>} 聊天响应
   */
  async chat(params) {
    try {
      return await this.client.post('/chat', params);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 分析文本意图
   * @param {Object} params - 意图分析参数
   * @returns {Promise<Object>} 意图分析结果
   */
  async analyzeIntent(params) {
    try {
      return await this.client.post('/intent', params);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 生成自动回复
   * @param {Object} params - 自动回复参数
   * @returns {Promise<Object>} 自动回复结果
   */
  async generateAutoReply(params) {
    try {
      return await this.client.post('/auto-reply', params);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 检查AI服务健康状态
   * @returns {Promise<Object>} 健康状态
   */
  async checkHealth() {
    try {
      return await this.client.get('/health');
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

/**
 * 创建服务客户端
 * @param {string} serviceName - 服务名称
 * @param {string} [userToken] - 用户认证令牌
 * @returns {Object} 服务客户端实例
 */
function createServiceClient(serviceName, userToken = null) {
  switch (serviceName.toUpperCase()) {
    case 'AI_SERVICE':
      return new AiServiceClient(userToken);
    default:
      throw new Error(`未知的服务: ${serviceName}`);
  }
}

module.exports = {
  createServiceClient,
  AiServiceClient
}; 