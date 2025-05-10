const { DatabaseService } = require('../services/databaseService');
const { CacheService } = require('../services/cacheService');
const { MessageQueueService } = require('../services/messageQueueService');
const config = require('../config');

const db = new DatabaseService();
const cache = new CacheService();
const mq = new MessageQueueService();

/**
 * 客户控制器 - 管理客户信息
 */
class CustomerController {
  /**
   * 获取所有客户
   */
  async getAllCustomers(req, res, next) {
    try {
      const { 
        limit = config.DEFAULT_PAGE_SIZE, 
        offset = 0, 
        sort = 'created_at', 
        order = 'desc',
        q = '',
        tag_id
      } = req.query;
      
      // 构建缓存键
      const cacheKey = `customers:all:${req.user.id}:${limit}:${offset}:${sort}:${order}:${q}:${tag_id || ''}`;
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // 查询条件
      let query = { user_id: req.user.id };
      let options = { 
        limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
        offset: parseInt(offset),
        orderBy: sort,
        order
      };
      
      let data, error, count;
      
      // 基本搜索
      if (q) {
        // 使用全文搜索或模糊匹配
        const { data: searchData, error: searchError, count: searchCount } = await db.rawQuery(
          `
          SELECT * FROM customers
          WHERE user_id = $1 
          AND (
            name ILIKE $2 OR
            email ILIKE $2 OR
            phone ILIKE $2 OR
            company ILIKE $2 OR
            notes ILIKE $2
          )
          ORDER BY ${sort} ${order}
          LIMIT $3 OFFSET $4
          `,
          [req.user.id, `%${q}%`, options.limit, options.offset]
        );
        
        data = searchData;
        error = searchError;
        count = searchCount;
      } 
      // 标签过滤
      else if (tag_id) {
        // 使用连接查询获取带有特定标签的客户
        const { data: tagData, error: tagError, count: tagCount } = await db.rawQuery(
          `
          SELECT c.* FROM customers c
          JOIN customer_tags ct ON c.id = ct.customer_id
          WHERE c.user_id = $1 AND ct.tag_id = $2
          ORDER BY c.${sort} ${order === 'asc' ? 'ASC' : 'DESC'}
          LIMIT $3 OFFSET $4
          `,
          [req.user.id, tag_id, options.limit, options.offset]
        );
        
        data = tagData;
        error = tagError;
        count = tagCount;
      }
      // 常规查询
      else {
        const result = await db.queryPaginated('customers', query, options);
        data = result.data;
        error = result.error;
        count = result.count;
      }
      
      if (error) throw error;
      
      // 增强客户数据
      const enhancedData = await this.enhanceCustomersData(data, req.user.id);
      
      const response = { 
        customers: enhancedData,
        pagination: {
          total: count,
          limit: options.limit,
          offset: options.offset
        }
      };
      
      // 缓存结果
      await cache.set(cacheKey, response, config.CUSTOMER_CACHE_TTL);
      
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取单个客户信息
   */
  async getCustomer(req, res, next) {
    try {
      const { id } = req.params;
      
      // 检查缓存
      const cacheKey = `customer:${id}`;
      const cachedCustomer = await cache.get(cacheKey);
      
      if (cachedCustomer) {
        return res.json({ customer: cachedCustomer });
      }
      
      // 从数据库获取客户
      const { data, error } = await db.query('customers', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      if (data.length === 0) {
        return res.status(404).json({ 
          error: '客户不存在或您无权查看' 
        });
      }
      
      // 增强客户数据
      const enhancedCustomer = await this.enhanceSingleCustomer(data[0], req.user.id);
      
      // 缓存结果
      await cache.set(cacheKey, enhancedCustomer, config.CUSTOMER_CACHE_TTL);
      
      res.json({ customer: enhancedCustomer });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 创建新客户
   */
  async createCustomer(req, res, next) {
    try {
      const { 
        name, 
        email, 
        phone, 
        company, 
        address,
        notes,
        custom_fields,
        tags 
      } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: '客户名称是必须的' });
      }
      
      // 检查是否存在相同的邮箱或电话
      if (email || phone) {
        const { data: existingData, error: existingError } = await db.rawQuery(
          `
          SELECT * FROM customers 
          WHERE user_id = $1 AND (email = $2 OR phone = $3)
          `,
          [req.user.id, email || '', phone || '']
        );
        
        if (existingError) throw existingError;
        
        if (existingData && existingData.length > 0) {
          return res.status(400).json({ 
            error: '已存在使用相同邮箱或电话的客户',
            existing: existingData.map(c => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone
            }))
          });
        }
      }
      
      // 创建客户
      const { data, error } = await db.insert('customers', {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
        custom_fields: custom_fields || {},
        user_id: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      const newCustomer = data[0];
      
      // 如果有标签，添加标签关联
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagInserts = tags.map(tagId => ({
          customer_id: newCustomer.id,
          tag_id: tagId,
          user_id: req.user.id,
          created_at: new Date().toISOString()
        }));
        
        await db.insertMany('customer_tags', tagInserts);
      }
      
      // 清除相关缓存
      await cache.deletePattern(`customers:all:${req.user.id}:*`);
      
      // 发布客户创建事件
      await mq.publish('customer.created', {
        customer: newCustomer,
        user_id: req.user.id
      });
      
      // 增强客户数据
      const enhancedCustomer = await this.enhanceSingleCustomer(newCustomer, req.user.id);
      
      res.status(201).json({ customer: enhancedCustomer });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 更新客户信息
   */
  async updateCustomer(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        name, 
        email, 
        phone, 
        company, 
        address,
        notes,
        custom_fields,
        tags 
      } = req.body;
      
      // 验证客户是否存在
      const { data: customerData, error: customerError } = await db.query('customers', {
        id,
        user_id: req.user.id
      });
      
      if (customerError) throw customerError;
      
      if (customerData.length === 0) {
        return res.status(404).json({ error: '客户不存在或您无权修改' });
      }
      
      const oldCustomer = customerData[0];
      
      // 检查邮箱或电话是否与其他客户冲突
      if (email || phone) {
        const { data: existingData, error: existingError } = await db.rawQuery(
          `
          SELECT * FROM customers 
          WHERE user_id = $1 AND id != $2 AND (email = $3 OR phone = $4)
          `,
          [req.user.id, id, email || '', phone || '']
        );
        
        if (existingError) throw existingError;
        
        if (existingData && existingData.length > 0) {
          return res.status(400).json({ 
            error: '已存在使用相同邮箱或电话的客户',
            existing: existingData.map(c => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone
            }))
          });
        }
      }
      
      // 更新客户
      const { data, error } = await db.update('customers', 
        { id, user_id: req.user.id },
        { 
          name: name !== undefined ? name : oldCustomer.name,
          email: email !== undefined ? email : oldCustomer.email,
          phone: phone !== undefined ? phone : oldCustomer.phone,
          company: company !== undefined ? company : oldCustomer.company,
          address: address !== undefined ? address : oldCustomer.address,
          notes: notes !== undefined ? notes : oldCustomer.notes,
          custom_fields: custom_fields !== undefined ? 
            { ...oldCustomer.custom_fields, ...custom_fields } : 
            oldCustomer.custom_fields,
          updated_at: new Date().toISOString()
        }
      );
      
      if (error) throw error;
      
      const updatedCustomer = data[0];
      
      // 如果提供了标签，更新标签关联
      if (tags && Array.isArray(tags)) {
        // 删除现有标签关联
        await db.delete('customer_tags', { customer_id: id });
        
        // 添加新标签关联
        if (tags.length > 0) {
          const tagInserts = tags.map(tagId => ({
            customer_id: id,
            tag_id: tagId,
            user_id: req.user.id,
            created_at: new Date().toISOString()
          }));
          
          await db.insertMany('customer_tags', tagInserts);
        }
      }
      
      // 清除相关缓存
      await cache.delete(`customer:${id}`);
      await cache.deletePattern(`customers:all:${req.user.id}:*`);
      
      // 发布客户更新事件
      await mq.publish('customer.updated', {
        customer: updatedCustomer,
        previous: oldCustomer,
        user_id: req.user.id
      });
      
      // 增强客户数据
      const enhancedCustomer = await this.enhanceSingleCustomer(updatedCustomer, req.user.id);
      
      res.json({ customer: enhancedCustomer });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 删除客户
   */
  async deleteCustomer(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证客户是否存在
      const { data: customerData, error: customerError } = await db.query('customers', {
        id,
        user_id: req.user.id
      });
      
      if (customerError) throw customerError;
      
      if (customerData.length === 0) {
        return res.status(404).json({ error: '客户不存在或您无权删除' });
      }
      
      const oldCustomer = customerData[0];
      
      // 删除关联的标签和互动记录
      await db.delete('customer_tags', { customer_id: id });
      await db.delete('customer_interactions', { customer_id: id });
      
      // 删除客户
      const { data, error } = await db.delete('customers', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      // 清除相关缓存
      await cache.delete(`customer:${id}`);
      await cache.deletePattern(`customer:${id}:*`);
      await cache.deletePattern(`customers:all:${req.user.id}:*`);
      
      // 发布客户删除事件
      await mq.publish('customer.deleted', {
        customer: oldCustomer,
        user_id: req.user.id
      });
      
      res.json({ 
        success: true,
        message: '客户及其相关数据已删除'
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 按标签获取客户
   */
  async getCustomersByTag(req, res, next) {
    try {
      const { tagId } = req.params;
      const { limit = config.DEFAULT_PAGE_SIZE, offset = 0 } = req.query;
      
      // 验证标签是否存在
      const { data: tagData, error: tagError } = await db.query('tags', {
        id: tagId,
        user_id: req.user.id
      });
      
      if (tagError) throw tagError;
      
      if (tagData.length === 0) {
        return res.status(404).json({ error: '标签不存在或您无权访问' });
      }
      
      // 查询带有此标签的客户
      const { data, error, count } = await db.rawQuery(
        `
        SELECT c.* FROM customers c
        JOIN customer_tags ct ON c.id = ct.customer_id
        WHERE c.user_id = $1 AND ct.tag_id = $2
        ORDER BY c.created_at DESC
        LIMIT $3 OFFSET $4
        `,
        [req.user.id, tagId, parseInt(limit), parseInt(offset)]
      );
      
      if (error) throw error;
      
      // 增强客户数据
      const enhancedData = await this.enhanceCustomersData(data, req.user.id);
      
      res.json({ 
        customers: enhancedData,
        tag: tagData[0],
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 搜索客户
   */
  async searchCustomers(req, res, next) {
    try {
      const { q, limit = config.DEFAULT_PAGE_SIZE, offset = 0 } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: '搜索查询是必须的' });
      }
      
      // 执行搜索
      const { data, error, count } = await db.rawQuery(
        `
        SELECT * FROM customers
        WHERE user_id = $1 
        AND (
          name ILIKE $2 OR
          email ILIKE $2 OR
          phone ILIKE $2 OR
          company ILIKE $2 OR
          notes ILIKE $2
        )
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        `,
        [req.user.id, `%${q}%`, parseInt(limit), parseInt(offset)]
      );
      
      if (error) throw error;
      
      // 增强客户数据
      const enhancedData = await this.enhanceCustomersData(data, req.user.id);
      
      res.json({ 
        customers: enhancedData,
        query: q,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取客户统计信息
   */
  async getCustomerStats(req, res, next) {
    try {
      // 获取基本统计数据
      const { data: totalData, error: totalError } = await db.rawQuery(
        `SELECT COUNT(*) as total FROM customers WHERE user_id = $1`,
        [req.user.id]
      );
      
      if (totalError) throw totalError;
      
      // 获取最近30天新增客户数
      const { data: recentData, error: recentError } = await db.rawQuery(
        `
        SELECT COUNT(*) as recent FROM customers 
        WHERE user_id = $1 AND created_at > $2
        `,
        [req.user.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
      );
      
      if (recentError) throw recentError;
      
      // 获取最近互动客户数
      const { data: activeData, error: activeError } = await db.rawQuery(
        `
        SELECT COUNT(DISTINCT customer_id) as active FROM customer_interactions
        WHERE user_id = $1 AND created_at > $2
        `,
        [req.user.id, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()]
      );
      
      if (activeError) throw activeError;
      
      // 获取标签统计
      const { data: tagStatsData, error: tagStatsError } = await db.rawQuery(
        `
        SELECT t.id, t.name, t.color, COUNT(ct.customer_id) as count
        FROM tags t
        LEFT JOIN customer_tags ct ON t.id = ct.tag_id
        WHERE t.user_id = $1
        GROUP BY t.id, t.name, t.color
        ORDER BY count DESC
        LIMIT 10
        `,
        [req.user.id]
      );
      
      if (tagStatsError) throw tagStatsError;
      
      res.json({
        stats: {
          total: parseInt(totalData[0].total),
          recent: parseInt(recentData[0].recent),
          active: parseInt(activeData[0].active)
        },
        top_tags: tagStatsData,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 增强单个客户数据，添加标签和最近互动
   */
  async enhanceSingleCustomer(customer, userId) {
    try {
      // 获取客户标签
      const { data: tagsData } = await db.rawQuery(
        `
        SELECT t.* FROM tags t
        JOIN customer_tags ct ON t.id = ct.tag_id
        WHERE ct.customer_id = $1 AND t.user_id = $2
        `,
        [customer.id, userId]
      );
      
      // 获取最近的互动记录
      const { data: interactionsData } = await db.query(
        'customer_interactions',
        { customer_id: customer.id, user_id: userId },
        { limit: 5, orderBy: 'created_at', order: 'desc' }
      );
      
      return {
        ...customer,
        tags: tagsData || [],
        recent_interactions: interactionsData || []
      };
    } catch (error) {
      console.error('增强客户数据错误:', error);
      return customer;
    }
  }
  
  /**
   * 批量增强客户数据
   */
  async enhanceCustomersData(customers, userId) {
    if (!customers || customers.length === 0) {
      return [];
    }
    
    try {
      // 获取所有客户ID
      const customerIds = customers.map(c => c.id);
      
      // 批量获取标签信息
      const { data: tagsData } = await db.rawQuery(
        `
        SELECT ct.customer_id, t.* FROM tags t
        JOIN customer_tags ct ON t.id = ct.tag_id
        WHERE ct.customer_id = ANY($1) AND t.user_id = $2
        `,
        [customerIds, userId]
      );
      
      // 整理标签信息，按客户ID分组
      const tagsByCustomer = {};
      if (tagsData) {
        tagsData.forEach(tag => {
          const customerId = tag.customer_id;
          if (!tagsByCustomer[customerId]) {
            tagsByCustomer[customerId] = [];
          }
          delete tag.customer_id;
          tagsByCustomer[customerId].push(tag);
        });
      }
      
      // 返回增强后的客户数据
      return customers.map(customer => ({
        ...customer,
        tags: tagsByCustomer[customer.id] || []
      }));
    } catch (error) {
      console.error('批量增强客户数据错误:', error);
      return customers;
    }
  }
}

module.exports = { CustomerController }; 