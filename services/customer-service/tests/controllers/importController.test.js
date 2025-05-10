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

// 模拟Multer
jest.mock('multer', () => {
  const multerMock = () => {
    return {
      single: () => (req, res, next) => {
        // 模拟文件上传
        req.file = {
          originalname: 'test-file.csv',
          mimetype: 'text/csv',
          size: 1024,
          path: '/tmp/test-file.csv'
        };
        next();
      }
    };
  };
  multerMock.diskStorage = () => ({});
  return multerMock;
});

// 模拟认证中间件
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  },
  checkSubscription: () => (req, res, next) => next()
}));

describe('ImportController', () => {
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
  
  describe('importCustomers', () => {
    it('返回400如果格式无效', async () => {
      const response = await request(app)
        .post('/api/imports/customers?format=invalid')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('不支持的导入格式');
    });
    
    it('返回400如果导入模式无效', async () => {
      const response = await request(app)
        .post('/api/imports/customers?format=csv&mode=invalid')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('不支持的导入模式');
    });
    
    it('创建导入任务并返回任务ID', async () => {
      const response = await request(app)
        .post('/api/imports/customers?format=csv&mode=create')
        .expect(200);
      
      expect(db.insert).toHaveBeenCalled();
      expect(mq.publish).toHaveBeenCalled();
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('import_id', 'test-uuid-1234');
      expect(response.body).toHaveProperty('status', 'processing');
      expect(response.body.meta).toHaveProperty('mode', 'create');
    });
  });
  
  describe('importTags', () => {
    it('创建标签导入任务', async () => {
      const response = await request(app)
        .post('/api/imports/tags?format=csv')
        .expect(200);
      
      expect(db.insert).toHaveBeenCalled();
      expect(mq.publish).toHaveBeenCalled();
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('import_id', 'test-uuid-1234');
    });
  });
  
  describe('getImportStatus', () => {
    it('返回404如果任务不存在', async () => {
      db.query.mockResolvedValueOnce({ data: [], error: null });
      
      const response = await request(app)
        .get('/api/imports/status/non-existent-id')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('找不到导入任务');
    });
    
    it('返回导入任务状态', async () => {
      const response = await request(app)
        .get('/api/imports/status/test-uuid-1234')
        .expect(200);
      
      expect(db.query).toHaveBeenCalled();
      expect(response.body).toHaveProperty('import_id', 'test-uuid-1234');
      expect(response.body).toHaveProperty('status', 'processing');
    });
  });
  
  describe('getRecentImports', () => {
    it('返回最近的导入任务列表', async () => {
      db.query.mockResolvedValueOnce({ 
        data: [
          { 
            id: 'import-1', 
            type: 'customers', 
            status: 'completed',
            created_at: '2023-01-01T00:00:00Z',
            success_count: 95,
            error_count: 5
          },
          { 
            id: 'import-2', 
            type: 'tags', 
            status: 'processing',
            created_at: '2023-01-02T00:00:00Z',
            success_count: 0,
            error_count: 0
          }
        ], 
        error: null 
      });
      
      const response = await request(app)
        .get('/api/imports/recent?limit=2')
        .expect(200);
      
      expect(db.query).toHaveBeenCalled();
      expect(response.body).toHaveProperty('imports');
      expect(response.body.imports).toHaveLength(2);
    });
  });
  
  describe('cancelImport', () => {
    it('返回404如果任务不存在', async () => {
      db.query.mockResolvedValueOnce({ data: [], error: null });
      
      const response = await request(app)
        .post('/api/imports/cancel/non-existent-id')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('找不到导入任务');
    });
    
    it('返回400如果任务不在处理中', async () => {
      db.query.mockResolvedValueOnce({ 
        data: [{ 
          id: 'test-uuid-1234', 
          status: 'completed' 
        }], 
        error: null 
      });
      
      const response = await request(app)
        .post('/api/imports/cancel/test-uuid-1234')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('只能取消进行中的导入任务');
    });
    
    it('发送取消请求', async () => {
      db.query.mockResolvedValueOnce({ 
        data: [{ 
          id: 'test-uuid-1234', 
          status: 'processing' 
        }], 
        error: null 
      });
      
      const response = await request(app)
        .post('/api/imports/cancel/test-uuid-1234')
        .expect(200);
      
      expect(mq.publish).toHaveBeenCalledWith(
        'import.cancel.requested',
        expect.objectContaining({
          import_id: 'test-uuid-1234'
        })
      );
      
      expect(db.update).toHaveBeenCalled();
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'cancelling');
    });
  });
}); 