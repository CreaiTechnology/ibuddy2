-- 为 appointments 表添加地理编码精确度字段

-- 检查并添加 geocode_accuracy 列
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'appointments' 
                   AND column_name = 'geocode_accuracy') THEN
        ALTER TABLE appointments ADD COLUMN geocode_accuracy DOUBLE PRECISION;
        COMMENT ON COLUMN appointments.geocode_accuracy IS '地理编码结果精确度分数 (0-1)';
    END IF;

    -- 检查并添加 geocode_status 列
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'appointments' 
                   AND column_name = 'geocode_status') THEN
        ALTER TABLE appointments ADD COLUMN geocode_status TEXT;
        COMMENT ON COLUMN appointments.geocode_status IS '地理编码状态：success, failed, manual_review_required';
    END IF;

    -- 检查并添加 geocode_error 列
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'appointments' 
                   AND column_name = 'geocode_error') THEN
        ALTER TABLE appointments ADD COLUMN geocode_error TEXT;
        COMMENT ON COLUMN appointments.geocode_error IS '地理编码错误消息（如果有）';
    END IF;

    -- 检查并添加 formatted_address 列
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'appointments' 
                   AND column_name = 'formatted_address') THEN
        ALTER TABLE appointments ADD COLUMN formatted_address TEXT;
        COMMENT ON COLUMN appointments.formatted_address IS '标准化的格式化地址';
    END IF;
END $$; 