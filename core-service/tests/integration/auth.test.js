/**
 * 认证集成测试
 */
const request = require('supertest');
const app = require('../../src/index');
const dbService = require('../../src/services/dbService');

// 测试用户数据
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: '测试用户'
};

// 全局变量，存储测试过程中生成的数据
let userId;
let authToken;

// 测试前清理数据
beforeAll(async () => {
  try {
    // 清理可能存在的测试用户
    const { data } = await dbService.query('users', {
      filters: [{ field: 'email', eq: true, value: testUser.email }]
    });

    if (data && data.length > 0) {
      // 删除关联的个人资料
      await dbService.supabase
        .from('profiles')
        .delete()
        .eq('user_id', data[0].id);
      
      // 删除用户
      await dbService.remove('users', data[0].id);
    }
  } catch (error) {
    console.error('清理测试数据时出错:', error);
  }
});

// 测试后清理数据
afterAll(async () => {
  try {
    // 删除测试用户
    if (userId) {
      // 删除关联的个人资料
      await dbService.supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      
      // 删除用户
      await dbService.remove('users', userId);
    }
  } catch (error) {
    console.error('清理测试数据时出错:', error);
  }
});

describe('认证API', () => {
  // 测试用户注册
  describe('POST /auth/register', () => {
    it('应成功注册新用户', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', testUser.email.toLowerCase());
      expect(res.body.user).toHaveProperty('name', testUser.name);
      expect(res.body.user).not.toHaveProperty('password');
      
      // 保存用户ID以供后续测试使用
      userId = res.body.user.id;
    });

    it('使用重复邮箱应返回错误', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('验证不正确的数据应返回错误', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // 太短
          name: ''         // 空名称
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('errors');
    });
  });

  // 测试用户登录
  describe('POST /auth/login', () => {
    it('应成功登录用户', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', testUser.email.toLowerCase());
      
      // 保存令牌以供后续测试使用
      authToken = res.body.token;
    });

    it('使用错误的密码应返回错误', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('使用不存在的邮箱应返回错误', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // 测试令牌验证
  describe('GET /auth/verify', () => {
    it('应成功验证有效的令牌', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', authToken);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', userId);
    });

    it('无令牌应返回错误', async () => {
      const res = await request(app)
        .get('/auth/verify');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('无效的令牌应返回错误', async () => {
      const res = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
}); 