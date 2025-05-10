-- 为 geocoding_cache 表添加精确度字段
-- 如果表不存在，则创建表

-- 检查表是否存在，如果不存在则创建
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'geocoding_cache') THEN
        CREATE TABLE geocoding_cache (
            id SERIAL PRIMARY KEY,
            address_text TEXT NOT NULL,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            formatted_address TEXT,
            provider TEXT,
            accuracy_score DOUBLE PRECISION,
            confidence DOUBLE PRECISION,
            raw_response JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- 为地址文本创建索引以加快查询
        CREATE INDEX idx_geocoding_cache_address_text ON geocoding_cache(address_text);
        
        -- 添加注释
        COMMENT ON TABLE geocoding_cache IS '存储地理编码结果的缓存表，用于减少API调用并提高性能';
        COMMENT ON COLUMN geocoding_cache.accuracy_score IS 'Mapbox返回的相关性分数 (0-1)';
        COMMENT ON COLUMN geocoding_cache.confidence IS '结果置信度，如果API提供';
    ELSE
        -- 如果表已存在，检查并添加缺失的列
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'geocoding_cache' AND column_name = 'accuracy_score') THEN
            ALTER TABLE geocoding_cache ADD COLUMN accuracy_score DOUBLE PRECISION;
            COMMENT ON COLUMN geocoding_cache.accuracy_score IS 'Mapbox返回的相关性分数 (0-1)';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = 'geocoding_cache' AND column_name = 'confidence') THEN
            ALTER TABLE geocoding_cache ADD COLUMN confidence DOUBLE PRECISION;
            COMMENT ON COLUMN geocoding_cache.confidence IS '结果置信度，如果API提供';
        END IF;
    END IF;
END $$; 