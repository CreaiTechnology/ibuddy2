const { DatabaseService } = require('../services/databaseService');
const { CacheService } = require('../services/cacheService');
const { MessageQueueService } = require('../services/messageQueueService');
const config = require('../config');

const db = new DatabaseService();
const cache = new CacheService();
const mq = new MessageQueueService();

/**
 * 标签控制器 - 管理客户标签
 */
class TagController {
  /**
   * 获取所有标签
   */
  async getAllTags(req, res, next) {
    try {
      // 构建缓存键
      const cacheKey = `tags:all:${req.user.id}`;
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // 从数据库获取标签
      const { data, error } = await db.query('tags', 
        { user_id: req.user.id },
        { orderBy: 'name', order: 'asc' }
      );
      
      if (error) throw error;
      
      // 增强标签数据
      const enhancedData = await this.enhanceTagsWithCount(data, req.user.id);
      
      const response = { tags: enhancedData };
      
      // 缓存结果
      await cache.set(cacheKey, response, 3600); // 1小时缓存
      
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取单个标签
   */
  async getTag(req, res, next) {
    try {
      const { id } = req.params;
      
      // 检查缓存
      const cacheKey = `tag:${id}`;
      const cachedTag = await cache.get(cacheKey);
      
      if (cachedTag) {
        return res.json({ tag: cachedTag });
      }
      
      // 从数据库获取标签
      const { data, error } = await db.query('tags', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      if (data.length === 0) {
        return res.status(404).json({ 
          error: '标签不存在或您无权查看' 
        });
      }
      
      // 增强标签数据
      const tag = data[0];
      const enhancedTag = await this.enhanceTagWithCount(tag, req.user.id);
      
      // 缓存结果
      await cache.set(cacheKey, enhancedTag, 3600); // 1小时缓存
      
      res.json({ tag: enhancedTag });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 创建新标签
   */
  async createTag(req, res, next) {
    try {
      const { name, color, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: '标签名称是必须的' });
      }
      
      // 检查是否存在同名标签
      const { data: existingData } = await db.query('tags', {
        name,
        user_id: req.user.id
      });
      
      if (existingData && existingData.length > 0) {
        return res.status(400).json({ 
          error: '已存在同名标签'
        });
      }
      
      // 创建标签
      const { data, error } = await db.insert('tags', {
        name,
        color: color || '#CCCCCC',
        description: description || '',
        user_id: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      const newTag = data[0];
      
      // 清除相关缓存
      await cache.delete(`tags:all:${req.user.id}`);
      
      // 发布标签创建事件
      await mq.publish('tag.created', {
        tag: newTag,
        user_id: req.user.id
      });
      
      res.status(201).json({ tag: newTag });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 更新标签
   */
  async updateTag(req, res, next) {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;
      
      // 验证标签是否存在
      const { data: tagData, error: tagError } = await db.query('tags', {
        id,
        user_id: req.user.id
      });
      
      if (tagError) throw tagError;
      
      if (tagData.length === 0) {
        return res.status(404).json({ error: '标签不存在或您无权修改' });
      }
      
      const oldTag = tagData[0];
      
      // 检查同名标签冲突
      if (name && name !== oldTag.name) {
        const { data: existingData } = await db.query('tags', {
          name,
          user_id: req.user.id
        });
        
        if (existingData && existingData.length > 0) {
          return res.status(400).json({ 
            error: '已存在同名标签'
          });
        }
      }
      
      // 更新标签
      const { data, error } = await db.update('tags', 
        { id, user_id: req.user.id },
        { 
          name: name !== undefined ? name : oldTag.name,
          color: color !== undefined ? color : oldTag.color,
          description: description !== undefined ? description : oldTag.description,
          updated_at: new Date().toISOString()
        }
      );
      
      if (error) throw error;
      
      const updatedTag = data[0];
      
      // 清除相关缓存
      await cache.delete(`tag:${id}`);
      await cache.delete(`tags:all:${req.user.id}`);
      
      // 发布标签更新事件
      await mq.publish('tag.updated', {
        tag: updatedTag,
        previous: oldTag,
        user_id: req.user.id
      });
      
      res.json({ tag: updatedTag });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 删除标签
   */
  async deleteTag(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证标签是否存在
      const { data: tagData, error: tagError } = await db.query('tags', {
        id,
        user_id: req.user.id
      });
      
      if (tagError) throw tagError;
      
      if (tagData.length === 0) {
        return res.status(404).json({ error: '标签不存在或您无权删除' });
      }
      
      const oldTag = tagData[0];
      
      // 检查标签是否正在使用中
      const { data: usageData, error: usageError } = await db.query('customer_tags', { tag_id: id });
      
      if (usageError) throw usageError;
      
      const isInUse = usageData && usageData.length > 0;
      
      // 如果强制删除标志未设置，且标签正在使用中，则返回错误
      if (isInUse && req.query.force !== 'true') {
        return res.status(409).json({ 
          error: '标签正在使用中，无法删除',
          usage_count: usageData.length,
          message: '使用 force=true 参数强制删除'
        });
      }
      
      // 删除标签关联
      if (isInUse) {
        await db.delete('customer_tags', { tag_id: id });
      }
      
      // 删除标签
      const { data, error } = await db.delete('tags', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      // 清除相关缓存
      await cache.delete(`tag:${id}`);
      await cache.delete(`tags:all:${req.user.id}`);
      await cache.deletePattern(`customers:*:${req.user.id}:*`);
      
      // 发布标签删除事件
      await mq.publish('tag.deleted', {
        tag: oldTag,
        user_id: req.user.id
      });
      
      res.json({ 
        success: true,
        message: '标签已删除',
        removed_associations: isInUse ? usageData.length : 0
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 为客户添加标签
   */
  async addTagToCustomer(req, res, next) {
    try {
      const { customerId, tagId } = req.params;
      
      // 验证客户是否存在
      const { data: customerData, error: customerError } = await db.query('customers', {
        id: customerId,
        user_id: req.user.id
      });
      
      if (customerError) throw customerError;
      
      if (customerData.length === 0) {
        return res.status(404).json({ error: '客户不存在或您无权操作' });
      }
      
      // 验证标签是否存在
      const { data: tagData, error: tagError } = await db.query('tags', {
        id: tagId,
        user_id: req.user.id
      });
      
      if (tagError) throw tagError;
      
      if (tagData.length === 0) {
        return res.status(404).json({ error: '标签不存在或您无权操作' });
      }
      
      // 检查关联是否已存在
      const { data: existingData } = await db.query('customer_tags', {
        customer_id: customerId,
        tag_id: tagId
      });
      
      if (existingData && existingData.length > 0) {
        return res.status(409).json({ 
          error: '客户已关联此标签'
        });
      }
      
      // 添加标签关联
      const { data, error } = await db.insert('customer_tags', {
        customer_id: customerId,
        tag_id: tagId,
        user_id: req.user.id,
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      // 清除相关缓存
      await cache.delete(`customer:${customerId}`);
      await cache.deletePattern(`customers:all:${req.user.id}:*`);
      await cache.delete(`tag:${tagId}`);
      
      res.status(201).json({ 
        success: true,
        message: '标签已添加到客户',
        customer: customerData[0].name,
        tag: tagData[0].name
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 从客户移除标签
   */
  async removeTagFromCustomer(req, res, next) {
    try {
      const { customerId, tagId } = req.params;
      
      // 验证客户和标签的所有权
      const { data: ownershipData, error: ownershipError } = await db.rawQuery(
        `
        SELECT c.id AS customer_id, t.id AS tag_id
        FROM customers c, tags t
        WHERE c.id = $1 AND t.id = $2 AND c.user_id = $3 AND t.user_id = $3
        `,
        [customerId, tagId, req.user.id]
      );
      
      if (ownershipError) throw ownershipError;
      
      if (!ownershipData || ownershipData.length === 0) {
        return res.status(404).json({ error: '客户或标签不存在或您无权操作' });
      }
      
      // 删除标签关联
      const { data, error } = await db.delete('customer_tags', {
        customer_id: customerId,
        tag_id: tagId
      });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: '客户未关联此标签' });
      }
      
      // 清除相关缓存
      await cache.delete(`customer:${customerId}`);
      await cache.deletePattern(`customers:all:${req.user.id}:*`);
      await cache.delete(`tag:${tagId}`);
      
      res.json({ 
        success: true,
        message: '已从客户移除标签'
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取使用特定标签的客户数量
   * @private
   */
  async getTagUsageCount(tagId, userId) {
    try {
      const { data, error } = await db.rawQuery(
        `
        SELECT COUNT(*) as count
        FROM customer_tags
        WHERE tag_id = $1 AND user_id = $2
        `,
        [tagId, userId]
      );
      
      if (error) throw error;
      
      return data[0].count;
    } catch (error) {
      console.error('获取标签使用计数错误:', error);
      return 0;
    }
  }
  
  /**
   * 增强单个标签，添加使用计数
   * @private
   */
  async enhanceTagWithCount(tag, userId) {
    try {
      const count = await this.getTagUsageCount(tag.id, userId);
      
      return {
        ...tag,
        usage_count: parseInt(count)
      };
    } catch (error) {
      console.error('增强标签数据错误:', error);
      return tag;
    }
  }
  
  /**
   * 批量增强标签，添加使用计数
   * @private
   */
  async enhanceTagsWithCount(tags, userId) {
    if (!tags || tags.length === 0) {
      return [];
    }
    
    try {
      // 获取所有标签ID
      const tagIds = tags.map(t => t.id);
      
      // 批量获取使用计数
      const { data } = await db.rawQuery(
        `
        SELECT tag_id, COUNT(*) as count
        FROM customer_tags
        WHERE tag_id = ANY($1) AND user_id = $2
        GROUP BY tag_id
        `,
        [tagIds, userId]
      );
      
      // 创建计数映射
      const countMap = {};
      if (data) {
        data.forEach(item => {
          countMap[item.tag_id] = parseInt(item.count);
        });
      }
      
      // 返回增强后的标签
      return tags.map(tag => ({
        ...tag,
        usage_count: countMap[tag.id] || 0
      }));
    } catch (error) {
      console.error('批量增强标签数据错误:', error);
      return tags;
    }
  }
}

module.exports = { TagController }; 