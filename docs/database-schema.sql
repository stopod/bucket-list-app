-- バケットリストアプリ用データベーススキーマ
-- Supabase PostgreSQL用
-- 注意: auth.users参照は非推奨のため、profilesテーブルのIDを使用

-- プロファイルテーブル（既存前提）
-- CREATE TABLE profiles (
--   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
--   email TEXT,
--   display_name TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- カテゴリマスターテーブル
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL, -- HEXカラーコード (#FF5733など)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- カテゴリ初期データ
INSERT INTO categories (name, color) VALUES
  ('旅行・観光', '#3B82F6'),
  ('スキル習得・学習', '#10B981'),
  ('体験・チャレンジ', '#F59E0B'),
  ('人間関係', '#EF4444'),
  ('健康・フィットネス', '#8B5CF6'),
  ('創作・芸術', '#EC4899'),
  ('キャリア・仕事', '#6B7280'),
  ('狂気', '#DC2626'),
  ('その他', '#9CA3AF');

-- バケットリスト項目テーブル
CREATE TABLE bucket_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  due_date DATE,
  due_type VARCHAR(20) CHECK (due_type IN ('specific_date', 'this_year', 'next_year', 'unspecified')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) の設定
ALTER TABLE bucket_items ENABLE ROW LEVEL SECURITY;

-- 自分のデータは全てアクセス可能（auth.uid()とprofiles.idの関連付け）
CREATE POLICY "Users can manage their own bucket items" ON bucket_items
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE id = bucket_items.profile_id
    )
  );

-- 公開されているデータは認証済みユーザーが閲覧可能
CREATE POLICY "Public bucket items are viewable by authenticated users" ON bucket_items
  FOR SELECT TO authenticated USING (is_public = true);

-- カテゴリテーブルのRLS設定
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- カテゴリテーブルは認証済みユーザーが閲覧可能
CREATE POLICY "Categories are viewable by authenticated users" ON categories
  FOR SELECT TO authenticated USING (true);

-- インデックスの作成
CREATE INDEX idx_bucket_items_profile_id ON bucket_items(profile_id);
CREATE INDEX idx_bucket_items_category_id ON bucket_items(category_id);
CREATE INDEX idx_bucket_items_status ON bucket_items(status);
CREATE INDEX idx_bucket_items_priority ON bucket_items(priority);
CREATE INDEX idx_bucket_items_is_public ON bucket_items(is_public);
CREATE INDEX idx_bucket_items_created_at ON bucket_items(created_at DESC);
CREATE INDEX idx_bucket_items_due_date ON bucket_items(due_date);

-- 統計用ビュー（profilesテーブルとJOIN）
-- ViewはRLSが適用されないため、基礎テーブルのRLSポリシーが適用される
CREATE VIEW user_bucket_stats AS
SELECT 
  bi.profile_id,
  p.display_name,
  COUNT(*) as total_items,
  COUNT(CASE WHEN bi.status = 'completed' THEN 1 END) as completed_items,
  COUNT(CASE WHEN bi.status = 'in_progress' THEN 1 END) as in_progress_items,
  COUNT(CASE WHEN bi.status = 'not_started' THEN 1 END) as not_started_items,
  ROUND(
    COUNT(CASE WHEN bi.status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 
    1
  ) as completion_rate
FROM bucket_items bi
LEFT JOIN profiles p ON bi.profile_id = p.id
GROUP BY bi.profile_id, p.display_name;