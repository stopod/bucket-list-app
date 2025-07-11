# ユーザーフローシーケンス図 - 開発者向け詳細版

このドキュメントでは、バケットリストアプリケーションの主要なユーザーフローを、具体的な関数名・ファイルパス・実装詳細を含めたシーケンス図で説明します。

## 1. ログインからダッシュボード表示

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Route as Dashboard Route<br/>(app/routes/dashboard/dashboard.tsx)
    participant Hook as useResultOperation<br/>(app/shared/hooks/use-result-operation.ts)
    participant Service as BucketListService<br/>(app/features/bucket-list/services/bucket-list.service.ts)
    participant Repo as Repository<br/>(app/features/bucket-list/repositories/bucket-list.repository.ts)
    participant BL as BusinessLogic<br/>(app/features/bucket-list/lib/business-logic.ts)
    participant Auth as Supabase Auth
    participant DB as Supabase Database

    User->>Route: /dashboard アクセス
    Route->>Auth: getUser() で認証状態チェック
    
    alt 未認証の場合
        Auth-->>Route: null (未認証)
        Route->>User: /auth/login へリダイレクト
        User->>Route: ログイン後 /dashboard へ戻る
    else 認証済みの場合
        Auth-->>Route: User オブジェクト
    end
    
    Route->>Hook: useResultOperation() でダッシュボードデータ取得
    Hook->>Service: getDashboardData(repository)(profileId)
    Service->>Repo: findAllWithCategory(filters?, sort?)
    Repo->>DB: SELECT * FROM bucket_items<br/>LEFT JOIN categories ON bucket_items.category_id = categories.id<br/>WHERE bucket_items.profile_id = $1
    DB-->>Repo: Result<BucketItemWithCategory[], BucketListError>
    Repo-->>Service: 項目データ（カテゴリ付き）
    
    Service->>Repo: findAllCategories()
    Repo->>DB: SELECT * FROM categories ORDER BY name
    DB-->>Repo: Result<Category[], BucketListError>
    Repo-->>Service: カテゴリデータ
    
    Service->>BL: calculateUserStats(items)
    BL-->>Service: UserBucketStats
    Service->>BL: getRecentlyCompletedItems(items, 5)
    BL-->>Service: 最近完了したアイテム
    Service->>BL: getUpcomingItems(items, 30, 5)
    BL-->>Service: 期限が近いアイテム
    Service->>BL: groupItemsByCategory(items, categories)
    BL-->>Service: カテゴリ別グループ化データ
    
    Service-->>Hook: Result<DashboardData, BucketListError>
    Hook-->>Route: { data, loading, error, execute }
    Route->>User: ダッシュボード表示
```

## 2. やりたいこと項目の新規作成

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Route as Add Route<br/>(app/routes/bucket-list/add.tsx)
    participant Hook as useResultOperation<br/>(app/shared/hooks/use-result-operation.ts)
    participant Service as createBucketItem<br/>(app/features/bucket-list/services/bucket-list.service.ts)
    participant BL as BusinessLogic<br/>(app/features/bucket-list/lib/business-logic.ts)
    participant Repo as Repository<br/>(app/features/bucket-list/repositories/bucket-list.repository.ts)
    participant DB as Supabase Database

    User->>Route: /bucket-list/add アクセス
    Route->>User: BucketItemForm コンポーネント表示
    User->>Route: 項目情報入力（title, description, category, priority, etc.）
    User->>Route: 「作成」ボタンクリック
    
    Route->>Route: フォームバリデーション（Zod schema）
    
    alt バリデーション成功
        Route->>Hook: useResultOperation().execute()
        Hook->>Service: createBucketItem(repository)(insertData)
        Service->>BL: validateBucketItemInsert(insertData)
        BL->>BL: タイトル必須チェック（200文字以内）
        BL->>BL: 説明文字数チェック（1000文字以内）
        BL->>BL: 優先度・ステータス・期限形式チェック
        
        alt ビジネスロジック検証成功
            BL-->>Service: Result<Success<BucketItemInsert>>
            Service->>Repo: create(validatedData)
            Repo->>DB: INSERT INTO bucket_items<br/>(title, description, category_id, priority, status, due_date, due_type, is_public, profile_id, created_at, updated_at)<br/>VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())<br/>RETURNING *
            DB-->>Repo: Result<BucketItem, PostgrestError>
            Repo-->>Service: Result<Success<BucketItem>, BucketListError>
            Service-->>Hook: Result<Success<BucketItem>, BucketListError>
            Hook-->>Route: { data: BucketItem, loading: false, error: null }
            Route->>User: 成功メッセージ表示
            Route->>Route: navigate('/bucket-list') でリスト画面へ
        else ビジネスロジック検証失敗
            BL-->>Service: Result<Failure<ValidationError>>
            Service-->>Hook: Result<Failure<ValidationError>>
            Hook-->>Route: { data: null, loading: false, error: ValidationError }
            Route->>User: バリデーションエラーメッセージ表示
        end
    else フォームバリデーション失敗
        Route->>User: フォームエラーメッセージ表示
    end
```

