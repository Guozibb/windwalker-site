-- ============================================================
-- 风之旅人 · 垂直分类体系迁移
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- uploads 表新增 4 个筛选字段
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS format TEXT DEFAULT '';
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS poly_count TEXT DEFAULT '';
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS license TEXT DEFAULT 'free';
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS software TEXT DEFAULT '';

-- 验证
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'uploads' AND column_name IN ('format','poly_count','license','software');
