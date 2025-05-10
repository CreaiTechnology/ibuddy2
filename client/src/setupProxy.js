const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 设置代理，处理API请求
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // 将/api前缀移除
      },
      logLevel: 'debug' // 添加日志以便调试
    })
  );
}; 