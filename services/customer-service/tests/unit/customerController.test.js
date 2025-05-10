const { CustomerController } = require('../../src/controllers/customerController');

// 模拟依赖
jest.mock('../../src/services/databaseService');
jest.mock('../../src/services/cacheService');
jest.mock('../../src/services/messageQueueService');
jest.mock('../../src/config');

const { DatabaseService } = require('../../src/services/databaseService');
const { CacheService } = require('../../src/services/cacheService');
const { MessageQueueService } = require('../../src/services/messageQueueService');

describe('CustomerController', () => {
  let customerController;
  let mockDb;
  let mockCache;
  let mockMq;
  let mockRequest;
  let mockResponse;
  let mockNext;
  
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建模拟服务实例
    mockDb = {
      query: jest.fn(),
      queryPaginated: jest.fn(),
      rawQuery: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn()
    };
    
    mockMq = {
      publish: jest.fn().mockResolvedValue(true)
    };
    
    // 注入模拟实例
    DatabaseService.mockImplementation(() => mockDb);
    CacheService.mockImplementation(() => mockCache);
    MessageQueueService.mockImplementation(() => mockMq);
    
    // 创建控制器实例
    customerController = new CustomerController();
    
    // 创建模拟请求和响应对象
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { id: 'test-user-id' }
    };
    
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });
  
  describe('getAllCustomers', () => {
    it('应该从缓存获取客户列表', async () => {
      // 设置缓存命中
      const mockCachedData = { customers: [{ id: 'cust1' }] };
      mockCache.get.mockResolvedValue(mockCachedData);
      
      // 执行测试
      await customerController.getAllCustomers(mockRequest, mockResponse, mockNext);
      
      // 验证缓存获取调用
      expect(mockCache.get).toHaveBeenCalled();
      
      // 验证返回数据
      expect(mockResponse.json).toHaveBeenCalledWith(mockCachedData);
      
      // 验证数据库未被查询
      expect(mockDb.queryPaginated).not.toHaveBeenCalled();
    });
    
    it('应该从数据库获取客户列表并缓存', async () => {
      // 设置缓存未命中
      mockCache.get.mockResolvedValue(null);
      
      // 设置数据库查询结果
      const mockCustomers = [{ id: 'cust1', name: '测试客户' }];
      mockDb.queryPaginated.mockResolvedValue({
        data: mockCustomers,
        error: null,
        count: 1
      });
      
      // 设置增强方法模拟
      const enhanceSpy = jest.spyOn(customerController, 'enhanceCustomersData')
        .mockResolvedValue(mockCustomers);
      
      // 执行测试
      await customerController.getAllCustomers(mockRequest, mockResponse, mockNext);
      
      // 验证数据库查询调用
      expect(mockDb.queryPaginated).toHaveBeenCalled();
      
      // 验证缓存设置调用
      expect(mockCache.set).toHaveBeenCalled();
      
      // 验证返回数据
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        customers: mockCustomers,
        pagination: expect.any(Object)
      }));
      
      // 清理
      enhanceSpy.mockRestore();
    });
    
    it('应该处理查询错误', async () => {
      // 设置缓存未命中
      mockCache.get.mockResolvedValue(null);
      
      // 设置数据库查询错误
      const mockError = new Error('数据库查询错误');
      mockDb.queryPaginated.mockResolvedValue({
        data: null,
        error: mockError,
        count: 0
      });
      
      // 执行测试
      await customerController.getAllCustomers(mockRequest, mockResponse, mockNext);
      
      // 验证错误处理
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
  
  describe('getCustomer', () => {
    it('应该从缓存获取单个客户', async () => {
      // 设置请求参数
      mockRequest.params.id = 'test-customer-id';
      
      // 设置缓存命中
      const mockCachedCustomer = { id: 'test-customer-id', name: '测试客户' };
      mockCache.get.mockResolvedValue(mockCachedCustomer);
      
      // 执行测试
      await customerController.getCustomer(mockRequest, mockResponse, mockNext);
      
      // 验证缓存获取调用
      expect(mockCache.get).toHaveBeenCalledWith(`customer:${mockRequest.params.id}`);
      
      // 验证返回数据
      expect(mockResponse.json).toHaveBeenCalledWith({ customer: mockCachedCustomer });
      
      // 验证数据库未被查询
      expect(mockDb.query).not.toHaveBeenCalled();
    });
    
    it('应该返回404当客户不存在', async () => {
      // 设置请求参数
      mockRequest.params.id = 'non-existent-id';
      
      // 设置缓存未命中
      mockCache.get.mockResolvedValue(null);
      
      // 设置数据库查询结果为空
      mockDb.query.mockResolvedValue({
        data: [],
        error: null
      });
      
      // 执行测试
      await customerController.getCustomer(mockRequest, mockResponse, mockNext);
      
      // 验证状态码
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      
      // 验证返回错误
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });
  
  describe('createCustomer', () => {
    it('应该成功创建新客户', async () => {
      // 设置请求体
      mockRequest.body = {
        name: '新客户',
        email: 'test@example.com',
        phone: '13800138000'
      };
      
      // 设置数据库查询结果（确认不存在重复）
      mockDb.rawQuery.mockResolvedValue({
        data: [],
        error: null
      });
      
      // 设置数据库插入结果
      const newCustomer = { 
        id: 'new-customer-id', 
        ...mockRequest.body, 
        user_id: mockRequest.user.id 
      };
      mockDb.insert.mockResolvedValue({
        data: [newCustomer],
        error: null
      });
      
      // 设置增强方法模拟
      const enhanceSpy = jest.spyOn(customerController, 'enhanceSingleCustomer')
        .mockResolvedValue(newCustomer);
      
      // 执行测试
      await customerController.createCustomer(mockRequest, mockResponse, mockNext);
      
      // 验证数据库插入调用
      expect(mockDb.insert).toHaveBeenCalled();
      
      // 验证缓存清理
      expect(mockCache.deletePattern).toHaveBeenCalled();
      
      // 验证消息发布
      expect(mockMq.publish).toHaveBeenCalledWith('customer.created', expect.any(Object));
      
      // 验证返回状态码和数据
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ customer: newCustomer });
      
      // 清理
      enhanceSpy.mockRestore();
    });
    
    it('应该验证必填字段', async () => {
      // 设置请求体缺少必填字段
      mockRequest.body = {
        email: 'test@example.com',
        phone: '13800138000'
      };
      
      // 执行测试
      await customerController.createCustomer(mockRequest, mockResponse, mockNext);
      
      // 验证状态码
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      
      // 验证返回错误
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('客户名称是必须的')
      }));
      
      // 验证数据库未被插入
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
  
  // 其他测试用例可以根据需要添加...
}); 