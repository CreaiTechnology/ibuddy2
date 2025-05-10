-- teams表创建脚本
-- 可以在Supabase Studio的SQL编辑器中运行此脚本

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- 使用UUID作为主键
  name VARCHAR(255) NOT NULL,                      -- 团队名称
  colour VARCHAR(50) DEFAULT '#cccccc',            -- 团队颜色
  max_overlap INTEGER DEFAULT 1,                   -- 团队最大重叠预约数
  members JSONB DEFAULT '[]'::jsonb,               -- 团队成员（JSON数组）
  status VARCHAR(20) DEFAULT 'active',             -- 团队状态
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),  -- 创建时间
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()   -- 更新时间
);

-- 创建RLS策略（行级安全）
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 创建公共访问策略（示例，根据实际需求调整）
CREATE POLICY "允许公共读取团队" 
  ON public.teams 
  FOR SELECT 
  USING (true);

CREATE POLICY "允许认证用户管理团队" 
  ON public.teams 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- 添加测试数据
INSERT INTO public.teams (name, colour, max_overlap, members, status) 
VALUES 
  ('Team A1', '#e91e63', 2, '["Alex", "Bob", "Charlie"]', 'active'),
  ('Team A2', '#009688', 3, '["David", "Emma", "Frank", "Grace"]', 'active');

-- 创建更新updated_at的触发器
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_timestamp
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE PROCEDURE update_timestamp(); 