-- 创建辅助函数，用于检查其他函数是否存在
CREATE OR REPLACE FUNCTION public.check_function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE pg_proc.proname = function_name 
        AND pg_namespace.nspname = 'public'
    );
END;
$$ LANGUAGE plpgsql;

-- 添加执行权限
GRANT EXECUTE ON FUNCTION public.check_function_exists(TEXT) TO anon, authenticated, service_role;

-- 使用示例
-- SELECT * FROM check_function_exists('check_columns'); 