const request = require('supertest');
const app = require('../../src/app');
const { DatabaseService } = require('../../src/services/databaseService');
const { MessageQueueService } = require('../../src/services/messageQueueService');

// 模拟UUID生成
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234')
}));

// 模拟数据库和消息队列服务
jest.mock('../../src/services/databaseService');
jest.mock('../../src/services/messageQueueService');

// 模拟认证中间件
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  },
  checkSubscription: () => (req, res, next) => next()
}));

describe('ExportController', () => {
  let db;
  let mq;
  
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    db = DatabaseService.mock.instances[0];
    mq = MessageQueueService.mock.instances[0];
    
    // 模拟数据库方法
    db.insert = jest.fn().mockResolvedValue({ data: { id: 'test-uuid-1234' }, error: null });
    db.update = jest.fn().mockResolvedValue({ data: { id: 'test-uuid-1234' }, error: null });
    db.query = jest.fn().mockResolvedValue({ 
      data: [{ 
        id: 'test-uuid-1234',
        user_id: 'test-user-id',
        type: 'customers',
        format: 'csv',
        status: 'processing',
        created_at: '2023-01-01T00:00:00Z'
      }], 
      error: null 
    });
    
    // 模拟消息队列方法
    mq.publish = jest.fn().mockResolvedValue(true);
    
    // 模拟定时器
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('exportCustomers', () => {
    it('返回400如果格式无效', async () => {
      const response = await request(app)
        .get('/api/exports/customers?format=invalid')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('不支持的导出格式');
    });
    
    it('创建导出任务并返回任务ID', async () => {
      const response = await request(app)
        .get('/api/exports/customers?format=csv')
        .expect(200);
      
      expect(db.insert).toHaveBeenCalled();
      expect(mq.publish).toHaveBeenCalled();
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('export_id', 'test-uuid-1234');
      expect(response.body).toHaveProperty('status', 'processing');
    });
  });
  
  describe('exportTags', () => {
    it('创建标签导出任务', async () => {
      const response = await request(app)
        .get('/api/exports/tags?format=json')
        .expect(200);
      
      expect(db.insert).toHaveBeenCalled();
      expect(mq.publish).toHaveBeenCalled();
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('export_id', 'test-uuid-1234');
      expect(response.body).toHaveProperty('format', 'json');
    });
  });
  
  describe('exportInteractions', () => {
    it('创建互动记录导出任务', async () => {
      const response = await request(app)
        .get('/api/exports/interactions?format=xlsx&customer_id=123')
        .expect(200);
      
      expect(db.insert).toHaveBeenCalled();
      expect(mq.publish).toHaveBeenCalled();
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('export_id', 'test-uuid-1234');
      expect(response.body.meta).toHaveProperty('customer_id', '123');
    });
  });
  
  describe('getExportStatus', () => {
    it('返回404如果任务不存在', async () => {
      db.query.mockResolvedValueOnce({ data: [], error: null });
      
      const response = await request(app)
        .get('/api/exports/status/non-existent-id')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('找不到导出任务');
    });
    
    it('返回导出任务状态', async () => {
      const response = await request(app)
        .get('/api/exports/status/test-uuid-1234')
        .expect(200);
      
      expect(db.query).toHaveBeenCalled();
      expect(response.body).toHaveProperty('export_id', 'test-uuid-1234');
      expect(response.body).toHaveProperty('status', 'processing');
    });
  });
  
  describe('getRecentExports', () => {
    it('返回最近的导出任务列表', async () => {
      db.query.mockResolvedValueOnce({ 
        data: [
          { 
            id: 'export-1', 
            type: 'customers', 
            status: 'completed',
            created_at: '2023-01-01T00:00:00Z' 
          },
          { 
            id: 'export-2', 
            type: 'tags', 
            status: 'processing',
            created_at: '2023-01-02T00:00:00Z' 
          }
        ], 
        error: null 
      });
      
      const response = await request(app)
        .get('/api/exports/recent?limit=2')
        .expect(200);
      
      expect(db.query).toHaveBeenCalled();
      expect(response.body).toHaveProperty('exports');
      expect(response.body.exports).toHaveLength(2);
    });
  });
}); 