## 3. 項目の編集・更新

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Route as Edit Route<br/>(app/routes/bucket-list/edit.$id.tsx)
    participant Hook as useResultOperation<br/>(app/shared/hooks/use-result-operation.ts)
    participant Service as updateBucketItem<br/>(app/features/bucket-list/services/bucket-list.service.ts)
    participant BL as BusinessLogic<br/>(app/features/bucket-list/lib/business-logic.ts)
    participant Repo as Repository<br/>(app/features/bucket-list/repositories/bucket-list.repository.ts)
    participant DB as Supabase Database

    User->>Route: /bucket-list/edit/$id アクセス
    Route->>Hook: useResultOperation().execute() で項目取得
    Hook->>Repo: findById(id)
    Repo->>DB: SELECT * FROM bucket_items WHERE id = $1
    DB-->>Repo: Result<BucketItem | null, PostgrestError>
    Repo-->>Hook: Result<BucketItem | null, BucketListError>
    Hook-->>Route: { data: BucketItem, loading: false, error: null }
    Route->>User: 編集フォーム表示（既存データ入力済み）
    
    User->>Route: 項目情報編集（title, description, priority, etc.）
    User->>Route: 「更新」ボタンクリック
    
    Route->>Route: フォームバリデーション（Zod schema）
    
    alt バリデーション成功
        Route->>Hook: useResultOperation().execute()
        Hook->>Service: updateBucketItem(repository)(id, updateData)
        Service->>Repo: findById(id) で既存項目取得
        Repo->>DB: SELECT * FROM bucket_items WHERE id = $1
        DB-->>Repo: Result<BucketItem | null, PostgrestError>
        Repo-->>Service: Result<BucketItem | null, BucketListError>
        
        alt 項目が存在する場合
            Service->>BL: canEditCompletedItem(existingItem)
            BL->>BL: 完了済みアイテムの編集可否チェック
            
            alt 編集可能な場合
                BL-->>Service: Result<Success<boolean>>
                Service->>BL: validateBucketItemUpdate(updateData)
                BL->>BL: タイトル空文字チェック
                BL->>BL: 説明文字数チェック（1000文字以内）
                BL->>BL: 優先度・ステータス・期限形式チェック
                
                alt ビジネスロジック検証成功
                    BL-->>Service: Result<Success<BucketItemUpdate>>
                    Service->>Repo: update(id, mergedData)
                    Repo->>DB: UPDATE bucket_items<br/>SET title = $1, description = $2, priority = $3, status = $4, due_date = $5, updated_at = NOW()<br/>WHERE id = $6<br/>RETURNING *
                    DB-->>Repo: Result<BucketItem, PostgrestError>
                    Repo-->>Service: Result<Success<BucketItem>, BucketListError>
                    Service-->>Hook: Result<Success<BucketItem>, BucketListError>
                    Hook-->>Route: { data: BucketItem, loading: false, error: null }
                    Route->>User: 成功メッセージ表示
                    Route->>Route: navigate('/bucket-list') でリスト画面へ
                else ビジネスロジック検証失敗
                    BL-->>Service: Result<Failure<ValidationError>>
                    Service-->>Hook: Result<Failure<ValidationError>>
                    Hook-->>Route: { data: null, loading: false, error: ValidationError }
                    Route->>User: バリデーションエラーメッセージ表示
                end
            else 編集不可能な場合
                BL-->>Service: Result<Failure<BusinessRuleError>>
                Service-->>Hook: Result<Failure<BusinessRuleError>>
                Hook-->>Route: { data: null, loading: false, error: BusinessRuleError }
                Route->>User: 「完了済みアイテムは編集できません」メッセージ表示
            end
        else 項目が存在しない場合
            Service->>Service: createNotFoundError() 生成
            Service-->>Hook: Result<Failure<NotFoundError>>
            Hook-->>Route: { data: null, loading: false, error: NotFoundError }
            Route->>User: 「項目が見つかりません」メッセージ表示
        end
    else フォームバリデーション失敗
        Route->>User: フォームエラーメッセージ表示
    end
