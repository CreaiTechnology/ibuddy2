const { DatabaseService } = require('../services/databaseService');
const { MessageQueueService } = require('../services/messageQueueService');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const db = new DatabaseService();
const mq = new MessageQueueService();

/**
 * 导出控制器 - 提供数据导出功能
 */
class ExportController {
  /**
   * 导出客户数据
   */
  async exportCustomers(req, res, next) {
    try {
      const { 
        format = 'csv', 
        include_tags = 'true', 
        include_interactions = 'false',
        filter_tags,
        search_query
      } = req.query;
      
      // 验证导出格式
      const validFormats = ['csv', 'json', 'xlsx'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          error: '不支持的导出格式',
          supported_formats: validFormats
        });
      }
      
      // 创建导出任务ID
      const exportId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // 异步处理导出，立即返回任务ID
      this.processCustomerExport(
        exportId, 
        req.user.id, 
        format, 
        include_tags === 'true',
        include_interactions === 'true',
        filter_tags,
        search_query
      );
      
      res.json({
        success: true,
        message: '导出任务已创建，完成后将发送通知',
        export_id: exportId,
        status: 'processing',
        requested_at: timestamp,
        format,
        meta: {
          include_tags: include_tags === 'true',
          include_interactions: include_interactions === 'true',
          filter_tags,
          search_query
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 导出标签数据
   */
  async exportTags(req, res, next) {
    try {
      const { format = 'csv' } = req.query;
      
      // 验证导出格式
      const validFormats = ['csv', 'json', 'xlsx'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          error: '不支持的导出格式',
          supported_formats: validFormats
        });
      }
      
      // 创建导出任务ID
      const exportId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // 异步处理导出
      this.processTagExport(exportId, req.user.id, format);
      
      res.json({
        success: true,
        message: '标签导出任务已创建，完成后将发送通知',
        export_id: exportId,
        status: 'processing',
        requested_at: timestamp,
        format
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 导出互动记录数据
   */
  async exportInteractions(req, res, next) {
    try {
      const { 
        format = 'csv', 
        customer_id,
        type,
        date_from,
        date_to
      } = req.query;
      
      // 验证导出格式
      const validFormats = ['csv', 'json', 'xlsx'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          error: '不支持的导出格式',
          supported_formats: validFormats
        });
      }
      
      // 创建导出任务ID
      const exportId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // 异步处理导出
      this.processInteractionsExport(
        exportId, 
        req.user.id, 
        format,
        customer_id,
        type,
        date_from,
        date_to
      );
      
      res.json({
        success: true,
        message: '互动记录导出任务已创建，完成后将发送通知',
        export_id: exportId,
        status: 'processing',
        requested_at: timestamp,
        format,
        meta: {
          customer_id,
          type,
          date_range: date_from || date_to ? { from: date_from, to: date_to } : null
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取导出任务状态
   */
  async getExportStatus(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          error: '导出任务ID是必须的'
        });
      }
      
      // 从数据库获取导出任务状态
      const { data, error } = await db.query('data_exports', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      if (data.length === 0) {
        return res.status(404).json({
          error: '找不到导出任务或您无权访问'
        });
      }
      
      const exportTask = data[0];
      
      res.json({
        export_id: exportTask.id,
        status: exportTask.status,
        type: exportTask.type,
        format: exportTask.format,
        created_at: exportTask.created_at,
        completed_at: exportTask.completed_at,
        download_url: exportTask.status === 'completed' ? 
          `${config.API_BASE_URL}/api/exports/download/${exportTask.id}` : null,
        file_size: exportTask.file_size,
        record_count: exportTask.record_count,
        meta: exportTask.meta
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 下载导出文件
   */
  async downloadExport(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          error: '导出任务ID是必须的'
        });
      }
      
      // 从数据库获取导出任务
      const { data, error } = await db.query('data_exports', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      if (data.length === 0) {
        return res.status(404).json({
          error: '找不到导出任务或您无权访问'
        });
      }
      
      const exportTask = data[0];
      
      if (exportTask.status !== 'completed') {
        return res.status(400).json({
          error: '导出任务尚未完成',
          status: exportTask.status
        });
      }
      
      // 在实际实现中，这里应该从存储服务（如S3）获取文件并发送
      // 为了演示，我们发送一个模拟响应
      res.json({
        message: '这是一个模拟下载响应。在实际实现中，这里会直接发送文件。',
        export_info: {
          id: exportTask.id,
          filename: `${exportTask.type}_export_${exportTask.id}.${exportTask.format}`,
          type: exportTask.type,
          format: exportTask.format,
          created_at: exportTask.created_at,
          file_size: exportTask.file_size,
          record_count: exportTask.record_count
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取用户最近的导出任务
   */
  async getRecentExports(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      
      // 从数据库获取最近的导出任务
      const { data, error } = await db.query('data_exports', {
        user_id: req.user.id
      }, {
        orderBy: 'created_at',
        order: 'desc',
        limit: parseInt(limit)
      });
      
      if (error) throw error;
      
      res.json({
        exports: data.map(exp => ({
          id: exp.id,
          type: exp.type,
          format: exp.format,
          status: exp.status,
          created_at: exp.created_at,
          completed_at: exp.completed_at,
          download_url: exp.status === 'completed' ? 
            `${config.API_BASE_URL}/api/exports/download/${exp.id}` : null,
          record_count: exp.record_count
        }))
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 处理客户数据导出（异步）
   * @private
   */
  async processCustomerExport(exportId, userId, format, includeTags, includeInteractions, filterTags, searchQuery) {
    try {
      // 创建导出任务记录
      await db.insert('data_exports', {
        id: exportId,
        user_id: userId,
        type: 'customers',
        format,
        status: 'processing',
        created_at: new Date().toISOString(),
        meta: {
          include_tags: includeTags,
          include_interactions: includeInteractions,
          filter_tags: filterTags,
          search_query: searchQuery
        }
      });
      
      // 发送到消息队列进行处理
      // 在实际实现中，这会由专门的导出服务消费
      await mq.publish('export.customers.requested', {
        export_id: exportId,
        user_id: userId,
        format,
        include_tags: includeTags,
        include_interactions: includeInteractions,
        filter_tags: filterTags,
        search_query: searchQuery,
        timestamp: new Date().toISOString()
      });
      
      // 注意：在实际实现中，导出结果会被处理服务更新并保存到存储服务
      // 这里为了演示，我们假设立即完成了处理
      setTimeout(async () => {
        await this.simulateExportCompletion(exportId, 'customers', userId, format);
      }, 5000);
    } catch (error) {
      console.error('处理客户导出错误:', error);
      
      // 更新导出任务状态为失败
      await db.update('data_exports', 
        { id: exportId },
        { 
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        }
      );
    }
  }
  
  /**
   * 处理标签数据导出（异步）
   * @private
   */
  async processTagExport(exportId, userId, format) {
    try {
      // 创建导出任务记录
      await db.insert('data_exports', {
        id: exportId,
        user_id: userId,
        type: 'tags',
        format,
        status: 'processing',
        created_at: new Date().toISOString()
      });
      
      // 发送到消息队列进行处理
      await mq.publish('export.tags.requested', {
        export_id: exportId,
        user_id: userId,
        format,
        timestamp: new Date().toISOString()
      });
      
      // 模拟处理完成
      setTimeout(async () => {
        await this.simulateExportCompletion(exportId, 'tags', userId, format);
      }, 3000);
    } catch (error) {
      console.error('处理标签导出错误:', error);
      
      // 更新导出任务状态为失败
      await db.update('data_exports', 
        { id: exportId },
        { 
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        }
      );
    }
  }
  
  /**
   * 处理互动记录导出（异步）
   * @private
   */
  async processInteractionsExport(exportId, userId, format, customerId, type, dateFrom, dateTo) {
    try {
      // 创建导出任务记录
      await db.insert('data_exports', {
        id: exportId,
        user_id: userId,
        type: 'interactions',
        format,
        status: 'processing',
        created_at: new Date().toISOString(),
        meta: {
          customer_id: customerId,
          interaction_type: type,
          date_from: dateFrom,
          date_to: dateTo
        }
      });
      
      // 发送到消息队列进行处理
      await mq.publish('export.interactions.requested', {
        export_id: exportId,
        user_id: userId,
        format,
        customer_id: customerId,
        type,
        date_from: dateFrom,
        date_to: dateTo,
        timestamp: new Date().toISOString()
      });
      
      // 模拟处理完成
      setTimeout(async () => {
        await this.simulateExportCompletion(exportId, 'interactions', userId, format);
      }, 4000);
    } catch (error) {
      console.error('处理互动记录导出错误:', error);
      
      // 更新导出任务状态为失败
      await db.update('data_exports', 
        { id: exportId },
        { 
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        }
      );
    }
  }
  
  /**
   * 模拟导出完成（仅用于演示）
   * @private
   */
  async simulateExportCompletion(exportId, type, userId, format) {
    try {
      // 获取记录总数
      let recordCount = 0;
      if (type === 'customers') {
        const { data } = await db.rawQuery(
          'SELECT COUNT(*) as count FROM customers WHERE user_id = $1',
          [userId]
        );
        recordCount = data[0].count;
      } else if (type === 'tags') {
        const { data } = await db.rawQuery(
          'SELECT COUNT(*) as count FROM tags WHERE user_id = $1',
          [userId]
        );
        recordCount = data[0].count;
      } else if (type === 'interactions') {
        const { data } = await db.rawQuery(
          'SELECT COUNT(*) as count FROM customer_interactions WHERE user_id = $1',
          [userId]
        );
        recordCount = data[0].count;
      }
      
      // 更新导出任务状态为完成
      await db.update('data_exports', 
        { id: exportId },
        { 
          status: 'completed',
          completed_at: new Date().toISOString(),
          record_count: parseInt(recordCount),
          file_size: Math.floor(recordCount * 500), // 模拟文件大小（字节）
          file_path: `/exports/${userId}/${type}_${exportId}.${format}`, // 模拟文件路径
          updated_at: new Date().toISOString()
        }
      );
      
      // 发送导出完成通知
      await mq.publish('export.completed', {
        export_id: exportId,
        user_id: userId,
        type,
        format,
        record_count: parseInt(recordCount),
        completed_at: new Date().toISOString()
      });
      
      // 实际实现中，这里会触发通知服务向用户发送导出完成的通知
    } catch (error) {
      console.error('模拟导出完成错误:', error);
    }
  }
}

module.exports = { ExportController }; 