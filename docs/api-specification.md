# 🔌 API仕様書

> **バケットリストアプリケーションのAPI仕様とインターフェース定義**

## 📋 概要

このドキュメントは、バケットリストアプリケーションのAPI仕様を定義しています。

### API設計方針

- **RESTful設計**: HTTPメソッドとリソースベースのURL設計
- **型安全性**: TypeScript による厳密な型定義
- **エラーハンドリング**: 統一されたエラーレスポンス形式
- **認証**: Supabase Auth による JWT ベース認証
- **Result型**: 関数型プログラミングによる安全なエラーハンドリング

## 🛡️ 認証

### 認証方式

- **JWT Bearer Token**: Supabase Auth による認証
- **Cookie認証**: SSR対応のセッション管理

### 認証フロー

```typescript
// 認証済みクライアントの取得
const authResult = await getServerAuth(request);
if (!authResult.isAuthenticated) {
  // 認証失敗時の処理
  return redirect('/login');
}

// 認証済みSupabaseクライアントの作成
const supabaseClient = await createAuthenticatedSupabaseClient(authResult);
```

## 📊 データ型定義

### 基本型

```typescript
// 優先度
type Priority = "high" | "medium" | "low";

// ステータス
type Status = "not_started" | "in_progress" | "completed";

// 期限タイプ
type DueType = "specific_date" | "this_year" | "next_year" | "unspecified";
```

### バケットリスト項目

```typescript
// バケットリスト項目（データベースから取得）
interface BucketItem {
  id: string;
  title: string;
  description: string | null;
  category_id: number;
  priority: Priority;
  status: Status;
  is_public: boolean;
  due_date: string | null;
  due_type: DueType | null;
  profile_id: string;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  completion_comment: string | null;
}

// 新規作成用
interface BucketItemInsert {
  title: string;
  description?: string;
  category_id: number;
  priority: Priority;
  status?: Status;
  is_public?: boolean;
  due_date?: string | null;
  due_type?: DueType;
  profile_id: string;
}

// 更新用
interface BucketItemUpdate {
  title?: string;
  description?: string;
  category_id?: number;
  priority?: Priority;
  status?: Status;
  is_public?: boolean;
  due_date?: string | null;
  due_type?: DueType;
  completed_at?: string | null;
  completion_comment?: string | null;
}
```

### カテゴリ

```typescript
interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string | null;
}
```

### 統計情報

```typescript
interface UserBucketStats {
  profile_id: string | null;
  display_name: string | null;
  total_items: number | null;
  completed_items: number | null;
  in_progress_items: number | null;
  not_started_items: number | null;
  completion_rate: number | null;
}
```

## 🔄 Result型によるエラーハンドリング

### Result型定義

```typescript
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };

// 成功時の作成
const success = <T>(data: T): Result<T, never> => ({ success: true, data });

// 失敗時の作成
const failure = <E>(error: E): Result<never, E> => ({ success: false, error });
```

### エラー型

```typescript
interface BucketListError {
  type: "ValidationError" | "DatabaseError" | "AuthenticationError" | 
        "NotFoundError" | "ConflictError" | "NetworkError" | 
        "BusinessRuleError" | "ApplicationError";
  message: string;
  field?: string;
  code?: string;
  context?: Record<string, unknown>;
}
```

## 🎯 Service Layer API

### バケットリスト項目操作

#### 項目取得（ユーザー別）

```typescript
getUserBucketItems(
  profileId: string,
  filters?: BucketListFilters,
  sort?: BucketListSort
): Promise<Result<BucketItem[], BucketListError>>
```

**パラメータ**:
- `profileId`: ユーザーID
- `filters`: フィルター条件（オプション）
- `sort`: ソート条件（オプション）

**レスポンス**:
```typescript
// 成功時
{
  success: true,
  data: BucketItem[]
}

// 失敗時
{
  success: false,
  error: {
    type: "DatabaseError",
    message: "データベースエラーが発生しました",
    code: "DB_CONNECTION_ERROR"
  }
}
```

#### 項目取得（カテゴリ情報付き）

```typescript
getUserBucketItemsWithCategory(
  profileId: string,
  filters?: BucketListFilters,
  sort?: BucketListSort
): Promise<Result<(BucketItem & { category: Category })[], BucketListError>>
```

#### 項目取得（ID指定）

```typescript
getBucketItem(id: string): Promise<Result<BucketItem, BucketListError>>
```

#### 項目作成

```typescript
createBucketItem(
  data: BucketItemInsert
): Promise<Result<BucketItem, BucketListError>>
```

**バリデーション**:
- `title`: 必須、1-200文字
- `description`: オプション、最大1000文字
- `category_id`: 必須、存在するカテゴリID
- `priority`: 必須、有効な優先度
- `profile_id`: 必須、認証済みユーザーID

#### 項目更新

```typescript
updateBucketItem(
  id: string,
  data: BucketItemUpdate
): Promise<Result<BucketItem, BucketListError>>
```

**ビジネスルール**:
- 完了済み項目の編集制限
- 所有者チェック
- 更新権限の確認

#### 項目完了

```typescript
completeBucketItem(
  id: string,
  comment?: string
): Promise<Result<BucketItem, BucketListError>>
```

**自動設定**:
- `status`: "completed"
- `completed_at`: 現在日時
- `completion_comment`: 指定されたコメント

#### 項目削除

```typescript
deleteBucketItem(id: string): Promise<Result<void, BucketListError>>
```

### カテゴリ操作

#### カテゴリ一覧取得

```typescript
getCategories(): Promise<Result<Category[], BucketListError>>
```

