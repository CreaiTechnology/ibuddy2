/**
 * Message queue service for the AI Service
 * Handles asynchronous communication between services
 */
const amqp = require('amqplib');

// Environment variables
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = process.env.RABBITMQ_QUEUE_NAME || 'ai-service-queue';

// Connection and channel
let connection = null;
let channel = null;

/**
 * Initialize the message queue
 * @returns {Promise<void>}
 */
async function initialize() {
  try {
    // Connect to RabbitMQ server
    connection = await amqp.connect(RABBITMQ_URL);
    
    // Create a channel
    channel = await connection.createChannel();
    
    // Create common queues
    await Promise.all([
      channel.assertQueue('ai.request', { durable: true }),
      channel.assertQueue('ai.response', { durable: true }),
      channel.assertQueue('ai.feedback', { durable: true })
    ]);
    
    console.log('Message queue initialized');
    
    return { connection, channel };
  } catch (error) {
    console.error('Failed to initialize message queue', error);
    throw error;
  }
}

/**
 * Check if the connection is active
 * @returns {Promise<boolean>} Whether the connection is active
 */
async function checkConnection() {
  if (!connection || !channel) {
    return false;
  }
  
  return true;
}

/**
 * Send a message to a queue
 * @param {string} queueName - The queue name
 * @param {Object} message - The message to send
 * @returns {Promise<boolean>} Whether the message was sent
 */
async function sendMessage(queueName, message) {
  if (!channel) {
    try {
      await initialize();
    } catch (error) {
      console.error('Failed to initialize message queue for sending', error);
      return false;
    }
  }
  
  try {
    // Make sure queue exists
    await channel.assertQueue(queueName, { durable: true });
    
    // Send the message
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
    console.error(`Error sending message to queue ${queueName}`, error);
    return false;
  }
}

/**
 * Consume messages from a queue
 * @param {string} queueName - The queue name
 * @param {Function} handler - The message handler function
 * @returns {Promise<Object>} Consumer details
 */
async function consumeMessages(queueName, handler) {
  if (!channel) {
    try {
      await initialize();
    } catch (error) {
      console.error('Failed to initialize message queue for consuming', error);
      throw error;
    }
  }
  
  try {
    // Make sure queue exists
    await channel.assertQueue(queueName, { durable: true });
    
    // Set prefetch to process one message at a time per consumer
    await channel.prefetch(1);
    
    // Start consuming
    const { consumerTag } = await channel.consume(queueName, handler, {
      noAck: false // Manual acknowledgment
    });
    
    console.log(`Started consuming from queue ${queueName}, consumer tag: ${consumerTag}`);
    
    return { queueName, consumerTag };
  } catch (error) {
    console.error(`Error consuming messages from queue ${queueName}`, error);
    throw error;
  }
}

/**
 * Cancel a consumer
 * @param {string} consumerTag - The consumer tag
 * @returns {Promise<boolean>} Whether the consumer was cancelled
 */
async function cancelConsumer(consumerTag) {
  if (!channel) {
    return false;
  }
  
  try {
    await channel.cancel(consumerTag);
    return true;
  } catch (error) {
    console.error(`Error cancelling consumer ${consumerTag}`, error);
    return false;
  }
}

/**
 * Close the connection
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

// Add event handlers for connection errors and closing
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