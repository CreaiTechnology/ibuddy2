/**
 * 数据库辅助函数
 * 提供与数据库相关的通用功能，如检查列是否存在
 */

const supabase = require('../config/supabase');

/**
 * 检查指定表中的列是否存在
 * @param {string} tableName - 表名
 * @param {string[]} columnNames - 要检查的列名数组
 * @returns {Promise<Object>} - 包含列名和存在状态的对象
 */
async function checkColumnsExist(tableName, columnNames) {
  try {
    // 尝试使用RPC函数
    const { data, error } = await supabase.rpc('check_columns', { 
      p_table_name: tableName,
      p_columns: columnNames
    });
    
    if (!error && data) {
      // RPC调用成功
      return columnNames.reduce((result, col) => {
        result[col] = data.includes(col);
        return result;
      }, {});
    }
    
    // 如果RPC调用失败，可能是函数不存在，尝试备用方法
    console.log(`RPC check_columns 调用失败: ${error?.message}, 使用备用方法`);
    
    // 假设列不存在 - 这是保守的方法，确保系统运行
    // 但可能会导致某些功能不可用
    return columnNames.reduce((result, col) => {
      result[col] = false;
      return result;
    }, {});
  } catch (e) {
    console.error('检查列存在性时出错:', e);
    // 出错时假设列不存在
    return columnNames.reduce((result, col) => {
      result[col] = false;
      return result;
    }, {});
  }
}

/**
 * 检查单个列是否存在
 * @param {string} tableName - 表名
 * @param {string} columnName - 列名
 * @returns {Promise<boolean>} - 列是否存在
 */
async function columnExists(tableName, columnName) {
  const result = await checkColumnsExist(tableName, [columnName]);
  return result[columnName];
}

module.exports = {
  checkColumnsExist,
  columnExists
}; 