```

## 4. 項目のステータス変更（完了マーク）

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant List as BucketList Component<br/>(app/routes/bucket-list/bucket-list.tsx)
    participant Hook as useResultOperation<br/>(app/shared/hooks/use-result-operation.ts)
    participant Service as completeBucketItem<br/>(app/features/bucket-list/services/bucket-list.service.ts)
    participant BL as BusinessLogic<br/>(app/features/bucket-list/lib/business-logic.ts)
    participant Repo as Repository<br/>(app/features/bucket-list/repositories/bucket-list.repository.ts)
    participant DB as Supabase Database

    User->>List: ステータス変更ボタンクリック（完了マーク）
    List->>Hook: useResultOperation().execute()
    Hook->>Service: completeBucketItem(repository)(id, completionComment?)
    Service->>Repo: findById(id) で現在の項目取得
    Repo->>DB: SELECT * FROM bucket_items WHERE id = $1
    DB-->>Repo: Result<BucketItem | null, PostgrestError>
    Repo-->>Service: Result<BucketItem | null, BucketListError>
    
    alt 項目が存在する場合
        Service->>BL: canEditCompletedItem(existingItem)
        BL->>BL: 完了済みアイテムの編集可否チェック
        
        alt 編集可能な場合
            BL-->>Service: Result<Success<boolean>>
            Service->>Service: 完了データ生成<br/>{ status: "completed", completed_at: new Date().toISOString(), completion_comment: comment || null }
            Service->>BL: validateBucketItemUpdate(completionData)
            BL->>BL: ステータス・完了日時・コメントのバリデーション
            
            alt バリデーション成功
                BL-->>Service: Result<Success<BucketItemUpdate>>
                Service->>Repo: update(id, mergedCompletionData)
                Repo->>DB: UPDATE bucket_items<br/>SET status = 'completed', completed_at = $1, completion_comment = $2, updated_at = NOW()<br/>WHERE id = $3<br/>RETURNING *
                DB-->>Repo: Result<BucketItem, PostgrestError>
                Repo-->>Service: Result<Success<BucketItem>, BucketListError>
                Service-->>Hook: Result<Success<BucketItem>, BucketListError>
                Hook-->>List: { data: BucketItem, loading: false, error: null }
                List->>List: UI状態更新（進捗バー、完了マーク表示）
                List->>User: 「完了しました！」成功メッセージ + 視覚的フィードバック
            else バリデーション失敗
                BL-->>Service: Result<Failure<ValidationError>>
                Service-->>Hook: Result<Failure<ValidationError>>
                Hook-->>List: { data: null, loading: false, error: ValidationError }
                List->>User: バリデーションエラーメッセージ表示
            end
        else 編集不可能な場合（既に完了済み）
            BL-->>Service: Result<Failure<BusinessRuleError>>
            Service-->>Hook: Result<Failure<BusinessRuleError>>
            Hook-->>List: { data: null, loading: false, error: BusinessRuleError }
            List->>User: 「この項目は既に完了済みです」メッセージ表示
        end
    else 項目が存在しない場合
        Service->>Service: createNotFoundError() 生成
        Service-->>Hook: Result<Failure<NotFoundError>>
        Hook-->>List: { data: null, loading: false, error: NotFoundError }
        List->>User: 「項目が見つかりません」メッセージ表示
    end
```

