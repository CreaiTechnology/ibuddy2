const app = require('./app');
const config = require('./config');
const { MessageQueueService } = require('./services/messageQueueService');

// 创建消息队列服务实例
const mq = new MessageQueueService();

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 设置未捕获异常处理
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
    });
    
    // 设置未处理的Promise拒绝处理
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
    });
    
    // 设置退出处理
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    // 订阅必要的消息主题
    await setupMessageSubscriptions();
    
    // 启动HTTP服务器
    const server = app.listen(config.PORT, () => {
      console.log(`客户服务已启动，监听端口: ${config.PORT}`);
      console.log(`环境: ${config.NODE_ENV}`);
      console.log(`服务ID: ${config.APP_ID}`);
      console.log(`健康检查: http://localhost:${config.PORT}/api/health`);
    });
    
    // 保存服务器引用，用于优雅关闭
    global.server = server;
  } catch (error) {
    console.error('启动服务器时出错:', error);
    process.exit(1);
  }
}

/**
 * 设置消息订阅
 */
async function setupMessageSubscriptions() {
  try {
    // 订阅客户相关事件
    await mq.subscribe('customer.*.created', handleCustomerCreated);
    await mq.subscribe('customer.*.updated', handleCustomerUpdated);
    await mq.subscribe('customer.*.deleted', handleCustomerDeleted);
    
    // 订阅来自AI服务的分析结果
    await mq.subscribe('ai.customer.analysis_result', handleCustomerAnalysis);
    
    console.log('已设置消息订阅');
  } catch (error) {
    console.error('设置消息订阅时出错:', error);
    throw error;
  }
}

/**
 * 处理客户创建事件
 */
async function handleCustomerCreated(message) {
  try {
    console.log('收到客户创建事件:', message._meta?.messageId);
    
    // 处理跨服务同步等逻辑
    // 这里添加处理代码
  } catch (error) {
    console.error('处理客户创建事件时出错:', error);
  }
}

/**
 * 处理客户更新事件
 */
async function handleCustomerUpdated(message) {
  try {
    console.log('收到客户更新事件:', message._meta?.messageId);
    
    // 处理跨服务同步等逻辑
    // 这里添加处理代码
  } catch (error) {
    console.error('处理客户更新事件时出错:', error);
  }
}

/**
 * 处理客户删除事件
 */
async function handleCustomerDeleted(message) {
  try {
    console.log('收到客户删除事件:', message._meta?.messageId);
    
    // 处理跨服务清理等逻辑
    // 这里添加处理代码
  } catch (error) {
    console.error('处理客户删除事件时出错:', error);
  }
}

/**
 * 处理AI分析结果
 */
async function handleCustomerAnalysis(message) {
  try {
    console.log('收到客户分析结果:', message._meta?.messageId);
    
    // 处理分析结果的存储和通知
    // 这里添加处理代码
  } catch (error) {
    console.error('处理客户分析结果时出错:', error);
  }
}

/**
 * 优雅关闭服务
 */
async function gracefulShutdown(signal) {
  console.log(`收到信号: ${signal}，开始优雅关闭...`);
  
  try {
    // 关闭HTTP服务器
    if (global.server) {
      await new Promise((resolve) => {
        global.server.close(resolve);
      });
      console.log('HTTP服务器已关闭');
    }
    
    // 关闭消息队列连接
    await mq.close();
    console.log('消息队列连接已关闭');
    
    console.log('所有连接已关闭，退出进程');
    process.exit(0);
  } catch (error) {
    console.error('优雅关闭过程中出错:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer(); 