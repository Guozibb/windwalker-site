-- ============================================================
-- 风之旅人 · 管理员系统迁移
-- 使用方式：在 Supabase SQL Editor 中粘贴此文件全部内容 → 点 Run
--
-- 前置步骤：先在 login.html 注册管理员账号（用户名用 admin）
--   再回来执行此 SQL，把该账号设为管理员
-- ============================================================

-- 1. 添加 is_admin 字段到 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. 设置 admin 用户为管理员（确认已先注册 admin 账号）
UPDATE profiles SET is_admin = true WHERE username = 'admin';

-- ============================================================
-- 3. 管理员 RLS 策略 — 管理员可以删除任何内容
-- ============================================================

-- 检查当前用户是否为管理员的辅助函数
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- === uploads（作品） — 管理员可删除任何作品 ===
DROP POLICY IF EXISTS "管理员可删除任何作品" ON uploads;
CREATE POLICY "管理员可删除任何作品" ON uploads FOR DELETE
  USING (is_admin_user());

-- === item_comments（画廊评论） — 管理员可删除任何评论 ===
DROP POLICY IF EXISTS "管理员可删除任何画廊评论" ON item_comments;
CREATE POLICY "管理员可删除任何画廊评论" ON item_comments FOR DELETE
  USING (is_admin_user());

-- === post_comments（帖子评论） — 管理员可删除任何评论 ===
DROP POLICY IF EXISTS "管理员可删除任何帖子评论" ON post_comments;
CREATE POLICY "管理员可删除任何帖子评论" ON post_comments FOR DELETE
  USING (is_admin_user());

-- === community_posts（社区帖子） — 管理员可删除任何帖子 ===
DROP POLICY IF EXISTS "管理员可删除任何帖子" ON community_posts;
CREATE POLICY "管理员可删除任何帖子" ON community_posts FOR DELETE
  USING (is_admin_user());

-- === messages（私信） — 管理员可删除任何私信（清理骚扰） ===
DROP POLICY IF EXISTS "管理员可删除任何私信" ON messages;
CREATE POLICY "管理员可删除任何私信" ON messages FOR DELETE
  USING (is_admin_user());

-- ============================================================
-- 4. 验证
-- ============================================================
SELECT username, is_admin FROM profiles WHERE username = 'admin';
