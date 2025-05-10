# 地理编码系统优化指南

## 概述

本目录包含为改进地理编码精确度和稳定性而开发的SQL脚本及优化措施。主要解决以下问题：

1. 添加RPC函数以检查列存在性
2. 提高地理编码精确度和可靠性
3. 增强地址格式化和验证
4. 优化错误处理

## SQL脚本部署

执行以下步骤部署SQL脚本：

1. 首先执行`check_function_exists.sql`创建辅助函数
2. 然后执行`check_columns.sql`创建列检查函数
3. 如果需要创建缓存表，执行下面的SQL命令

```sql
-- 创建地理编码缓存表（如果不存在）
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
    id SERIAL PRIMARY KEY,
    address_text TEXT NOT NULL UNIQUE,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    formatted_address TEXT,
    provider VARCHAR(50),
    accuracy_score NUMERIC(4, 3),
    confidence INTEGER,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_address ON public.geocoding_cache (address_text);

-- 为appointments表添加地理编码相关列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'geocode_accuracy') THEN
        ALTER TABLE appointments ADD COLUMN geocode_accuracy NUMERIC(4,3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'geocode_status') THEN
        ALTER TABLE appointments ADD COLUMN geocode_status VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'geocode_error') THEN
        ALTER TABLE appointments ADD COLUMN geocode_error TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'formatted_address') THEN
        ALTER TABLE appointments ADD COLUMN formatted_address TEXT;
    END IF;
END $$;
```

## 代码优化

除了SQL脚本，以下文件也已优化：

1. `mapService.js` - 增强了地址标准化和地理编码可靠性检查
2. `appointmentController.js` - 改进了地址构建和错误处理逻辑

## 环境配置

确保在`.env`文件中设置以下变量：

```
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

## 地理编码精确度提升

1. 增加了对马来西亚常见地址格式的支持
2. 提高了准确度评分阈值（从0.6提高到0.75）
3. 添加了额外的地理围栏检查，确保坐标在合理范围内
4. 优化了API请求参数，包括多语言支持和地理偏好设置

## 故障排除

如果地理编码结果不准确：

1. 检查Mapbox API密钥是否有效
2. 验证地址输入格式是否完整
3. 检查地理编码缓存表中是否有过时或不准确的记录
4. 检查日志中的警告和错误信息，特别是低准确度警告 