## 5. 項目の削除

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant List as BucketList Component<br/>(app/routes/bucket-list/bucket-list.tsx)
    participant Dialog as DeleteConfirmation<br/>(app/features/bucket-list/components/delete-confirmation-dialog.tsx)
    participant Hook as useResultOperation<br/>(app/shared/hooks/use-result-operation.ts)
    participant Service as deleteBucketItem<br/>(app/features/bucket-list/services/bucket-list.service.ts)
    participant Repo as Repository<br/>(app/features/bucket-list/repositories/bucket-list.repository.ts)
    participant DB as Supabase Database

    User->>List: 項目の「削除」ボタンクリック
    List->>Dialog: DeleteConfirmationDialog 表示
    Dialog->>User: 「本当に削除しますか？」確認ダイアログ
    User->>Dialog: 「削除」ボタンクリック
    
    Dialog->>Hook: useResultOperation().execute()
    Hook->>Service: deleteBucketItem(repository)(id)
    Service->>Repo: delete(id)
    Repo->>DB: DELETE FROM bucket_items WHERE id = $1
    DB-->>Repo: Result<void, PostgrestError>
    Repo-->>Service: Result<Success<void>, BucketListError>
    Service-->>Hook: Result<Success<void>, BucketListError>
    Hook-->>Dialog: { data: undefined, loading: false, error: null }
    Dialog->>List: onDeleteSuccess() コールバック実行
    List->>List: 項目リストから削除（状態更新）
    List->>User: 「削除しました」成功メッセージ表示
    Dialog->>Dialog: ダイアログを閉じる
    
    alt 削除に失敗した場合
        DB-->>Repo: Result<void, PostgrestError>
        Repo-->>Service: Result<Failure<DatabaseError>, BucketListError>
        Service-->>Hook: Result<Failure<DatabaseError>, BucketListError>
        Hook-->>Dialog: { data: null, loading: false, error: DatabaseError }
        Dialog->>User: 「削除に失敗しました」エラーメッセージ表示
    end
