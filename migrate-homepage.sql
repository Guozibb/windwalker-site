-- ============================================================
-- 风之旅人 · 自定义主页 + 置顶代表作 + 领域认证
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pinned_works TEXT DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certified_title TEXT DEFAULT '';
