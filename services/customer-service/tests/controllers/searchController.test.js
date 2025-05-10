const request = require('supertest');
const app = require('../../src/app');
const { DatabaseService } = require('../../src/services/databaseService');
const { CacheService } = require('../../src/services/cacheService');

// 模拟数据库和缓存服务
jest.mock('../../src/services/databaseService');
jest.mock('../../src/services/cacheService');

// 模拟认证中间件
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  },
  checkSubscription: () => (req, res, next) => next()
}));

describe('SearchController', () => {
  let db;
  let cache;
  
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    db = DatabaseService.mock.instances[0];
    cache = CacheService.mock.instances[0];
    
    // 模拟缓存方法
    cache.get = jest.fn().mockResolvedValue(null);
    cache.set = jest.fn().mockResolvedValue(true);
  });
  
  describe('globalSearch', () => {
    it('返回400如果搜索词太短', async () => {
      const response = await request(app)
        .get('/api/search/global?q=a')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('至少需要2个字符');
    });
    
    it('从缓存返回数据（如果存在）', async () => {
      const cachedData = {
        customers: { results: [], total: 0 },
        tags: { results: [], total: 0 },
        interactions: { results: [], total: 0 },
        meta: { query: 'test', type: 'all' }
      };
      
      cache.get.mockResolvedValueOnce(cachedData);
      
      const response = await request(app)
        .get('/api/search/global?q=test')
        .expect(200);
      
      expect(cache.get).toHaveBeenCalled();
      expect(response.body).toEqual(cachedData);
    });
    
    it('搜索客户并缓存结果', async () => {
      const mockCustomers = {
        data: [
          { id: 1, name: 'Test Customer', email: 'test@example.com' }
        ]
      };
      
      db.rawQuery = jest.fn().mockImplementation((query) => {
        if (query.includes('COUNT')) {
          return { data: [{ count: 1 }], error: null };
        }
        return { data: mockCustomers.data, error: null };
      });
      
      const response = await request(app)
        .get('/api/search/global?q=test&type=customer')
        .expect(200);
      
      expect(db.rawQuery).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(response.body).toHaveProperty('customers');
      expect(response.body.customers.results).toHaveLength(1);
    });
  });
  
  describe('advancedCustomerSearch', () => {
    it('返回400如果没有搜索条件', async () => {
      const response = await request(app)
        .get('/api/search/customers/advanced')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('至少需要提供一个搜索条件');
    });
    
    it('使用条件搜索客户', async () => {
      const mockCustomers = {
        data: [
          { id: 1, name: 'Test Customer', email: 'test@example.com' }
        ]
      };
      
      db.rawQuery = jest.fn().mockImplementation((query) => {
        if (query.includes('COUNT')) {
          return { data: [{ count: 1 }], error: null };
        }
        return { data: mockCustomers.data, error: null };
      });
      
      const response = await request(app)
        .get('/api/search/customers/advanced?name=test')
        .expect(200);
      
      expect(db.rawQuery).toHaveBeenCalled();
      expect(response.body).toHaveProperty('customers');
      expect(response.body.customers).toHaveLength(1);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
    });
  });
  
  describe('advancedInteractionSearch', () => {
    it('返回400如果没有搜索条件', async () => {
      const response = await request(app)
        .get('/api/search/interactions/advanced')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('至少需要提供一个搜索条件');
    });
    
    it('使用条件搜索互动记录', async () => {
      const mockInteractions = {
        data: [
          { 
            id: 1, 
            customer_id: 1, 
            title: 'Test Interaction',
            customer_name: 'Test Customer',
            customer_email: 'test@example.com'
          }
        ]
      };
      
      db.rawQuery = jest.fn().mockImplementation((query) => {
        if (query.includes('COUNT')) {
          return { data: [{ count: 1 }], error: null };
        }
        return { data: mockInteractions.data, error: null };
      });
      
      const response = await request(app)
        .get('/api/search/interactions/advanced?title=test')
        .expect(200);
      
      expect(db.rawQuery).toHaveBeenCalled();
      expect(response.body).toHaveProperty('interactions');
      expect(response.body.interactions).toHaveLength(1);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
    });
  });
}); 