```

## 6. 検索・フィルタリング

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant List as BucketList Component<br/>(app/routes/bucket-list/bucket-list.tsx)
    participant Hook as useResultOperation<br/>(app/shared/hooks/use-result-operation.ts)
    participant Service as getUserBucketItems<br/>(app/features/bucket-list/services/bucket-list.service.ts)
    participant Repo as Repository<br/>(app/features/bucket-list/repositories/bucket-list.repository.ts)
    participant DB as Supabase Database

    User->>List: 検索キーワード入力（SearchInput）
    List->>List: デバウンス処理（300ms）
    
    alt 検索実行
        List->>Hook: useResultOperation().execute()
        Hook->>Service: getUserBucketItems(repository)(profileId, { search: query }, sort)
        Service->>Repo: findByProfileId(profileId, { search: query }, sort)
        Repo->>DB: SELECT * FROM bucket_items<br/>WHERE profile_id = $1<br/>AND (title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')<br/>ORDER BY created_at DESC
        DB-->>Repo: Result<BucketItem[], PostgrestError>
        Repo-->>Service: Result<Success<BucketItem[]>, BucketListError>
        Service-->>Hook: Result<Success<BucketItem[]>, BucketListError>
        Hook-->>List: { data: BucketItem[], loading: false, error: null }
        List->>User: 検索結果表示（フィルタリング済み項目）
    end
    
    User->>List: カテゴリフィルタ選択（CategoryFilter）
    List->>Hook: useResultOperation().execute()
    Hook->>Service: getUserBucketItems(repository)(profileId, { category_id: selectedCategory }, sort)
    Service->>Repo: findByProfileId(profileId, { category_id: selectedCategory }, sort)
    Repo->>DB: SELECT * FROM bucket_items<br/>WHERE profile_id = $1 AND category_id = $2<br/>ORDER BY created_at DESC
    DB-->>Repo: Result<BucketItem[], PostgrestError>
    Repo-->>Service: Result<Success<BucketItem[]>, BucketListError>
    Service-->>Hook: Result<Success<BucketItem[]>, BucketListError>
    Hook-->>List: { data: BucketItem[], loading: false, error: null }
    List->>User: カテゴリ別項目表示
    
    User->>List: 複合フィルタ（優先度 + ステータス + 検索）
    List->>Hook: useResultOperation().execute()
    Hook->>Service: getUserBucketItems(repository)(profileId, { priority: "high", status: "not_started", search: "旅行" }, sort)
    Service->>Repo: findByProfileId(profileId, complexFilters, sort)
    Repo->>DB: SELECT * FROM bucket_items<br/>WHERE profile_id = $1<br/>AND priority = $2 AND status = $3<br/>AND (title ILIKE '%' || $4 || '%' OR description ILIKE '%' || $4 || '%')<br/>ORDER BY created_at DESC
    DB-->>Repo: Result<BucketItem[], PostgrestError>
    Repo-->>Service: Result<Success<BucketItem[]>, BucketListError>
    Service-->>Hook: Result<Success<BucketItem[]>, BucketListError>
    Hook-->>List: { data: BucketItem[], loading: false, error: null }
    List->>User: 複合フィルタ結果表示
```

