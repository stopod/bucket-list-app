# データベース設計 実装ガイド

## 📋 概要

- **目的**: Supabase PostgreSQL を使用したデータベース設計・運用
- **対象読者**: 開発者、DBA、アーキテクト
- **前提知識**: PostgreSQL, Supabase, RLS (Row Level Security)
- **推定作業時間**: 6-8時間

## 🏗 アーキテクチャ

### 設計思想

- **セキュリティファースト**: RLS による行レベルセキュリティ
- **正規化**: データ整合性を重視した設計
- **パフォーマンス**: 適切なインデックス設計
- **拡張性**: 将来の機能拡張を考慮

### 主要テーブル

- **profiles**: ユーザープロフィール情報
- **categories**: やりたいことのカテゴリ
- **bucket_items**: やりたいこと項目
- **user_bucket_stats**: ユーザー統計情報（ビュー）

### データフロー

```
[User Registration] → [profiles]
                          ↓
[Create Bucket Item] → [bucket_items] → [categories]
                          ↓
[Statistics] ← [user_bucket_stats (view)]
```

## 💻 実装詳細

### 基本実装

#### 1. profiles テーブル

```sql
-- ユーザープロフィール情報
-- auth.users の代替として使用（RLS回避）
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- インデックス
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- RLS 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 2. categories テーブル

```sql
-- やりたいことのカテゴリ
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280', -- hex color
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約
  CONSTRAINT categories_name_check CHECK (LENGTH(name) >= 1),
  CONSTRAINT categories_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- 初期データ投入
INSERT INTO categories (name, color, description) VALUES
('旅行・観光', '#3B82F6', '国内外の旅行、観光地巡り'),
('スキル習得・学習', '#10B981', '新しい技能や知識の習得'),
('体験・チャレンジ', '#F59E0B', '新しい体験や挑戦'),
('人間関係', '#EC4899', '友人・家族・恋愛関係'),
('健康・フィットネス', '#84CC16', '健康管理・運動・美容'),
('創作・芸術', '#8B5CF6', '創作活動・芸術鑑賞'),
('キャリア・仕事', '#DC2626', '仕事・キャリア・起業'),
('狂気', '#1F2937', '普通では考えられない体験'),
('その他', '#6B7280', 'その他のやりたいこと');

-- パブリックアクセス許可
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
```

#### 3. bucket_items テーブル

```sql
-- やりたいこと項目
CREATE TABLE bucket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  due_date DATE,
  due_type VARCHAR(20) CHECK (due_type IN ('specific_date', 'this_year', 'next_year', 'unspecified')),
  is_public BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completion_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約
  CONSTRAINT bucket_items_title_check CHECK (LENGTH(title) >= 1),
  CONSTRAINT bucket_items_completion_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- インデックス作成
CREATE INDEX idx_bucket_items_profile_id ON bucket_items(profile_id);
CREATE INDEX idx_bucket_items_category_id ON bucket_items(category_id);
CREATE INDEX idx_bucket_items_status ON bucket_items(status);
CREATE INDEX idx_bucket_items_priority ON bucket_items(priority);
CREATE INDEX idx_bucket_items_is_public ON bucket_items(is_public);
CREATE INDEX idx_bucket_items_created_at ON bucket_items(created_at);

-- RLS ポリシー（現在は無効化、アプリケーション層で制御）
-- ALTER TABLE bucket_items ENABLE ROW LEVEL SECURITY;
```

#### 4. user_bucket_stats ビュー

```sql
-- ユーザー統計情報ビュー
CREATE VIEW user_bucket_stats AS
SELECT
  p.id as profile_id,
  p.display_name,
  COUNT(b.id) as total_items,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_items,
  COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) as in_progress_items,
  COUNT(CASE WHEN b.status = 'not_started' THEN 1 END) as not_started_items,
  CASE
    WHEN COUNT(b.id) = 0 THEN 0
    ELSE ROUND(
      (COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::numeric / COUNT(b.id)::numeric) * 100,
      1
    )
  END as completion_rate
FROM profiles p
LEFT JOIN bucket_items b ON p.id = b.profile_id
GROUP BY p.id, p.display_name;

