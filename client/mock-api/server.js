const jsonServer = require('json-server');
const server = jsonServer.create();
const path = require('path');
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// 添加自定义中间件（记录请求）
server.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 为所有响应添加延迟，模拟真实网络环境
server.use((req, res, next) => {
  setTimeout(next, 300); // 添加 300ms 延迟
});

// 设置默认中间件（如静态文件、CORS 和 logger）
server.use(middlewares);

// 使用路由配置文件
const routes = require('./routes.json');
server.use(jsonServer.rewriter(routes));
server.use(router);

// 启动服务器
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`JSON Server 正在监听端口 ${PORT}`);
  console.log(`http://localhost:${PORT}/services - 访问服务列表`);
  console.log(`http://localhost:${PORT}/appointments - 访问预约列表`);
});