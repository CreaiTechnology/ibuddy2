const jsonServer = require('json-server');
const path = require('path');
const server = jsonServer.create();
const dbPath = path.join(__dirname, 'db.json');
const router = jsonServer.router(dbPath);
const middlewares = jsonServer.defaults();

// 记录所有请求
server.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 使用默认中间件
server.use(middlewares);

// 直接使用路由器，不做路径重写
server.use(router);

// 启动服务器
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`简化版 JSON Server 已启动，监听端口 ${PORT}`);
  console.log(`使用数据库文件: ${dbPath}`);
  console.log('\n可用端点:');
  console.log(`http://localhost:${PORT}/services`);
  console.log(`http://localhost:${PORT}/appointments`);
}); 