-- ビューへのアクセス許可
GRANT SELECT ON user_bucket_stats TO authenticated;
```

### 設定手順

#### 1. Supabase プロジェクト作成

1. [Supabase](https://supabase.com) でプロジェクト作成
2. データベースURL・APIキーを取得
3. 環境変数に設定

#### 2. テーブル作成

```bash
# SQL Editor で上記のSQL文を順次実行
# または migration ファイルとして管理
```

#### 3. RLS ポリシー設定

```sql
-- 必要に応じてRLSポリシーを調整
-- 現在は bucket_items のRLSは無効化（実用性重視）
```

### 高度な実装

#### パフォーマンス最適化

```sql
-- 複合インデックス
CREATE INDEX idx_bucket_items_profile_status ON bucket_items(profile_id, status);
CREATE INDEX idx_bucket_items_public_category ON bucket_items(is_public, category_id) WHERE is_public = true;

-- 統計情報更新
ANALYZE bucket_items;
ANALYZE profiles;
ANALYZE categories;
```

#### データアーカイブ戦略

```sql
-- 完了から1年経過した項目のアーカイブ
CREATE TABLE bucket_items_archive (LIKE bucket_items INCLUDING ALL);

-- アーカイブ関数
CREATE OR REPLACE FUNCTION archive_old_completed_items()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH archived AS (
    DELETE FROM bucket_items
    WHERE status = 'completed'
      AND completed_at < NOW() - INTERVAL '1 year'
    RETURNING *
  )
  INSERT INTO bucket_items_archive SELECT * FROM archived;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

## 🧪 テスト

### テスト戦略

- **スキーマテスト**: テーブル構造・制約の確認
- **パフォーマンステスト**: クエリ実行時間測定
- **データ整合性テスト**: 制約・トリガーの動作確認

### サンプルテスト

```sql
-- データ整合性テスト
DO $$
BEGIN
  -- 無効な status でエラーになることを確認
  BEGIN
    INSERT INTO bucket_items (profile_id, category_id, title, status)
    VALUES ('00000000-0000-0000-0000-000000000000', 1, 'Test', 'invalid_status');
    RAISE EXCEPTION 'Should have failed with invalid status';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'Status constraint working correctly';
  END;

  -- completed_at と status の整合性確認
  BEGIN
    INSERT INTO bucket_items (profile_id, category_id, title, status, completed_at)
    VALUES ('00000000-0000-0000-0000-000000000000', 1, 'Test', 'not_started', NOW());
    RAISE EXCEPTION 'Should have failed with completion constraint';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'Completion constraint working correctly';
  END;
END $$;
```

## 🔧 トラブルシューティング

### よくある問題

#### 問題1: RLS ポリシーでアクセス拒否

**原因**: 不適切なRLSポリシー設定
**解決方法**:

```sql
-- ポリシー確認
SELECT * FROM pg_policies WHERE tablename = 'bucket_items';

-- ポリシー削除・再作成
DROP POLICY IF EXISTS "policy_name" ON bucket_items;
CREATE POLICY "new_policy" ON bucket_items FOR SELECT USING (auth.uid() = profile_id);
```

#### 問題2: パフォーマンスの劣化

**原因**: インデックス不足・統計情報の古さ
**解決方法**:

```sql
-- 実行計画確認
EXPLAIN ANALYZE SELECT * FROM bucket_items WHERE profile_id = 'uuid';

-- インデックス使用状況確認
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- 統計情報更新
ANALYZE;
```

#### 問題3: 外部キー制約エラー

**原因**: 参照整合性違反
**解決方法**:

```sql
-- 孤立レコード確認
SELECT b.* FROM bucket_items b
LEFT JOIN profiles p ON b.profile_id = p.id
WHERE p.id IS NULL;

-- データクリーンアップ
DELETE FROM bucket_items WHERE profile_id NOT IN (SELECT id FROM profiles);
```

### デバッグ方法

```sql
-- ログレベル設定
SET log_statement = 'all';
SET log_min_duration_statement = 1000; -- 1秒以上のクエリをログ

-- 現在の接続・ロック確認
SELECT * FROM pg_stat_activity WHERE state = 'active';
SELECT * FROM pg_locks WHERE NOT granted;
```

## 📚 参考資料

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**更新履歴**

- 2025-01-11: 初版作成 (Development Team)
- table_definition_doc.md を基に包括的ガイド化
