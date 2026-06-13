-- ============================================================
-- 风之旅人 · 积分系统 RLS 绕过函数
-- 问题：RLS 仅允许用户更新自己的 profiles，导致积分无法跨用户写入
-- 解决：SECURITY DEFINER 函数以数据库所有者身份运行，绕过 RLS
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. 确保 points 列存在
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. 确保 is_creator 列存在
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT false;

-- 3. 积分操作函数（安全定义者，绕过 RLS，防刷分：积分不低于0）
CREATE OR REPLACE FUNCTION add_points(p_username TEXT, p_amount INT)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET points = GREATEST(0, COALESCE(points, 0) + p_amount)
    WHERE username = p_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 验证
SELECT username, points, is_creator FROM profiles WHERE is_creator = true LIMIT 5;
