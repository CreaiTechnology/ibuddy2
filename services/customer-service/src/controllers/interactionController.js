const { DatabaseService } = require('../services/databaseService');
const { CacheService } = require('../services/cacheService');
const { MessageQueueService } = require('../services/messageQueueService');
const config = require('../config');

const db = new DatabaseService();
const cache = new CacheService();
const mq = new MessageQueueService();

/**
 * 互动控制器 - 管理客户互动记录
 */
class InteractionController {
  /**
   * 获取客户的互动记录
   */
  async getCustomerInteractions(req, res, next) {
    try {
      const { customerId } = req.params;
      const { 
        limit = config.DEFAULT_PAGE_SIZE, 
        offset = 0, 
        type,
        sort = 'created_at',
        order = 'desc'
      } = req.query;
      
      // 验证客户是否存在
      const { data: customerData, error: customerError } = await db.query('customers', {
        id: customerId,
        user_id: req.user.id
      });
      
      if (customerError) throw customerError;
      
      if (customerData.length === 0) {
        return res.status(404).json({ error: '客户不存在或您无权查看' });
      }
      
      // 构建缓存键
      const cacheKey = `customer:${customerId}:interactions:${limit}:${offset}:${type || 'all'}:${sort}:${order}`;
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // 构建查询条件
      let query = { 
        customer_id: customerId,
        user_id: req.user.id
      };
      
      if (type) {
        query.type = type;
      }
      
      // 查询互动记录
      const { data, error, count } = await db.queryPaginated(
        'customer_interactions',
        query,
        {
          limit: Math.min(parseInt(limit), config.MAX_PAGE_SIZE),
          offset: parseInt(offset),
          orderBy: sort,
          order
        }
      );
      
      if (error) throw error;
      
      // 增强互动数据
      const enhancedData = await this.enhanceInteractions(data);
      
      const response = {
        interactions: enhancedData,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        customer: {
          id: customerData[0].id,
          name: customerData[0].name
        }
      };
      
      // 缓存结果
      await cache.set(cacheKey, response, 300); // 5分钟缓存
      
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取单个互动记录
   */
  async getInteraction(req, res, next) {
    try {
      const { id } = req.params;
      
      // 检查缓存
      const cacheKey = `interaction:${id}`;
      const cachedInteraction = await cache.get(cacheKey);
      
      if (cachedInteraction) {
        return res.json({ interaction: cachedInteraction });
      }
      
      // 从数据库获取互动记录
      const { data, error } = await db.query('customer_interactions', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      if (data.length === 0) {
        return res.status(404).json({ 
          error: '互动记录不存在或您无权查看' 
        });
      }
      
      // 增强互动数据
      const enhancedInteraction = await this.enhanceSingleInteraction(data[0]);
      
      // 缓存结果
      await cache.set(cacheKey, enhancedInteraction, 300); // 5分钟缓存
      
      res.json({ interaction: enhancedInteraction });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 创建新互动记录
   */
  async createInteraction(req, res, next) {
    try {
      const { 
        customer_id, 
        type, 
        title, 
        content, 
        metadata 
      } = req.body;
      
      if (!customer_id) {
        return res.status(400).json({ error: '客户ID是必须的' });
      }
      
      if (!type) {
        return res.status(400).json({ error: '互动类型是必须的' });
      }
      
      if (!content) {
        return res.status(400).json({ error: '互动内容是必须的' });
      }
      
      // 验证客户是否存在
      const { data: customerData, error: customerError } = await db.query('customers', {
        id: customer_id,
        user_id: req.user.id
      });
      
      if (customerError) throw customerError;
      
      if (customerData.length === 0) {
        return res.status(404).json({ error: '客户不存在或您无权操作' });
      }
      
      // 创建互动记录
      const { data, error } = await db.insert('customer_interactions', {
        customer_id,
        type,
        title: title || '未命名互动',
        content,
        metadata: metadata || {},
        user_id: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      const newInteraction = data[0];
      
      // 清除相关缓存
      await cache.delete(`customer:${customer_id}`);
      await cache.deletePattern(`customer:${customer_id}:interactions:*`);
      
      // 发布互动创建事件
      await mq.publish('interaction.created', {
        interaction: newInteraction,
        customer: customerData[0],
        user_id: req.user.id
      });
      
      // 更新客户的最后互动时间
      await db.update('customers', 
        { id: customer_id },
        { 
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );
      
      res.status(201).json({ 
        interaction: newInteraction,
        customer: {
          id: customerData[0].id,
          name: customerData[0].name
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 更新互动记录
   */
  async updateInteraction(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        title, 
        content, 
        metadata 
      } = req.body;
      
      // 验证互动记录是否存在
      const { data: interactionData, error: interactionError } = await db.query('customer_interactions', {
        id,
        user_id: req.user.id
      });
      
      if (interactionError) throw interactionError;
      
      if (interactionData.length === 0) {
        return res.status(404).json({ error: '互动记录不存在或您无权修改' });
      }
      
      const oldInteraction = interactionData[0];
      
      // 更新互动记录
      const { data, error } = await db.update('customer_interactions', 
        { id, user_id: req.user.id },
        { 
          title: title !== undefined ? title : oldInteraction.title,
          content: content !== undefined ? content : oldInteraction.content,
          metadata: metadata !== undefined ? 
            { ...oldInteraction.metadata, ...metadata } : 
            oldInteraction.metadata,
          updated_at: new Date().toISOString()
        }
      );
      
      if (error) throw error;
      
      const updatedInteraction = data[0];
      
      // 清除相关缓存
      await cache.delete(`interaction:${id}`);
      await cache.deletePattern(`customer:${oldInteraction.customer_id}:interactions:*`);
      
      // 发布互动更新事件
      await mq.publish('interaction.updated', {
        interaction: updatedInteraction,
        previous: oldInteraction,
        user_id: req.user.id
      });
      
      res.json({ interaction: updatedInteraction });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 删除互动记录
   */
  async deleteInteraction(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证互动记录是否存在
      const { data: interactionData, error: interactionError } = await db.query('customer_interactions', {
        id,
        user_id: req.user.id
      });
      
      if (interactionError) throw interactionError;
      
      if (interactionData.length === 0) {
        return res.status(404).json({ error: '互动记录不存在或您无权删除' });
      }
      
      const oldInteraction = interactionData[0];
      
      // 删除互动记录
      const { data, error } = await db.delete('customer_interactions', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      // 清除相关缓存
      await cache.delete(`interaction:${id}`);
      await cache.deletePattern(`customer:${oldInteraction.customer_id}:interactions:*`);
      
      // 发布互动删除事件
      await mq.publish('interaction.deleted', {
        interaction: oldInteraction,
        user_id: req.user.id
      });
      
      res.json({ 
        success: true,
        message: '互动记录已删除'
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取最近的互动记录
   */
  async getRecentInteractions(req, res, next) {
    try {
      const { 
        limit = 10, 
        type 
      } = req.query;
      
      // 构建缓存键
      const cacheKey = `user:${req.user.id}:interactions:recent:${limit}:${type || 'all'}`;
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // 构建查询
      let queryStr = `
        SELECT i.*, c.name as customer_name
        FROM customer_interactions i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.user_id = $1
      `;
      
      const queryParams = [req.user.id];
      
      if (type) {
        queryStr += ` AND i.type = $2`;
        queryParams.push(type);
      }
      
      queryStr += `
        ORDER BY i.created_at DESC
        LIMIT $${queryParams.length + 1}
      `;
      
      queryParams.push(Math.min(parseInt(limit), 50));
      
      // 执行查询
      const { data, error } = await db.rawQuery(queryStr, queryParams);
      
      if (error) throw error;
      
      const response = { interactions: data || [] };
      
      // 缓存结果
      await cache.set(cacheKey, response, 300); // 5分钟缓存
      
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 批量创建互动记录
   */
  async bulkCreateInteractions(req, res, next) {
    try {
      const { interactions } = req.body;
      
      if (!Array.isArray(interactions) || interactions.length === 0) {
        return res.status(400).json({ error: '互动记录数组是必须的' });
      }
      
      if (interactions.length > 100) {
        return res.status(400).json({ error: '每次最多可批量创建100条互动记录' });
      }
      
      // 验证所有客户ID
      const customerIds = [...new Set(interactions.map(i => i.customer_id))];
      
      const { data: customerData, error: customerError } = await db.rawQuery(
        `
        SELECT id FROM customers
        WHERE id = ANY($1) AND user_id = $2
        `,
        [customerIds, req.user.id]
      );
      
      if (customerError) throw customerError;
      
      const validCustomerIds = new Set(customerData.map(c => c.id));
      
      // 过滤并准备有效的互动记录
      const now = new Date().toISOString();
      const validInteractions = interactions
        .filter(i => validCustomerIds.has(i.customer_id))
        .map(i => ({
          customer_id: i.customer_id,
          type: i.type || 'note',
          title: i.title || '未命名互动',
          content: i.content || '',
          metadata: i.metadata || {},
          user_id: req.user.id,
          created_at: i.created_at || now,
          updated_at: now
        }));
      
      if (validInteractions.length === 0) {
        return res.status(400).json({ error: '没有有效的互动记录可以创建' });
      }
      
      // 批量插入互动记录
      const { data, error } = await db.insertMany('customer_interactions', validInteractions);
      
      if (error) throw error;
      
      // 清除相关缓存
      for (const customerId of validCustomerIds) {
        await cache.delete(`customer:${customerId}`);
        await cache.deletePattern(`customer:${customerId}:interactions:*`);
      }
      
      // 更新最后互动时间
      for (const customerId of validCustomerIds) {
        await db.update('customers', 
          { id: customerId },
          { 
            last_interaction_at: now,
            updated_at: now
          }
        );
      }
      
      // 发布批量互动创建事件
      await mq.publish('interaction.bulk_created', {
        count: validInteractions.length,
        user_id: req.user.id
      });
      
      res.status(201).json({ 
        success: true,
        count: validInteractions.length,
        message: `已创建${validInteractions.length}条互动记录`
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 增强单个互动记录数据
   * @private
   */
  async enhanceSingleInteraction(interaction) {
    try {
      // 获取客户信息
      const { data: customerData } = await db.query('customers', {
        id: interaction.customer_id
      }, { limit: 1 });
      
      return {
        ...interaction,
        customer: customerData && customerData.length > 0 ? {
          id: customerData[0].id,
          name: customerData[0].name,
          email: customerData[0].email
        } : null
      };
    } catch (error) {
      console.error('增强互动记录数据错误:', error);
      return interaction;
    }
  }
  
  /**
   * 批量增强互动记录数据
   * @private
   */
  async enhanceInteractions(interactions) {
    if (!interactions || interactions.length === 0) {
      return [];
    }
    
    try {
      // 获取所有客户ID
      const customerIds = [...new Set(interactions.map(i => i.customer_id))];
      
      // 批量获取客户信息
      const { data: customerData } = await db.rawQuery(
        `
        SELECT id, name, email FROM customers
        WHERE id = ANY($1)
        `,
        [customerIds]
      );
      
      // 创建客户信息映射
      const customerMap = {};
      if (customerData) {
        customerData.forEach(customer => {
          customerMap[customer.id] = {
            id: customer.id,
            name: customer.name,
            email: customer.email
          };
        });
      }
      
      // 返回增强后的互动记录
      return interactions.map(interaction => ({
        ...interaction,
        customer: customerMap[interaction.customer_id] || null
      }));
    } catch (error) {
      console.error('批量增强互动记录数据错误:', error);
      return interactions;
    }
  }
}

module.exports = { InteractionController }; 