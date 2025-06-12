-- ダッシュボードデータ取得問題のデバッグ用SQL

-- 1. 全ユーザーと項目数の確認
SELECT 
  p.id as profile_id,
  p.email,
  COUNT(b.id) as total_items,
  COUNT(CASE WHEN b.due_date IS NOT NULL THEN 1 END) as items_with_due_date
FROM profiles p
LEFT JOIN bucket_items b ON p.id = b.profile_id
GROUP BY p.id, p.email
ORDER BY total_items DESC;

-- 2. 最近作成された項目の確認
SELECT 
  b.id,
  b.profile_id,
  b.title,
  b.due_date,
  b.due_type,
  b.status,
  b.created_at,
  c.name as category_name
FROM bucket_items b
LEFT JOIN categories c ON b.category_id = c.id
ORDER BY b.created_at DESC
LIMIT 10;

-- 3. 期限がある項目の詳細確認
SELECT 
  b.id,
  b.profile_id,
  b.title,
  b.due_date,
  b.due_type,
  b.status,
  CASE 
    WHEN b.due_date IS NOT NULL AND b.due_date >= CURRENT_DATE AND b.due_date <= CURRENT_DATE + INTERVAL '30 days' 
    THEN 'upcoming'
    ELSE 'not_upcoming'
  END as is_upcoming,
  c.name as category_name
FROM bucket_items b
LEFT JOIN categories c ON b.category_id = c.id
WHERE b.due_date IS NOT NULL
ORDER BY b.due_date ASC;

-- 4. 今日から30日以内の期限がある項目のカウント
SELECT 
  COUNT(*) as upcoming_items_count,
  COUNT(CASE WHEN b.status != 'completed' THEN 1 END) as upcoming_non_completed
FROM bucket_items b
WHERE b.due_date IS NOT NULL 
  AND b.due_date >= CURRENT_DATE 
  AND b.due_date <= CURRENT_DATE + INTERVAL '30 days';