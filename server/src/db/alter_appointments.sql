-- 向appointments表添加地理编码状态和错误信息相关列

-- 添加地理编码状态列
DO $$ 
BEGIN
    -- 检查geocode_status列是否存在
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'geocode_status') THEN
        -- 创建枚举类型（如果不存在）
        IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'geocode_status_enum') THEN
            CREATE TYPE geocode_status_enum AS ENUM ('success', 'failed', 'manual_review_required', 'not_attempted');
        END IF;
        
        -- 添加状态列
        ALTER TABLE appointments ADD COLUMN geocode_status geocode_status_enum DEFAULT 'not_attempted';
        COMMENT ON COLUMN appointments.geocode_status IS '地理编码状态：成功、失败、需手动审核或未尝试';
    END IF;
    
    -- 检查geocode_error列是否存在
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'geocode_error') THEN
        ALTER TABLE appointments ADD COLUMN geocode_error VARCHAR(255);
        COMMENT ON COLUMN appointments.geocode_error IS '地理编码失败时的错误信息';
    END IF;
    
    -- 检查geocode_accuracy列是否存在
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'geocode_accuracy') THEN
        ALTER TABLE appointments ADD COLUMN geocode_accuracy DOUBLE PRECISION;
        COMMENT ON COLUMN appointments.geocode_accuracy IS '地理编码结果的准确度分数(0-1)';
    END IF;
    
    -- 检查formatted_address列是否存在
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'formatted_address') THEN
        ALTER TABLE appointments ADD COLUMN formatted_address TEXT;
        COMMENT ON COLUMN appointments.formatted_address IS '地理编码后的格式化地址';
    END IF;
END $$; 