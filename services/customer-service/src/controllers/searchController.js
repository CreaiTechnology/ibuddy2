const { DatabaseService } = require('../services/databaseService');
const { CacheService } = require('../services/cacheService');
const config = require('../config');

const db = new DatabaseService();
const cache = new CacheService();

/**
 * 搜索控制器 - 提供高级搜索功能
 */
class SearchController {
  /**
   * 全局搜索 - 在客户、标签和互动记录中搜索
   */
  async globalSearch(req, res, next) {
    try {
      const { 
        q, // 搜索关键词
        type = 'all', // 搜索类型: all, customer, tag, interaction
        limit = config.DEFAULT_PAGE_SIZE,
        offset = 0
      } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          error: '搜索关键词至少需要2个字符'
        });
      }
      
      // 构建缓存键
      const cacheKey = `search:${req.user.id}:${q}:${type}:${limit}:${offset}`;
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // 构建查询
      const searchTerm = `%${q.trim().toLowerCase()}%`;
      const userId = req.user.id;
      let results = {};
      
      // 根据类型执行相应的搜索
      if (type === 'all' || type === 'customer') {
        results.customers = await this.searchCustomers(searchTerm, userId, limit, offset);
      }
      
      if (type === 'all' || type === 'tag') {
        results.tags = await this.searchTags(searchTerm, userId, limit, offset);
      }
      
      if (type === 'all' || type === 'interaction') {
        results.interactions = await this.searchInteractions(searchTerm, userId, limit, offset);
      }
      
      // 添加元数据
      results.meta = {
        query: q,
        type,
        timestamp: new Date().toISOString()
      };
      
      // 缓存结果
      await cache.set(cacheKey, results, 300); // 5分钟缓存
      
      res.json(results);
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 搜索客户
   */
  async advancedCustomerSearch(req, res, next) {
    try {
      const {
        name,
        email,
        phone,
        company,
        tags,
        created_after,
        created_before,
        last_interaction_after,
        last_interaction_before,
        sort = 'created_at',
        order = 'desc',
        limit = config.DEFAULT_PAGE_SIZE,
        offset = 0
      } = req.query;
      
      // 至少需要一个搜索条件
      if (!name && !email && !phone && !company && !tags && 
          !created_after && !created_before && 
          !last_interaction_after && !last_interaction_before) {
        return res.status(400).json({
          error: '至少需要提供一个搜索条件'
        });
      }
      
      // 构建查询
      let queryStr = `
        SELECT c.*, 
          COUNT(i.id) as interaction_count,
          ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL) as tag_names,
          ARRAY_AGG(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL) as tag_ids
        FROM customers c
        LEFT JOIN customer_interactions i ON c.id = i.customer_id
        LEFT JOIN customer_tags ct ON c.id = ct.customer_id
        LEFT JOIN tags t ON ct.tag_id = t.id AND t.user_id = c.user_id
        WHERE c.user_id = $1
      `;
      
      const queryParams = [req.user.id];
      let paramIndex = 2;
      
      // 添加各种条件
      if (name) {
        queryStr += ` AND LOWER(c.name) LIKE $${paramIndex++}`;
        queryParams.push(`%${name.toLowerCase()}%`);
      }
      
      if (email) {
        queryStr += ` AND LOWER(c.email) LIKE $${paramIndex++}`;
        queryParams.push(`%${email.toLowerCase()}%`);
      }
      
      if (phone) {
        queryStr += ` AND c.phone LIKE $${paramIndex++}`;
        queryParams.push(`%${phone}%`);
      }
      
      if (company) {
        queryStr += ` AND LOWER(c.company) LIKE $${paramIndex++}`;
        queryParams.push(`%${company.toLowerCase()}%`);
      }
      
      if (tags) {
        const tagIds = tags.split(',');
        queryStr += ` AND EXISTS (
          SELECT 1 FROM customer_tags 
          WHERE customer_id = c.id AND tag_id IN ($${paramIndex++})
        )`;
        queryParams.push(tagIds);
      }
      
      if (created_after) {
        queryStr += ` AND c.created_at >= $${paramIndex++}`;
        queryParams.push(created_after);
      }
      
      if (created_before) {
        queryStr += ` AND c.created_at <= $${paramIndex++}`;
        queryParams.push(created_before);
      }
      
      if (last_interaction_after) {
        queryStr += ` AND c.last_interaction_at >= $${paramIndex++}`;
        queryParams.push(last_interaction_after);
      }
      
      if (last_interaction_before) {
        queryStr += ` AND c.last_interaction_at <= $${paramIndex++}`;
        queryParams.push(last_interaction_before);
      }
      
      // 分组
      queryStr += ` GROUP BY c.id`;
      
      // 排序
      queryStr += ` ORDER BY c.${sort} ${order === 'asc' ? 'ASC' : 'DESC'}`;
      
      // 分页
      queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(parseInt(limit), parseInt(offset));
      
      // 执行查询
      const { data, error } = await db.rawQuery(queryStr, queryParams);
      
      if (error) throw error;
      
      // 查询总数
      let countQueryStr = `
        SELECT COUNT(DISTINCT c.id) as count
        FROM customers c
        LEFT JOIN customer_tags ct ON c.id = ct.customer_id
        WHERE c.user_id = $1
      `;
      
      // 重用条件，但去掉分组、排序和分页
      const countParams = [...queryParams];
      countParams.splice(-2, 2); // 移除LIMIT和OFFSET参数
      
      const { data: countData, error: countError } = await db.rawQuery(countQueryStr, countParams);
      
      if (countError) throw countError;
      
      const totalCount = countData[0].count;
      
      // 处理查询结果
      const response = {
        customers: data || [],
        pagination: {
          total: parseInt(totalCount),
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        meta: {
          filters: {
            name, email, phone, company, tags,
            created_after, created_before,
            last_interaction_after, last_interaction_before
          },
          sort,
          order
        }
      };
      
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 搜索客户
   * @private
   */
  async searchCustomers(searchTerm, userId, limit, offset) {
    const queryStr = `
      SELECT c.*, 
        COUNT(i.id) as interaction_count,
        MAX(i.created_at) as last_interaction_date
      FROM customers c
      LEFT JOIN customer_interactions i ON c.id = i.customer_id
      WHERE c.user_id = $1 AND (
        LOWER(c.name) LIKE $2 OR
        LOWER(c.email) LIKE $2 OR
        c.phone LIKE $2 OR
        LOWER(c.company) LIKE $2 OR
        LOWER(c.address) LIKE $2 OR
        LOWER(c.notes) LIKE $2
      )
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $3 OFFSET $4
    `;
    
    const { data, error } = await db.rawQuery(
      queryStr,
      [userId, searchTerm, limit, offset]
    );
    
    if (error) throw error;
    
    // 获取每个客户的标签
    if (data && data.length > 0) {
      const customerIds = data.map(c => c.id);
      const tagsQuery = `
        SELECT ct.customer_id, t.id, t.name, t.color
        FROM customer_tags ct
        JOIN tags t ON ct.tag_id = t.id
        WHERE ct.customer_id = ANY($1) AND t.user_id = $2
      `;
      
      const { data: tagsData, error: tagsError } = await db.rawQuery(
        tagsQuery,
        [customerIds, userId]
      );
      
      if (!tagsError && tagsData) {
        // 构建客户标签映射
        const customerTags = {};
        tagsData.forEach(tag => {
          if (!customerTags[tag.customer_id]) {
            customerTags[tag.customer_id] = [];
          }
          customerTags[tag.customer_id].push({
            id: tag.id,
            name: tag.name,
            color: tag.color
          });
        });
        
        // 添加标签到客户数据
        data.forEach(customer => {
          customer.tags = customerTags[customer.id] || [];
        });
      }
    }
    
    // 获取符合条件的总客户数量
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      WHERE c.user_id = $1 AND (
        LOWER(c.name) LIKE $2 OR
        LOWER(c.email) LIKE $2 OR
        c.phone LIKE $2 OR
        LOWER(c.company) LIKE $2 OR
        LOWER(c.address) LIKE $2 OR
        LOWER(c.notes) LIKE $2
      )
    `;
    
    const { data: countData, error: countError } = await db.rawQuery(
      countQuery,
      [userId, searchTerm]
    );
    
    const total = !countError && countData ? parseInt(countData[0].count) : 0;
    
    return {
      results: data || [],
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  }
  
  /**
   * 搜索标签
   * @private
   */
  async searchTags(searchTerm, userId, limit, offset) {
    const queryStr = `
      SELECT t.*,
        COUNT(ct.customer_id) as usage_count
      FROM tags t
      LEFT JOIN customer_tags ct ON t.id = ct.tag_id
      WHERE t.user_id = $1 AND (
        LOWER(t.name) LIKE $2 OR
        LOWER(t.description) LIKE $2
      )
      GROUP BY t.id
      ORDER BY t.name ASC
      LIMIT $3 OFFSET $4
    `;
    
    const { data, error } = await db.rawQuery(
      queryStr,
      [userId, searchTerm, limit, offset]
    );
    
    if (error) throw error;
    
    // 获取符合条件的总标签数量
    const countQuery = `
      SELECT COUNT(*) as count
      FROM tags t
      WHERE t.user_id = $1 AND (
        LOWER(t.name) LIKE $2 OR
        LOWER(t.description) LIKE $2
      )
    `;
    
    const { data: countData, error: countError } = await db.rawQuery(
      countQuery,
      [userId, searchTerm]
    );
    
    const total = !countError && countData ? parseInt(countData[0].count) : 0;
    
    return {
      results: data || [],
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  }
  
  /**
   * 搜索互动记录
   * @private
   */
  async searchInteractions(searchTerm, userId, limit, offset) {
    const queryStr = `
      SELECT i.*, c.name as customer_name, c.email as customer_email
      FROM customer_interactions i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = $1 AND (
        LOWER(i.title) LIKE $2 OR
        LOWER(i.content) LIKE $2 OR
        LOWER(c.name) LIKE $2
      )
      ORDER BY i.created_at DESC
      LIMIT $3 OFFSET $4
    `;
    
    const { data, error } = await db.rawQuery(
      queryStr,
      [userId, searchTerm, limit, offset]
    );
    
    if (error) throw error;
    
    // 处理结果，将客户信息单独提取出来
    const results = data ? data.map(item => ({
      ...item,
      customer: {
        id: item.customer_id,
        name: item.customer_name,
        email: item.customer_email
      }
    })) : [];
    
    // 获取符合条件的总互动记录数量
    const countQuery = `
      SELECT COUNT(*) as count
      FROM customer_interactions i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = $1 AND (
        LOWER(i.title) LIKE $2 OR
        LOWER(i.content) LIKE $2 OR
        LOWER(c.name) LIKE $2
      )
    `;
    
    const { data: countData, error: countError } = await db.rawQuery(
      countQuery,
      [userId, searchTerm]
    );
    
    const total = !countError && countData ? parseInt(countData[0].count) : 0;
    
    return {
      results,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  }
  
  /**
   * 高级互动记录搜索
   */
  async advancedInteractionSearch(req, res, next) {
    try {
      const {
        customer_id,
        type,
        title,
        content,
        created_after,
        created_before,
        sort = 'created_at',
        order = 'desc',
        limit = config.DEFAULT_PAGE_SIZE,
        offset = 0
      } = req.query;
      
      // 至少需要一个搜索条件
      if (!customer_id && !type && !title && !content && 
          !created_after && !created_before) {
        return res.status(400).json({
          error: '至少需要提供一个搜索条件'
        });
      }
      
      // 构建查询
      let queryStr = `
        SELECT i.*, c.name as customer_name, c.email as customer_email
        FROM customer_interactions i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.user_id = $1
      `;
      
      const queryParams = [req.user.id];
      let paramIndex = 2;
      
      // 添加各种条件
      if (customer_id) {
        queryStr += ` AND i.customer_id = $${paramIndex++}`;
        queryParams.push(customer_id);
      }
      
      if (type) {
        queryStr += ` AND i.type = $${paramIndex++}`;
        queryParams.push(type);
      }
      
      if (title) {
        queryStr += ` AND LOWER(i.title) LIKE $${paramIndex++}`;
        queryParams.push(`%${title.toLowerCase()}%`);
      }
      
      if (content) {
        queryStr += ` AND LOWER(i.content) LIKE $${paramIndex++}`;
        queryParams.push(`%${content.toLowerCase()}%`);
      }
      
      if (created_after) {
        queryStr += ` AND i.created_at >= $${paramIndex++}`;
        queryParams.push(created_after);
      }
      
      if (created_before) {
        queryStr += ` AND i.created_at <= $${paramIndex++}`;
        queryParams.push(created_before);
      }
      
      // 排序
      const validSortFields = ['created_at', 'updated_at', 'type', 'title'];
      const sortField = validSortFields.includes(sort) ? sort : 'created_at';
      queryStr += ` ORDER BY i.${sortField} ${order === 'asc' ? 'ASC' : 'DESC'}`;
      
      // 分页
      queryStr += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(parseInt(limit), parseInt(offset));
      
      // 执行查询
      const { data, error } = await db.rawQuery(queryStr, queryParams);
      
      if (error) throw error;
      
      // 查询总数
      let countQueryStr = `
        SELECT COUNT(*) as count
        FROM customer_interactions i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.user_id = $1
      `;
      
      // 重用条件，但去掉排序和分页
      const countParams = [...queryParams];
      countParams.splice(-2, 2); // 移除LIMIT和OFFSET参数
      
      const { data: countData, error: countError } = await db.rawQuery(countQueryStr, countParams);
      
      if (countError) throw countError;
      
      const totalCount = countData[0].count;
      
      // 处理查询结果
      const results = data ? data.map(item => ({
        ...item,
        customer: {
          id: item.customer_id,
          name: item.customer_name,
          email: item.customer_email
        }
      })) : [];
      
      const response = {
        interactions: results,
        pagination: {
          total: parseInt(totalCount),
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        meta: {
          filters: {
            customer_id, type, title, content,
            created_after, created_before
          },
          sort,
          order
        }
      };
      
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { SearchController }; 