const { DatabaseService } = require('../services/databaseService');
const { MessageQueueService } = require('../services/messageQueueService');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const db = new DatabaseService();
const mq = new MessageQueueService();

/**
 * 导入控制器 - 提供数据导入功能
 */
class ImportController {
  /**
   * 导入客户数据
   */
  async importCustomers(req, res, next) {
    try {
      const { 
        format = 'csv',
        mode = 'create',  // create, update, merge
        skip_duplicates = 'true'
      } = req.query;
      
      // 确保有文件上传
      if (!req.file) {
        return res.status(400).json({
          error: '没有接收到文件数据'
        });
      }
      
      // 验证导入格式
      const validFormats = ['csv', 'json', 'xlsx'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          error: '不支持的导入格式',
          supported_formats: validFormats
        });
      }
      
      // 验证导入模式
      const validModes = ['create', 'update', 'merge'];
      if (!validModes.includes(mode)) {
        return res.status(400).json({
          error: '不支持的导入模式',
          supported_modes: validModes
        });
      }
      
      // 创建导入任务ID
      const importId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // 保存上传的文件信息
      const fileInfo = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path // 临时文件路径
      };
      
      // 异步处理导入，立即返回任务ID
      this.processCustomerImport(
        importId, 
        req.user.id, 
        format, 
        mode,
        skip_duplicates === 'true',
        fileInfo
      );
      
      res.json({
        success: true,
        message: '导入任务已创建，处理后将发送通知',
        import_id: importId,
        status: 'processing',
        requested_at: timestamp,
        format,
        meta: {
          mode,
          skip_duplicates: skip_duplicates === 'true',
          file_name: fileInfo.originalname,
          file_size: fileInfo.size
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 导入标签数据
   */
  async importTags(req, res, next) {
    try {
      const { format = 'csv' } = req.query;
      
      // 确保有文件上传
      if (!req.file) {
        return res.status(400).json({
          error: '没有接收到文件数据'
        });
      }
      
      // 验证导入格式
      const validFormats = ['csv', 'json', 'xlsx'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          error: '不支持的导入格式',
          supported_formats: validFormats
        });
      }
      
      // 创建导入任务ID
      const importId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // 保存上传的文件信息
      const fileInfo = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path // 临时文件路径
      };
      
      // 异步处理导入
      this.processTagImport(importId, req.user.id, format, fileInfo);
      
      res.json({
        success: true,
        message: '标签导入任务已创建，处理后将发送通知',
        import_id: importId,
        status: 'processing',
        requested_at: timestamp,
        format,
        meta: {
          file_name: fileInfo.originalname,
          file_size: fileInfo.size
        }
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取导入任务状态
   */
  async getImportStatus(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          error: '导入任务ID是必须的'
        });
      }
      
      // 从数据库获取导入任务状态
      const { data, error } = await db.query('data_imports', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      if (data.length === 0) {
        return res.status(404).json({
          error: '找不到导入任务或您无权访问'
        });
      }
      
      const importTask = data[0];
      
      res.json({
        import_id: importTask.id,
        status: importTask.status,
        type: importTask.type,
        format: importTask.format,
        created_at: importTask.created_at,
        completed_at: importTask.completed_at,
        record_count: importTask.record_count,
        success_count: importTask.success_count,
        error_count: importTask.error_count,
        warnings: importTask.warnings,
        meta: importTask.meta
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 获取用户最近的导入任务
   */
  async getRecentImports(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      
      // 从数据库获取最近的导入任务
      const { data, error } = await db.query('data_imports', {
        user_id: req.user.id
      }, {
        orderBy: 'created_at',
        order: 'desc',
        limit: parseInt(limit)
      });
      
      if (error) throw error;
      
      res.json({
        imports: data.map(imp => ({
          id: imp.id,
          type: imp.type,
          format: imp.format,
          status: imp.status,
          created_at: imp.created_at,
          completed_at: imp.completed_at,
          record_count: imp.record_count,
          success_count: imp.success_count,
          error_count: imp.error_count
        }))
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 取消进行中的导入任务
   */
  async cancelImport(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          error: '导入任务ID是必须的'
        });
      }
      
      // 从数据库获取导入任务
      const { data, error } = await db.query('data_imports', {
        id,
        user_id: req.user.id
      });
      
      if (error) throw error;
      
      if (data.length === 0) {
        return res.status(404).json({
          error: '找不到导入任务或您无权访问'
        });
      }
      
      const importTask = data[0];
      
      // 只能取消进行中的任务
      if (importTask.status !== 'processing') {
        return res.status(400).json({
          error: '只能取消进行中的导入任务',
          current_status: importTask.status
        });
      }
      
      // 发送取消消息
      await mq.publish('import.cancel.requested', {
        import_id: id,
        user_id: req.user.id,
        timestamp: new Date().toISOString()
      });
      
      // 更新任务状态
      await db.update('data_imports', 
        { id },
        { 
          status: 'cancelling',
          updated_at: new Date().toISOString()
        }
      );
      
      res.json({
        success: true,
        message: '已发出取消导入任务的请求',
        import_id: id,
        status: 'cancelling'
      });
    } catch (err) {
      next(err);
    }
  }
  
  /**
   * 处理客户数据导入（异步）
   * @private
   */
  async processCustomerImport(importId, userId, format, mode, skipDuplicates, fileInfo) {
    try {
      // 创建导入任务记录
      await db.insert('data_imports', {
        id: importId,
        user_id: userId,
        type: 'customers',
        format,
        status: 'processing',
        created_at: new Date().toISOString(),
        meta: {
          mode,
          skip_duplicates: skipDuplicates,
          file_name: fileInfo.originalname,
          file_size: fileInfo.size,
          original_path: fileInfo.path
        }
      });
      
      // 发送到消息队列进行处理
      await mq.publish('import.customers.requested', {
        import_id: importId,
        user_id: userId,
        format,
        mode,
        skip_duplicates: skipDuplicates,
        file_info: fileInfo,
        timestamp: new Date().toISOString()
      });
      
      // 注意：在实际实现中，导入结果会被处理服务更新
      // 这里为了演示，我们假设立即完成了处理
      setTimeout(async () => {
        await this.simulateImportCompletion(importId, 'customers', userId, format);
      }, 7000);
    } catch (error) {
      console.error('处理客户导入错误:', error);
      
      // 更新导入任务状态为失败
      await db.update('data_imports', 
        { id: importId },
        { 
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        }
      );
    }
  }
  
  /**
   * 处理标签数据导入（异步）
   * @private
   */
  async processTagImport(importId, userId, format, fileInfo) {
    try {
      // 创建导入任务记录
      await db.insert('data_imports', {
        id: importId,
        user_id: userId,
        type: 'tags',
        format,
        status: 'processing',
        created_at: new Date().toISOString(),
        meta: {
          file_name: fileInfo.originalname,
          file_size: fileInfo.size,
          original_path: fileInfo.path
        }
      });
      
      // 发送到消息队列进行处理
      await mq.publish('import.tags.requested', {
        import_id: importId,
        user_id: userId,
        format,
        file_info: fileInfo,
        timestamp: new Date().toISOString()
      });
      
      // 模拟处理完成
      setTimeout(async () => {
        await this.simulateImportCompletion(importId, 'tags', userId, format);
      }, 5000);
    } catch (error) {
      console.error('处理标签导入错误:', error);
      
      // 更新导入任务状态为失败
      await db.update('data_imports', 
        { id: importId },
        { 
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        }
      );
    }
  }
  
  /**
   * 模拟导入完成（仅用于演示）
   * @private
   */
  async simulateImportCompletion(importId, type, userId, format) {
    try {
      // 模拟导入记录数量
      const recordCount = Math.floor(Math.random() * 200) + 50;
      const successCount = Math.floor(recordCount * 0.95);
      const errorCount = recordCount - successCount;
      
      // 生成一些随机警告
      const warnings = [];
      if (errorCount > 0) {
        warnings.push(`${errorCount}条记录导入失败，可能是因为格式不正确或数据缺失`);
      }
      if (Math.random() > 0.7) {
        warnings.push('部分记录的电话号码格式不正确，已自动标准化');
      }
      if (Math.random() > 0.8) {
        warnings.push('部分记录的邮箱地址可能无效');
      }
      
      // 更新导入任务状态为完成
      await db.update('data_imports', 
        { id: importId },
        { 
          status: 'completed',
          completed_at: new Date().toISOString(),
          record_count: recordCount,
          success_count: successCount,
          error_count: errorCount,
          warnings: warnings.length > 0 ? warnings : null,
          updated_at: new Date().toISOString()
        }
      );
      
      // 发送导入完成通知
      await mq.publish('import.completed', {
        import_id: importId,
        user_id: userId,
        type,
        format,
        record_count: recordCount,
        success_count: successCount,
        error_count: errorCount,
        warnings,
        completed_at: new Date().toISOString()
      });
      
      // 实际实现中，这里会触发通知服务向用户发送导入完成的通知
    } catch (error) {
      console.error('模拟导入完成错误:', error);
    }
  }
}

module.exports = { ImportController }; 