#### カテゴリ取得（ID指定）

```typescript
getCategory(id: number): Promise<Result<Category, BucketListError>>
```

### 統計情報

#### ユーザー統計取得

```typescript
getUserStats(profileId: string): Promise<Result<UserBucketStats, BucketListError>>
```

#### ダッシュボードデータ取得

```typescript
getDashboardData(profileId: string): Promise<Result<{
  items: (BucketItem & { category: Category })[];
  categories: Category[];
  stats: UserBucketStats;
  itemsByCategory: Array<{
    category: Category;
    items: (BucketItem & { category: Category })[];
  }>;
  recentCompletedItems: BucketItem[];
  upcomingItems: BucketItem[];
}, BucketListError>>
```

## 🌐 HTTP Routes

### 認証必須ルート

#### ダッシュボード

```
GET /dashboard
```

**レスポンス**: HTML（SSR）
**データ**: `getDashboardData()` の結果

#### バケットリスト一覧

```
GET /bucket-list
```

**クエリパラメータ**:
- `search`: 検索キーワード
- `category`: カテゴリID
- `priority`: 優先度
- `status`: ステータス

#### 項目追加

```
GET /bucket-list/add
POST /bucket-list/add
```

**POST データ**:
```typescript
{
  title: string;
  description?: string;
  category_id: number;
  priority: Priority;
  status?: Status;
  due_date?: string;
  due_type?: DueType;
  is_public: boolean;
}
```

#### 項目編集

```
GET /bucket-list/edit/:id
POST /bucket-list/edit/:id
```

#### 項目削除

```
POST /bucket-list/delete/:id
```

### 認証不要ルート

#### 公開リスト

```
GET /public
```

**クエリパラメータ**:
- `search`: 検索キーワード
- `category`: カテゴリID

#### 認証

```
GET /auth/login
POST /auth/login
GET /auth/register
POST /auth/register
```

## 🔍 フィルター・ソート仕様

### フィルター条件

```typescript
interface BucketListFilters {
  profile_id?: string;
  category_id?: number;
  priority?: Priority;
  status?: Status;
  is_public?: boolean;
  search?: string;
}
```

### ソート条件

```typescript
interface BucketListSort {
  field: "created_at" | "updated_at" | "due_date" | "title" | "priority";
  direction: "asc" | "desc";
}
```

## 🛠️ 開発者向けAPI使用例

### 基本的な使用パターン

```typescript
// サービスの作成
const functionalService = createAuthenticatedFunctionalBucketListService(
  authenticatedSupabase,
  authResult.user!.id
);

// 項目の取得
const itemsResult = await functionalService.getUserBucketItems(
  authResult.user!.id,
  { category_id: 1, status: "in_progress" },
  { field: "created_at", direction: "desc" }
);

// Result型の処理
if (isSuccess(itemsResult)) {
  const items = itemsResult.data;
  // 成功時の処理
} else {
  const error = itemsResult.error;
  // エラー時の処理
  console.error(`${error.type}: ${error.message}`);
}
```

### エラーハンドリングパターン

```typescript
const handleBucketListError = (error: BucketListError) => {
  switch (error.type) {
    case "ValidationError":
      // バリデーションエラー
      showFieldError(error.field, error.message);
      break;
    case "NotFoundError":
      // 404エラー
      showNotFoundMessage();
      break;
    case "AuthenticationError":
      // 認証エラー
      redirectToLogin();
      break;
    default:
      // その他のエラー
      showGenericError(error.message);
  }
};
```

## 📊 パフォーマンス考慮事項

### 最適化戦略

1. **並列処理**: 複数のAPI呼び出しを並列実行
2. **キャッシュ**: 頻繁にアクセスされるデータのキャッシュ
3. **ページネーション**: 大量データの分割取得
4. **インデックス**: データベースクエリの最適化

### 使用例

```typescript
// 並列処理
const [itemsResult, categoriesResult, statsResult] = await Promise.all([
  functionalService.getUserBucketItems(profileId),
  functionalService.getCategories(),
  functionalService.getUserStats(profileId)
]);
```

## 🔒 セキュリティ考慮事項

### 認証・認可

- **JWT検証**: 全てのAPIリクエストでJWTトークンを検証
- **所有者チェック**: ユーザーが自分のデータのみアクセス可能
- **RLS**: Supabase Row Level Security による追加保護

### 入力検証

- **型チェック**: TypeScript による静的型チェック
- **スキーマ検証**: Zodスキーマによる実行時検証
- **サニタイゼーション**: XSS対策の入力値処理

## 🧪 テスト

### API テスト戦略

```typescript
// 成功ケース
it("有効なデータでバケットリスト項目を作成できること", async () => {
  const validData: BucketItemInsert = {
    title: "テスト項目",
    category_id: 1,
    priority: "high",
    profile_id: "test-user-id"
  };

  const result = await createBucketItem(mockRepository)(validData);
  
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.data.title).toBe("テスト項目");
  }
});

// エラーケース
it("無効なデータの場合ValidationErrorが返されること", async () => {
  const invalidData = { title: "" }; // 必須フィールド不足

  const result = await createBucketItem(mockRepository)(invalidData);
  
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error.type).toBe("ValidationError");
  }
});
```

## 📅 バージョン管理

### APIバージョニング

- **現在のバージョン**: v1.0.0
- **互換性**: 後方互換性の維持
- **変更管理**: セマンティックバージョニング

### 変更履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| v1.0.0 | 2025-01-16 | 初版リリース |

---

**📅 最終更新**: 2025-01-16  
**✍️ 更新者**: Development Team  
**🔄 次回見直し**: 機能追加時