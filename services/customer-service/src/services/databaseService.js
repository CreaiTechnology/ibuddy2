const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

/**
 * 数据库服务 - 提供数据库操作接口
 */
class DatabaseService {
  constructor() {
    this.supabase = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_KEY
    );
    
    this.isConnected = false;
    this.lastError = null;
  }
  
  /**
   * 执行数据库健康检查
   */
  async healthCheck() {
    try {
      const { data, error } = await this.supabase.from('health_check').select('*').limit(1);
      
      if (error) throw error;
      
      this.isConnected = true;
      this.lastError = null;
      
      return {
        status: 'healthy',
        message: '数据库连接正常',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      this.isConnected = false;
      this.lastError = err;
      
      return {
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * 查询数据
   * @param {string} table - 表名
   * @param {Object} query - 查询条件，键值对
   * @param {Object} options - 查询选项（排序、限制等）
   * @returns {Promise<{data: Array, error: Error}>} 查询结果
   */
  async query(table, query = {}, options = {}) {
    try {
      let queryBuilder = this.supabase.from(table).select('*');
      
      // 应用查询条件
      Object.entries(query).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
      
      // 应用排序
      if (options.orderBy) {
        const order = options.order === 'desc' ? true : false;
        queryBuilder = queryBuilder.order(options.orderBy, { ascending: !order });
      }
      
      // 应用限制
      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }
      
      const { data, error } = await queryBuilder;
      
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
  
  /**
   * 分页查询数据
   * @param {string} table - 表名
   * @param {Object} query - 查询条件，键值对
   * @param {Object} options - 查询选项（排序、限制等）
   * @returns {Promise<{data: Array, error: Error, count: number}>} 查询结果和总数
   */
  async queryPaginated(table, query = {}, options = {}) {
    try {
      // 查询数据
      const { data, error } = await this.query(table, query, options);
      
      if (error) throw error;
      
      // 查询总数
      let countBuilder = this.supabase.from(table).select('*', { count: 'exact' });
      
      // 应用查询条件
      Object.entries(query).forEach(([key, value]) => {
        countBuilder = countBuilder.eq(key, value);
      });
      
      const { count, error: countError } = await countBuilder;
      
      if (countError) throw countError;
      
      return { data, error: null, count };
    } catch (error) {
      return { data: [], error, count: 0 };
    }
  }
  
  /**
   * 执行原始SQL查询
   * @param {string} sql - SQL查询语句
   * @param {Array} params - 查询参数
   * @returns {Promise<{data: Array, error: Error, count: number}>} 查询结果和总数
   */
  async rawQuery(sql, params = []) {
    try {
      const { data, error, count } = await this.supabase.rpc('run_sql', {
        query_text: sql,
        query_params: params
      });
      
      return { data: data || [], error, count };
    } catch (error) {
      return { data: [], error, count: 0 };
    }
  }
  
  /**
   * 插入数据
   * @param {string} table - 表名
   * @param {Object} data - 要插入的数据
   * @returns {Promise<{data: Array, error: Error}>} 插入结果
   */
  async insert(table, data) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select();
      
      return { data: result || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
  
  /**
   * 批量插入数据
   * @param {string} table - 表名
   * @param {Array<Object>} items - 要插入的数据项数组
   * @returns {Promise<{data: Array, error: Error}>} 插入结果
   */
  async insertMany(table, items) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(items);
      
      return { data: result || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
  
  /**
   * 更新数据
   * @param {string} table - 表名
   * @param {Object} query - 更新条件
   * @param {Object} data - 要更新的数据
   * @returns {Promise<{data: Array, error: Error}>} 更新结果
   */
  async update(table, query, data) {
    try {
      let queryBuilder = this.supabase.from(table).update(data);
      
      // 应用更新条件
      Object.entries(query).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
      
      const { data: result, error } = await queryBuilder.select();
      
      return { data: result || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
  
  /**
   * 删除数据
   * @param {string} table - 表名
   * @param {Object} query - 删除条件
   * @returns {Promise<{data: Array, error: Error}>} 删除结果
   */
  async delete(table, query) {
    try {
      let queryBuilder = this.supabase.from(table).delete();
      
      // 应用删除条件
      Object.entries(query).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
      
      const { data: result, error } = await queryBuilder.select();
      
      return { data: result || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
}

module.exports = { DatabaseService }; 