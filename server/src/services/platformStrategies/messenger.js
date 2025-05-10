const createBaseStrategy = require('./baseStrategy');
const facebookStrategy = require('./facebook'); // 导入 facebook 策略

// 创建一个 Messenger 策略，可以先用基础策略，然后覆盖或添加特定方法
const messengerStrategy = createBaseStrategy('messenger');

// Messenger 的 OAuth 流程通常依赖于 Facebook
// 因此，直接复用 Facebook 的 getAuthUrl 方法
messengerStrategy.getAuthUrl = facebookStrategy.getAuthUrl;

// 如果 Messenger 有其他不同于 Facebook 的特定 API 调用，可以在这里添加
// 例如: messengerStrategy.postMessage = async (...) => { ... };

module.exports = messengerStrategy; 