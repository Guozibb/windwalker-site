-- ============================================================
-- 风之旅人 · Supabase 数据库 Schema
-- 使用方式：在 Supabase SQL Editor 中粘贴此文件全部内容 → 点 Run
-- ============================================================

-- ========== 1. profiles（用户资料 + 原 windwalker_accounts/windwalker_profile） ==========
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 16),
  bio           TEXT DEFAULT '',
  avatar_url    TEXT DEFAULT '',
  user_code     TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ========== 2. follows（关注关系：原 windwalker_social.following/followers） ==========
CREATE TABLE follows (
  follower_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- ========== 3. friend_requests（好友请求） ==========
CREATE TABLE friend_requests (
  from_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (from_id, to_id),
  CHECK (from_id <> to_id)
);

-- ========== 4. friendships（好友关系） ==========
CREATE TABLE friendships (
  user_a_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

-- ========== 5. messages（私信：原 windwalker_messages） ==========
CREATE TABLE messages (
  id          BIGSERIAL PRIMARY KEY,
  from_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text        TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages(from_id, to_id, created_at);

-- ========== 6. community_posts（社区帖子：原 windwalker_community） ==========
CREATE TABLE community_posts (
  id          BIGSERIAL PRIMARY KEY,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text        TEXT DEFAULT '',
  media_url   TEXT DEFAULT '',
  media_type  TEXT DEFAULT NULL CHECK (media_type IS NULL OR media_type IN ('image', 'video')),
  likes_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_community_posts_time ON community_posts(created_at DESC);

-- ========== 7. post_likes（帖子点赞） ==========
CREATE TABLE post_likes (
  post_id     BIGINT REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ========== 8. post_comments（帖子评论） ==========
CREATE TABLE post_comments (
  id          BIGSERIAL PRIMARY KEY,
  post_id     BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text        TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at);

-- ========== 9. notifications（通知：原 windwalker_notifs） ==========
CREATE TABLE notifications (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'message', 'friend')),
  from_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  text          TEXT DEFAULT '',
  read          BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ========== 10. uploads（作品上传：原 IndexedDB + windwalker_upload_meta） ==========
CREATE TABLE uploads (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT DEFAULT '作者作品',
  sub_category  TEXT DEFAULT '',
  file_type     TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'model')),
  file_url      TEXT NOT NULL,
  cover_url     TEXT DEFAULT '',
  file_name     TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_uploads_user ON uploads(user_id, created_at DESC);

-- ========== 11. item_likes（画廊点赞：原 wa_likes） ==========
CREATE TABLE item_likes (
  item_id     TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

-- ========== 12. item_bookmarks（画廊收藏：原 wa_bookmarks） ==========
CREATE TABLE item_bookmarks (
  item_id     TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

-- ========== 13. item_comments（画廊评论：原 wa_comments） ==========
CREATE TABLE item_comments (
  id          BIGSERIAL PRIMARY KEY,
  item_id     TEXT NOT NULL,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_item_comments_item ON item_comments(item_id, created_at);

-- ========== 14. item_views（画廊浏览量） ==========
CREATE TABLE item_views (
  item_id     TEXT NOT NULL,
  views       INTEGER DEFAULT 0,
  PRIMARY KEY (item_id)
);

-- ============================================================
-- RLS 策略（行级安全）
-- ============================================================

-- === profiles ===
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles 公开可读" ON profiles FOR SELECT USING (true);
CREATE POLICY "用户创建自己的资料" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "用户更新自己的资料" ON profiles FOR UPDATE USING (id = auth.uid());

-- === follows ===
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "关注关系公开可读" ON follows FOR SELECT USING (true);
CREATE POLICY "用户创建自己的关注" ON follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "用户取消自己的关注" ON follows FOR DELETE USING (follower_id = auth.uid());

-- === friend_requests ===
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户查看自己收发的好友请求" ON friend_requests FOR SELECT
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "用户发送好友请求" ON friend_requests FOR INSERT WITH CHECK (from_id = auth.uid());
CREATE POLICY "接收者可以接受/拒绝请求" ON friend_requests FOR UPDATE USING (to_id = auth.uid());
CREATE POLICY "双方可以删除请求" ON friend_requests FOR DELETE
  USING (from_id = auth.uid() OR to_id = auth.uid());

-- === friendships ===
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "好友关系公开可读" ON friendships FOR SELECT USING (true);
CREATE POLICY "用户创建自己参与的好友关系" ON friendships FOR INSERT
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- === messages ===
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户查看自己的消息" ON messages FOR SELECT
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "用户发送消息" ON messages FOR INSERT WITH CHECK (from_id = auth.uid());

-- === community_posts ===
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "帖子公开可读" ON community_posts FOR SELECT USING (true);
CREATE POLICY "用户发帖" ON community_posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "用户删除自己的帖" ON community_posts FOR DELETE USING (author_id = auth.uid());

-- === post_likes ===
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "点赞公开可读" ON post_likes FOR SELECT USING (true);
CREATE POLICY "用户点赞" ON post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "用户取消点赞" ON post_likes FOR DELETE USING (user_id = auth.uid());

-- === post_comments ===
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "评论公开可读" ON post_comments FOR SELECT USING (true);
CREATE POLICY "用户评论" ON post_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "用户删除自己的评论" ON post_comments FOR DELETE USING (author_id = auth.uid());
CREATE POLICY "帖主可删除评论" ON post_comments FOR DELETE
  USING (EXISTS (SELECT 1 FROM community_posts WHERE id = post_comments.post_id AND author_id = auth.uid()));

-- === notifications ===
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户查看自己的通知" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "可创建通知" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "用户标记已读" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- === uploads ===
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "作品公开可读" ON uploads FOR SELECT USING (true);
CREATE POLICY "用户上传作品" ON uploads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "用户删除自己的作品" ON uploads FOR DELETE USING (user_id = auth.uid());

-- === item_likes ===
ALTER TABLE item_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "画廊点赞公开可读" ON item_likes FOR SELECT USING (true);
CREATE POLICY "用户点赞" ON item_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "用户取消画廊点赞" ON item_likes FOR DELETE USING (user_id = auth.uid());

-- === item_bookmarks ===
ALTER TABLE item_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "收藏公开可读" ON item_bookmarks FOR SELECT USING (true);
CREATE POLICY "用户收藏" ON item_bookmarks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "用户取消收藏" ON item_bookmarks FOR DELETE USING (user_id = auth.uid());

-- === item_comments ===
ALTER TABLE item_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "画廊评论公开可读" ON item_comments FOR SELECT USING (true);
CREATE POLICY "用户添加画廊评论" ON item_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "用户删除自己的画廊评论" ON item_comments FOR DELETE USING (author_id = auth.uid());

-- === item_views ===
ALTER TABLE item_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "浏览量公开可读" ON item_views FOR SELECT USING (true);
CREATE POLICY "任何人可新增浏览量" ON item_views FOR INSERT WITH CHECK (true);
CREATE POLICY "任何人可更新浏览量" ON item_views FOR UPDATE USING (true);

-- ============================================================
-- 辅助函数：生成 6 位唯一数字码
-- ============================================================
CREATE OR REPLACE FUNCTION generate_user_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    BEGIN
      -- 确保不重复
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_code = new_code) THEN
        RETURN new_code;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 触发器：新用户注册时自动填充 user_code
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, user_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)),
    generate_user_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 在 auth.users 上创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