## 7. 公開リスト閲覧

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Route as Public Route<br/>(app/routes/public/public.tsx)
    participant Hook as useResultOperation<br/>(app/shared/hooks/use-result-operation.ts)
    participant Service as getPublicBucketItems<br/>(app/features/bucket-list/services/bucket-list.service.ts)
    participant Repo as Repository<br/>(app/features/bucket-list/repositories/bucket-list.repository.ts)
    participant DB as Supabase Database

    User->>Route: /public ページアクセス
    Route->>Hook: useResultOperation().execute()
    Hook->>Service: getPublicBucketItems(repository)()
    Service->>Repo: findPublic()
    Repo->>DB: SELECT bucket_items.*, categories.name as category_name, categories.color as category_color<br/>FROM bucket_items<br/>LEFT JOIN categories ON bucket_items.category_id = categories.id<br/>WHERE bucket_items.is_public = true<br/>ORDER BY bucket_items.created_at DESC
    DB-->>Repo: Result<BucketItemWithCategory[], PostgrestError>
    Repo-->>Service: Result<Success<BucketItemWithCategory[]>, BucketListError>
    Service-->>Hook: Result<Success<BucketItemWithCategory[]>, BucketListError>
    Hook-->>Route: { data: BucketItemWithCategory[], loading: false, error: null }
    Route->>User: 公開リスト表示（カテゴリ情報付き）
    
    User->>Route: 特定項目の詳細表示（DetailDialogボタンクリック）
    Route->>Hook: useResultOperation().execute()
    Hook->>Service: getBucketItem(repository)(id)
    Service->>Repo: findById(id)
    Repo->>DB: SELECT bucket_items.*, categories.name as category_name, categories.color as category_color<br/>FROM bucket_items<br/>LEFT JOIN categories ON bucket_items.category_id = categories.id<br/>WHERE bucket_items.id = $1 AND bucket_items.is_public = true
    DB-->>Repo: Result<BucketItemWithCategory | null, PostgrestError>
    Repo-->>Service: Result<Success<BucketItemWithCategory | null>, BucketListError>
    Service-->>Hook: Result<Success<BucketItemWithCategory | null>, BucketListError>
    Hook-->>Route: { data: BucketItemWithCategory, loading: false, error: null }
    Route->>User: BucketItemDetailDialog 表示（詳細情報）
    
    alt 非公開項目または存在しない項目の場合
        DB-->>Repo: Result<null, PostgrestError>
        Repo-->>Service: Result<Success<null>, BucketListError>
        Service-->>Hook: Result<Success<null>, BucketListError>
        Hook-->>Route: { data: null, loading: false, error: null }
        Route->>User: 「項目が見つかりません」メッセージ表示
    end
    
    User->>Route: 検索・フィルタリング（公開リスト内）
    Route->>Hook: useResultOperation().execute()
    Hook->>Service: getPublicBucketItems(repository)(filters)
    Service->>Repo: findPublic(filters)
    Repo->>DB: SELECT bucket_items.*, categories.name as category_name, categories.color as category_color<br/>FROM bucket_items<br/>LEFT JOIN categories ON bucket_items.category_id = categories.id<br/>WHERE bucket_items.is_public = true<br/>AND (title ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')<br/>ORDER BY bucket_items.created_at DESC
    DB-->>Repo: Result<BucketItemWithCategory[], PostgrestError>
    Repo-->>Service: Result<Success<BucketItemWithCategory[]>, BucketListError>
    Service-->>Hook: Result<Success<BucketItemWithCategory[]>, BucketListError>
    Hook-->>Route: { data: BucketItemWithCategory[], loading: false, error: null }
    Route->>User: フィルタリング済み公開リスト表示
```

## アーキテクチャ特徴

### Result型エラーハンドリング

全てのService層およびRepository層では、Result<T, E>型を使用した型安全なエラーハンドリングを実装しています：

- **成功時**: `Result<Success<T>>` - `{ success: true, data: T }`
- **失敗時**: `Result<Failure<E>>` - `{ success: false, error: E }`

**定義場所**: `app/shared/types/result.ts`

**使用例**:
```typescript
// Service層での使用
const result = await createBucketItem(repository)(insertData);
if (isSuccess(result)) {
  // result.data: BucketItem
} else {
  // result.error: BucketListError
}

// Repository層での使用
const dbResult = await supabase.from('bucket_items').select('*');
return dbResult.error 
  ? failure(createDatabaseError(dbResult.error.message))
  : success(dbResult.data);
```

### 関数型プログラミング

Service層は完全に関数型で実装されており、以下の特徴があります：

- **純粋関数による副作用の分離**: ビジネスロジックは `business-logic.ts` に集約
- **関数合成とコンビネーターの活用**: `combineResults()` 等のヘルパー関数使用
- **不変性の原則**: 全ての操作で新しいオブジェクトを返す
- **カリー化**: `createBucketItem(repository)(data)` のような関数構成

**実装例**:
```typescript
// カリー化された関数型Service
export const createBucketItem = 
  (repository: FunctionalBucketListRepository) =>
  async (data: BucketItemInsert): Promise<Result<BucketItem, BucketListError>> => {
    const validationResult = validateBucketItemInsert(data);
    if (isFailure(validationResult)) return validationResult;
    
    return repository.create(validationResult.data);
  };
```

### Hooks による状態管理

`useResultOperation` hooks により、非同期操作の状態管理を統一：

- **loading**: 非同期処理中の状態
- **error**: エラー状態（BucketListError型）
- **data**: 成功時のデータ
- **execute**: 非同期処理実行関数

**実装場所**: `app/shared/hooks/use-result-operation.ts`

### SSR対応

React Router v7によるServer-Side Renderingにより、初期ページロード時のデータ取得が最適化されています。

**Route定義**: `app/routes/` 配下の各ファイル

## エラーハンドリングパターン

各フローで発生する可能性のあるエラーとその対処：

### 1. 認証エラー (AuthenticationError)
```typescript
// app/shared/types/errors.ts
interface AuthenticationError {
  type: "AuthenticationError";
  message: string;
  reason: "invalid_credentials" | "token_expired" | "insufficient_permissions" | "user_not_found";
}
```
**対処**: 自動ログイン画面へリダイレクト

### 2. バリデーションエラー (ValidationError)
```typescript
interface ValidationError {
  type: "ValidationError";
  field: string;
  message: string;
  code?: string;
}
```
**対処**: フォーム上にエラーメッセージ表示

### 3. データベースエラー (DatabaseError)
```typescript
interface DatabaseError {
  type: "DatabaseError";
  message: string;
  code?: string;
  operation?: "create" | "read" | "update" | "delete";
}
```
**対処**: 適切なエラーメッセージとリトライ機能

### 4. ビジネスルールエラー (BusinessRuleError)
```typescript
interface BusinessRuleError {
  type: "BusinessRuleError";
  rule: string;
  message: string;
  context?: Record<string, unknown>;
}
```
**対処**: ビジネスルール違反の説明とガイダンス

### 5. リソース未発見エラー (NotFoundError)
```typescript
interface NotFoundError {
  type: "NotFoundError";
  resource: string;
  id?: string;
  message: string;
}
```
**対処**: 「項目が見つかりません」メッセージ表示

## パフォーマンス最適化

### 1. デバウンス処理
```typescript
// 検索入力での不要なAPI呼び出し削減
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useCallback(
  debounce((term: string) => {
    execute(getUserBucketItems(repository)(profileId, { search: term }));
  }, 300),
  [execute, repository, profileId]
);
```

### 2. Result型による効率的なエラーハンドリング
```typescript
// 複数の非同期操作の結果をまとめて処理
const results = await Promise.all([
  repository.findAllWithCategory(),
  repository.findAllCategories()
]);

const combinedResult = combineResults(results);
if (isSuccess(combinedResult)) {
  // 全て成功時の処理
}
```

### 3. 適切なSQL最適化
```sql
-- インデックスを活用した効率的なクエリ
SELECT bucket_items.*, categories.name as category_name 
FROM bucket_items 
LEFT JOIN categories ON bucket_items.category_id = categories.id 
WHERE bucket_items.profile_id = $1 
  AND bucket_items.is_public = true 
ORDER BY bucket_items.created_at DESC;
```

## 開発者向けデバッグ情報

### 1. Result型のデバッグ
```typescript
// Result型の詳細ログ出力
const result = await someOperation();
console.log('Operation result:', {
  success: isSuccess(result),
  data: isSuccess(result) ? result.data : null,
  error: isFailure(result) ? result.error : null
});
```

### 2. 非同期操作の状態監視
```typescript
// useResultOperation の状態監視
const { loading, error, data } = useResultOperation();
console.log('Hook state:', { loading, error: error?.type, hasData: !!data });
```

### 3. SQL クエリのデバッグ
Supabase のログやブラウザの Network タブでクエリの実行状況を確認可能。

## 関連ファイル

- **Service層**: `app/features/bucket-list/services/bucket-list.service.ts`
- **Repository層**: `app/features/bucket-list/repositories/bucket-list.repository.ts`
- **Business Logic**: `app/features/bucket-list/lib/business-logic.ts`
- **Error Types**: `app/shared/types/errors.ts`
- **Result Types**: `app/shared/types/result.ts`
- **Hooks**: `app/shared/hooks/use-result-operation.ts`
- **Routes**: `app/routes/` 配下の各ファイル