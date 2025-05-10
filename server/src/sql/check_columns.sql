-- 创建函数，检查表中是否存在指定列
CREATE OR REPLACE FUNCTION public.check_columns(
    p_table_name TEXT,
    p_columns TEXT[]
) RETURNS TEXT[] AS $$
DECLARE
    existing_columns TEXT[] := '{}';
    col TEXT;
BEGIN
    -- 检查表是否存在
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name
    ) THEN
        RAISE WARNING 'Table "%" does not exist in schema "public"', p_table_name;
        RETURN existing_columns;
    END IF;

    -- 遍历所有提供的列名，检查是否存在
    FOREACH col IN ARRAY p_columns LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = p_table_name 
            AND column_name = col
        ) THEN
            existing_columns := existing_columns || col;
        END IF;
    END LOOP;
    
    RETURN existing_columns;
END;
$$ LANGUAGE plpgsql;

-- 添加执行权限
GRANT EXECUTE ON FUNCTION public.check_columns(TEXT, TEXT[]) TO anon, authenticated, service_role;

-- 使用示例
-- SELECT * FROM check_columns('appointments', ARRAY['geocode_accuracy', 'geocode_status', 'formatted_address']); 