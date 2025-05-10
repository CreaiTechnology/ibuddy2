const axios = require('axios');

// 测试标准端点
const testStandardEndpoint = async () => {
  try {
    const response = await axios.get('http://localhost:3001/services');
    console.log('标准端点响应成功:', response.status, response.data);
    return true;
  } catch (error) {
    console.error('标准端点访问失败:', error.message);
    return false;
  }
};

// 测试带 /api 前缀的端点
const testApiEndpoint = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/services');
    console.log('API端点响应成功:', response.status, response.data);
    return true;
  } catch (error) {
    console.error('API端点访问失败:', error.message);
    return false;
  }
};

// 测试根路径，查看服务器是否响应
const testRootPath = async () => {
  try {
    const response = await axios.get('http://localhost:3001/');
    console.log('根路径响应成功:', response.status);
    return true;
  } catch (error) {
    console.error('根路径访问失败:', error.message);
    return false;
  }
};

// 执行测试
const runTests = async () => {
  console.log('开始 API 测试...');
  
  // 测试服务器是否在线
  const rootAvailable = await testRootPath();
  
  if (rootAvailable) {
    console.log('服务器正在运行，测试API端点...');
    
    // 测试标准端点
    const standardWorks = await testStandardEndpoint();
    
    // 测试API端点
    const apiWorks = await testApiEndpoint();
    
    if (!standardWorks && !apiWorks) {
      console.log('所有端点测试失败，建议检查服务器配置和数据库路径');
    }
  } else {
    console.log('服务器未响应，请确保 json-server 正在运行');
  }
};

runTests(); 