/**
 * 消息队列服务
 * 处理与RabbitMQ的连接和消息通信
 */
const amqp = require('amqplib');
const { ApiError } = require('../middleware/errorHandler');

// 环境变量
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = process.env.RABBITMQ_QUEUE_NAME || 'core-service-queue';

// 连接和通道
let connection = null;
let channel = null;

/**
 * 初始化消息队列
 * @returns {Promise<void>}
 */
async function initialize() {
  try {
    // 连接到RabbitMQ服务器
    connection = await amqp.connect(RABBITMQ_URL);
    
    // 创建通道
    channel = await connection.createChannel();
    
    // 创建常用队列
    await Promise.all([
      channel.assertQueue('core.user', { durable: true }),
      channel.assertQueue('core.auth', { durable: true }),
      channel.assertQueue('core.profile', { durable: true }),
      channel.assertQueue('core.request', { durable: true }),
      channel.assertQueue('core.response', { durable: true })
    ]);
    
    console.log('消息队列已初始化');
    
    // 设置关闭事件处理
    connection.on('close', () => {
      console.log('RabbitMQ连接已关闭');
      setTimeout(() => {
        console.log('尝试重新连接到RabbitMQ...');
        initialize();
      }, 5000); // 5秒后重连
    });
    
    return { connection, channel };
  } catch (error) {
    console.error('初始化消息队列失败', error);
    throw error;
  }
}

/**
 * 检查连接是否活跃
 * @returns {Promise<boolean>} 连接是否活跃
 */
async function checkConnection() {
  if (!connection || !channel) {
    return false;
  }
  
  return true;
}

/**
 * 发送消息到队列
 * @param {string} queueName - 队列名称
 * @param {Object} message - 要发送的消息
 * @returns {Promise<boolean>} 消息是否发送成功
 */
async function sendMessage(queueName, message) {
  if (!channel) {
    try {
      await initialize();
    } catch (error) {
      console.error('发送消息前初始化队列失败', error);
      return false;
    }
  }
  
  try {
    // 确保队列存在
    await channel.assertQueue(queueName, { durable: true });
    
    // 发送消息
    return channel.sendToQueue(
      queueName, 
      Buffer.from(JSON.stringify(message)), 
      { 
        persistent: true,
        timestamp: Date.now(),
        contentType: 'application/json'
      }
    );
  } catch (error) {
    console.error(`向队列 ${queueName} 发送消息时出错`, error);
    return false;
  }
}

/**
 * 从队列消费消息
 * @param {string} queueName - 队列名称
 * @param {Function} handler - 消息处理函数
 * @returns {Promise<Object>} 消费者详情
 */
async function consumeMessages(queueName, handler) {
  if (!channel) {
    try {
      await initialize();
    } catch (error) {
      console.error('消费消息前初始化队列失败', error);
      throw error;
    }
  }
  
  try {
    // 确保队列存在
    await channel.assertQueue(queueName, { durable: true });
    
    // 设置prefetch，每个消费者一次处理一条消息
    await channel.prefetch(1);
    
    // 开始消费
    const { consumerTag } = await channel.consume(queueName, handler, {
      noAck: false // 手动确认
    });
    
    console.log(`开始从队列 ${queueName} 消费消息，消费者标签: ${consumerTag}`);
    
    return { queueName, consumerTag };
  } catch (error) {
    console.error(`从队列 ${queueName} 消费消息时出错`, error);
    throw error;
  }
}

/**
 * 取消一个消费者
 * @param {string} consumerTag - 消费者标签
 * @returns {Promise<boolean>} 是否成功取消
 */
async function cancelConsumer(consumerTag) {
  if (!channel) {
    return false;
  }
  
  try {
    await channel.cancel(consumerTag);
    return true;
  } catch (error) {
    console.error(`取消消费者 ${consumerTag} 时出错`, error);
    return false;
  }
}

/**
 * 关闭连接
 * @returns {Promise<void>}
 */
async function close() {
  if (channel) {
    await channel.close();
    channel = null;
  }
  
  if (connection) {
    await connection.close();
    connection = null;
  }
}

// 为连接错误和关闭添加事件处理
process.on('exit', async () => {
  await close();
});

module.exports = {
  initialize,
  sendMessage,
  consumeMessages,
  cancelConsumer,
  close,
  checkConnection,
  get connection() { return connection; },
  get channel() { return channel; }
}; 