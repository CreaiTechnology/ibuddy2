/**
 * 迁移文件：为appointments表添加地理编码相关列
 * 
 * 使用方法:
 * 1. 确保环境变量SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY正确设置
 * 2. 运行 node src/config/migrations/add_geocoding_columns.js
 */

require('dotenv').config();
const supabase = require('../supabase');

async function checkColumnExists(tableName, columnName) {
  try {
    // 直接执行 SQL RPC 函数检查列是否存在
    const { data, error } = await supabase.rpc('column_exists', { 
      p_table_name: tableName,
      p_column_name: columnName
    });
    
    if (error) {
      // 如果 RPC 函数不存在，降级到手动方式检查
      console.log(`RPC函数不可用 (${error.message})，使用备用方式检查列...`);
      
      // 备用方式：模拟行为，而不是直接查询 information_schema
      // 我们创建一个临时表并使用 supabase 的现有方法检查
      const tableSql = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}' 
          AND column_name = '${columnName}'
        ) as exists
      `;
      
      // 用函数封装我们的 SQL 作为一个向量查询
      const { data: existsCheck, error: existsError } = await supabase
        .from('_temp_column_check')
        .select('*')
        .csv()
        .then(async (response) => {
          if (response.error && response.error.message.includes('does not exist')) {
            // 表不存在，尝试直接执行 ALTER TABLE 并检查错误
            try {
              // 尝试添加列，如果失败且错误信息包含"已存在"，则表示列已存在
              const alterResult = await executeSqlWithFallback(`
                ALTER TABLE ${tableName} ADD COLUMN ${columnName}_temp_check_exists BOOLEAN;
                ALTER TABLE ${tableName} DROP COLUMN ${columnName}_temp_check_exists;
              `);
              
              // 如果没有问题（或只是临时列已存在），我们就假设我们可以添加新列
              return { data: false, error: null };
            } catch (err) {
              console.error(`尝试检查列的备用方法失败:`, err);
              return { data: false, error: err };
            }
          }
          return response;
        });
      
      if (existsError) {
        console.error(`检查列 ${columnName} 的备用方法出错:`, existsError);
        return false;
      }
      
      return existsCheck === true;
    }
    
    return data === true;
  } catch (err) {
    console.error(`检查列 ${columnName} 时出错:`, err);
    return false;
  }
}

// 执行 SQL 语句的通用函数，带有多种备选方案
async function executeSqlWithFallback(sql) {
  try {
    // 尝试方式 1: 使用 RPC 函数 exec_sql
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (!error) {
      return { data, error: null };
    }
    
    // 如果上面失败，尝试方式 2: 使用内置 SQL 方法
    if (typeof supabase.sql === 'function') {
      return await supabase.sql(sql);
    }
    
    // 如果上面失败，尝试方式 3: 使用数据库函数直接执行 SQL
    return await supabase.rpc('run_sql', { query: sql });
  } catch (err) {
    console.error('所有执行 SQL 的方法都失败:', err);
    throw err;
  }
}

async function addColumn(tableName, columnName, dataType, comment) {
  // 确认列不存在再添加
  const exists = await checkColumnExists(tableName, columnName);
  if (exists) {
    console.log(`列 ${columnName} 已存在于表 ${tableName} 中，跳过。`);
    return false;
  }
  
  // 构建添加列的SQL
  const sql = `
    ALTER TABLE ${tableName} 
    ADD COLUMN ${columnName} ${dataType};
    
    COMMENT ON COLUMN ${tableName}.${columnName} IS '${comment}';
  `;
  
  try {
    // 执行SQL
    console.log(`正在添加列 ${columnName} 到表 ${tableName}...`);
    
    // 使用带备选方案的函数执行 SQL
    const { error } = await executeSqlWithFallback(sql);
    
    if (error) {
      throw error;
    }
    
    console.log(`成功添加列 ${columnName}`);
    return true;
  } catch (err) {
    console.error(`添加列 ${columnName} 失败:`, err);
    return false;
  }
}

async function runMigration() {
  if (!supabase) {
    console.error('Supabase客户端未初始化。请检查环境变量SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY。');
    process.exit(1);
  }
  
  console.log('开始迁移: 添加地理编码相关列到appointments表');
  
  // 添加各列
  const tableName = 'appointments';
  const columns = [
    {
      name: 'geocode_accuracy',
      type: 'DOUBLE PRECISION',
      comment: '地理编码结果精确度分数 (0-1)'
    },
    {
      name: 'geocode_status',
      type: 'TEXT',
      comment: '地理编码状态：success, failed, manual_review_required'
    },
    {
      name: 'geocode_error',
      type: 'TEXT',
      comment: '地理编码错误消息（如果有）'
    },
    {
      name: 'formatted_address',
      type: 'TEXT',
      comment: '标准化的格式化地址'
    }
  ];
  
  // 尝试通过直接 SQL 添加所有列
  try {
    console.log('尝试批量添加所有列...');
    
    let allColumnsSQL = 'DO $$ BEGIN\n';
    
    for (const column of columns) {
      allColumnsSQL += `
        -- 检查并添加 ${column.name} 列
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}' 
          AND column_name = '${column.name}'
        ) THEN
          ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type};
          COMMENT ON COLUMN ${tableName}.${column.name} IS '${column.comment}';
        END IF;
      `;
    }
    
    allColumnsSQL += 'END $$;';
    
    const { error } = await executeSqlWithFallback(allColumnsSQL);
    
    if (!error) {
      console.log('成功通过批量 SQL 添加所有列！');
      return;
    } else {
      console.log('批量添加失败，转为逐个添加:', error.message);
    }
  } catch (e) {
    console.error('批量添加失败，将尝试逐个添加:', e);
  }
  
  // 如果批量添加失败，则逐个添加
  let successCount = 0;
  for (const column of columns) {
    const success = await addColumn(tableName, column.name, column.type, column.comment);
    if (success) successCount++;
  }
  
  console.log(`迁移完成: ${successCount}/${columns.length} 列添加成功`);
  
  if (successCount === columns.length) {
    console.log('所有列都成功添加！');
  } else if (successCount > 0) {
    console.log('部分列添加成功，可能有些列已经存在。');
  } else {
    console.error('所有列都添加失败，请检查错误信息。');
  }
}

// 直接执行脚本时运行迁移
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('迁移操作完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('迁移操作失败:', err);
      process.exit(1);
    });
}

module.exports = { runMigration }; 