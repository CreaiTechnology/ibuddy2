const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * 内存消息队列 - 用于开发/测试环境
 */
class MemoryMessageQueue {
  constructor() {
    this.handlers = new Map();
    this.messages = [];
    this.processInterval = null;
    
    // 启动消息处理
    this.startProcessing();
  }
  
  /**
   * 发布消息
   * @param {string} topic - 主题
   * @param {object} message - 消息内容
   */
  async publish(topic, message) {
    const timestamp = new Date().toISOString();
    const id = `msg-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    
    this.messages.push({
      id,
      topic,
      message,
      timestamp,
      attempts: 0
    });
    
    console.log(`[MemoryMQ] 消息已发布到主题: ${topic}`);
    return { id, status: 'queued' };
  }
  
  /**
   * 订阅主题
   * @param {string} topic - 主题名称
   * @param {Function} handler - 处理函数
   */
  subscribe(topic, handler) {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    
    this.handlers.get(topic).push(handler);
    console.log(`[MemoryMQ] 已订阅主题: ${topic}`);
  }
  
  /**
   * 启动消息处理
   */
  startProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    
    this.processInterval = setInterval(() => {
      this.processMessages();
    }, 500);
  }
  
  /**
   * 处理队列中的消息
   */
  async processMessages() {
    if (this.messages.length === 0) return;
    
    const message = this.messages.shift();
    const handlers = this.handlers.get(message.topic) || [];
    
    if (handlers.length === 0) {
      // 如果没有处理程序，且尝试次数少于最大次数，则重新加入队列
      if (message.attempts < 3) {
        message.attempts += 1;
        this.messages.push(message);
      } else {
        console.warn(`[MemoryMQ] 消息无法处理，已丢弃: ${message.topic}`);
      }
      return;
    }
    
    // 调用所有处理程序
    for (const handler of handlers) {
      try {
        await handler(message.message);
      } catch (error) {
        console.error(`[MemoryMQ] 处理消息时出错:`, error);
      }
    }
  }
  
  /**
   * 停止消息处理
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }
}

/**
 * 消息队列服务 - 提供消息发布和订阅功能
 */
class MessageQueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = config.MQ_EXCHANGE;
    this.connected = false;
    this.lastError = null;
    this.subscriptions = new Map();
    
    // 内存消息队列（用于开发/测试或故障转移）
    this.memoryMQ = new MemoryMessageQueue();
    
    // 建立连接
    this._connect()
      .then(() => console.log('RabbitMQ连接已建立'))
      .catch(error => {
        console.error('RabbitMQ连接失败:', error.message);
        console.warn('使用内存消息队列作为备用');
        this.connected = false;
      });
  }
  
  /**
   * 初始化连接
   * @private
   */
  async _connect() {
    if (this.connected) return;
    
    try {
      // 连接RabbitMQ
      this.connection = await amqp.connect(config.RABBITMQ_URL);
      
      // 创建通道
      this.channel = await this.connection.createChannel();
      
      // 声明交换机
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });
      
      // 设置连接事件处理
      this.connection.on('error', err => {
        this.lastError = err;
        this.connected = false;
        console.error('RabbitMQ连接错误:', err);
      });
      
      this.connection.on('close', () => {
        this.connected = false;
        console.warn('RabbitMQ连接已关闭，尝试重新连接...');
        
        // 重新连接
        setTimeout(() => this._connect(), 5000);
      });
      
      this.connected = true;
      console.log('已连接到RabbitMQ');
      
      // 重新订阅之前的主题
      if (this.subscriptions.size > 0) {
        for (const [pattern, callback] of this.subscriptions.entries()) {
          await this._subscribe(pattern, callback);
        }
      }
    } catch (err) {
      this.lastError = err;
      console.error('连接RabbitMQ失败:', err);
      
      // 连接失败后重试
      setTimeout(() => this._connect(), 5000);
    }
  }
  
  /**
   * 内部订阅方法
   * @private
   */
  async _subscribe(pattern, callback) {
    try {
      if (!this.connected) {
        await this._connect();
      }
      
      // 为每个订阅创建一个唯一的队列
      const { queue } = await this.channel.assertQueue('', {
        exclusive: true,
        autoDelete: true
      });
      
      // 将队列绑定到交换机，使用主题模式
      await this.channel.bindQueue(queue, this.exchange, pattern);
      
      // 设置消费者
      await this.channel.consume(queue, async (msg) => {
        if (!msg) return;
        
        try {
          // 解析消息内容
          const content = JSON.parse(msg.content.toString());
          
          // 添加元数据
          content._meta = {
            messageId: msg.properties.messageId,
            timestamp: new Date(parseInt(msg.properties.timestamp)),
            routingKey: msg.fields.routingKey,
            pattern
          };
          
          // 调用回调处理消息
          await callback(content);
          
          // 确认消息已处理
          this.channel.ack(msg);
        } catch (err) {
          console.error(`处理消息错误 (${pattern}):`, err);
          
          // 根据需要选择是拒绝还是重新入队
          this.channel.nack(msg, false, false);
        }
      });
      
      console.log(`已订阅主题: ${pattern}`);
      
      // 保存订阅信息
      this.subscriptions.set(pattern, callback);
      
      return true;
    } catch (err) {
      console.error(`订阅主题错误 (${pattern}):`, err);
      return false;
    }
  }
  
  /**
   * 发布消息到主题
   * @param {string} topic - 主题
   * @param {object} message - 消息对象
   * @returns {Promise<boolean>} 是否成功
   */
  async publish(topic, message) {
    try {
      if (!this.connected) {
        await this._connect();
      }
      
      // 准备消息属性
      const options = {
        persistent: true,
        messageId: uuidv4(),
        timestamp: Date.now(),
        contentType: 'application/json'
      };
      
      // 发布消息
      const result = this.channel.publish(
        this.exchange,
        topic,
        Buffer.from(JSON.stringify(message)),
        options
      );
      
      return result;
    } catch (err) {
      console.error(`发布消息错误 (${topic}):`, err);
      return false;
    }
  }
  
  /**
   * 订阅主题
   * @param {string} pattern - 主题模式
   * @param {function} callback - 回调函数，接收消息内容
   * @returns {Promise<boolean>} 是否成功
   */
  async subscribe(pattern, callback) {
    if (!pattern || typeof callback !== 'function') {
      throw new Error('无效的订阅参数');
    }
    
    return this._subscribe(pattern, callback);
  }
  
  /**
   * 取消订阅
   * @param {string} pattern - 主题模式
   * @returns {Promise<boolean>} 是否成功
   */
  async unsubscribe(pattern) {
    try {
      if (!this.subscriptions.has(pattern)) {
        return true;
      }
      
      // 从订阅Map中移除
      this.subscriptions.delete(pattern);
      
      console.log(`已取消订阅主题: ${pattern}`);
      
      return true;
    } catch (err) {
      console.error(`取消订阅错误 (${pattern}):`, err);
      return false;
    }
  }
  
  /**
   * 执行消息队列健康检查
   */
  async healthCheck() {
    try {
      if (!this.connected) {
        await this._connect();
      }
      
      return {
        status: this.connected ? 'healthy' : 'unhealthy',
        message: this.connected ? 'RabbitMQ连接正常' : '未连接到RabbitMQ',
        subscriptions: this.subscriptions.size,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * 关闭连接
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      
      if (this.connection) {
        await this.connection.close();
      }
      
      this.connected = false;
      console.log('RabbitMQ连接已关闭');
      
      return true;
    } catch (err) {
      console.error('关闭RabbitMQ连接错误:', err);
      return false;
    }
  }
}

module.exports = { MessageQueueService }; 