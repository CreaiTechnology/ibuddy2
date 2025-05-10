-- 为 appointments 表添加地理编码相关列
-- 使用匿名 PL/pgSQL 代码块确保幂等性（可重复执行）

DO $$ 
BEGIN
    -- 添加 geocode_accuracy 列
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'geocode_accuracy'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN geocode_accuracy DOUBLE PRECISION;
        COMMENT ON COLUMN public.appointments.geocode_accuracy IS '地理编码结果精确度分数 (0-1)';
        RAISE NOTICE '已添加 geocode_accuracy 列';
    ELSE
        RAISE NOTICE 'geocode_accuracy 列已存在，跳过';
    END IF;

    -- 添加 geocode_status 列
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'geocode_status'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN geocode_status TEXT;
        COMMENT ON COLUMN public.appointments.geocode_status IS '地理编码状态：success, failed, manual_review_required';
        RAISE NOTICE '已添加 geocode_status 列';
    ELSE
        RAISE NOTICE 'geocode_status 列已存在，跳过';
    END IF;

    -- 添加 geocode_error 列
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'geocode_error'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN geocode_error TEXT;
        COMMENT ON COLUMN public.appointments.geocode_error IS '地理编码错误消息（如果有）';
        RAISE NOTICE '已添加 geocode_error 列';
    ELSE
        RAISE NOTICE 'geocode_error 列已存在，跳过';
    END IF;

    -- 添加 formatted_address 列
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'formatted_address'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN formatted_address TEXT;
        COMMENT ON COLUMN public.appointments.formatted_address IS '标准化的格式化地址';
        RAISE NOTICE '已添加 formatted_address 列';
    ELSE
        RAISE NOTICE 'formatted_address 列已存在，跳过';
    END IF;
END $$; 