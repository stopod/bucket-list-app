# 実装ガイド - 新規参加者向け

## 目的

このプロジェクトに新規参加する開発者が、機能追加時に適切な実装方針を理解し、一貫したコードを書けるようになるためのガイド。

## 基本思想

### 関数型プログラミングアプローチ

このプロジェクトは **完全に関数型アプローチ** で実装されています：

- **Result型によるエラーハンドリング**: `Result<T, E>` で型安全なエラー処理
- **カリー化された関数**: 依存性注入とテスタビリティを両立
- **純粋関数**: 副作用のないビジネスロジック
- **関数合成**: 小さな関数を組み合わせて複雑な処理を構築

> 詳細なアーキテクチャ: [architecture.md](./architecture.md)

## 機能追加時の実装パターン

### 1. Service層の実装

**実際のコード例**: `app/features/bucket-list/services/bucket-list.service.ts`

```typescript
// ✅ カリー化された関数でService実装
export const createBucketItem =
  (repository: FunctionalBucketListRepository) =>
  async (insertData: BucketItemInsert): Promise<Result<BucketItem, BucketListError>> => {
    // 1. ビジネスロジック関数による検証
    const validationResult = validateBucketItemInsert(insertData);
    if (isFailure(validationResult)) {
      return validationResult;
    }

    // 2. Repository呼び出し
    return repository.create(validationResult.data);
  };

// ✅ 関数をオブジェクトとして束ねる
export const createFunctionalBucketListService = (
  repository: FunctionalBucketListRepository
) => ({
  createBucketItem: createBucketItem(repository),
  updateBucketItem: updateBucketItem(repository),
  // ... 他の操作
});
```

### 2. Repository層の実装

**実際のコード例**: `app/features/bucket-list/repositories/bucket-list.repository.ts`

```typescript
// ✅ 関数型Repository
export const createFunctionalBucketListRepository = (
  supabase: SupabaseClient<Database>
): FunctionalBucketListRepository => ({
  
  create: async (data: BucketItemInsert): Promise<Result<BucketItem, BucketListError>> => {
    const { data: result, error } = await supabase
      .from("bucket_items")
      .insert(data)
      .select()
      .single();

    if (error) {
      return failure(createDatabaseError("CREATE_FAILED", error.message));
    }

    return success(result);
  },
  
  // ... 他の操作
});
```

### 3. ビジネスロジック層の実装

**実際のコード例**: `app/features/bucket-list/lib/business-logic.ts`

```typescript
// ✅ 純粋関数でビジネスロジック
export const validateBucketItemInsert = (
  data: BucketItemInsert
): Result<BucketItemInsert, BucketListError> => {
  if (!data.title?.trim()) {
    return failure(createValidationError("TITLE_REQUIRED", "タイトルは必須です"));
  }

  if (data.title.length > 200) {
    return failure(createValidationError("TITLE_TOO_LONG", "タイトルが長すぎます"));
  }

  // ✅ 成功時はそのまま返す
  return success(data);
};

// ✅ 関数合成による複雑な処理
export const calculateProgress = (items: BucketItem[]): number => {
  const completed = items.filter(item => item.status === 'completed').length;
  return items.length === 0 ? 0 : Math.round((completed / items.length) * 100);
};
```

### 4. Service Factory（依存性注入）

**実際のコード例**: `app/features/bucket-list/lib/service-factory.ts`

```typescript
// ✅ 関数合成による依存性注入
export function createAuthenticatedBucketListService(
  supabase: SupabaseClient<Database>
) {
  const repository = createFunctionalBucketListRepository(supabase);
  return createFunctionalBucketListService(repository);
}
```

## SSRでの使用パターン

**実際のコード例**: `app/routes/dashboard/dashboard.tsx`

```typescript
export async function loader({ request }: Route.LoaderArgs) {
  // 1. 認証チェック
  const authResult = await getServerAuth(request);
  if (!authResult.isAuthenticated) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  // 2. Service作成
  const authenticatedSupabase = await createAuthenticatedSupabaseClient(authResult);
  const functionalService = createAuthenticatedBucketListService(authenticatedSupabase);

  // 3. データ取得（Result型）
  const dashboardDataResult = await functionalService.getDashboardData(authResult.user!.id);

  // 4. エラーハンドリング
  if (isFailure(dashboardDataResult)) {
    throw new Response("Failed to load dashboard data", { status: 500 });
  }

  return json({ data: dashboardDataResult.data });
}
```

## 新機能追加の手順

### Step 1: 型定義

```typescript
// features/新機能/types.ts
export type NewFeatureItem = {
  id: string;
  name: string;
  // ... 必要なフィールド
};

export type NewFeatureInsert = Omit<NewFeatureItem, 'id'>;
export type NewFeatureUpdate = Partial<NewFeatureInsert>;
```

### Step 2: ビジネスロジック

```typescript
// features/新機能/lib/business-logic.ts
export const validateNewFeatureInsert = (
  data: NewFeatureInsert
): Result<NewFeatureInsert, ValidationError> => {
  // バリデーションロジック
};
```

### Step 3: Repository

```typescript
// features/新機能/repositories/new-feature.repository.ts
export const createNewFeatureRepository = (supabase: SupabaseClient<Database>) => ({
  create: async (data: NewFeatureInsert): Promise<Result<NewFeatureItem, DatabaseError>> => {
    // DB操作
  },
  // ... 他の操作
});
```

### Step 4: Service

```typescript
// features/新機能/services/new-feature.service.ts
export const createNewFeatureItem =
  (repository: NewFeatureRepository) =>
  async (data: NewFeatureInsert): Promise<Result<NewFeatureItem, NewFeatureError>> => {
    // ビジネスロジック + Repository呼び出し
  };
```

### Step 5: Service Factory

```typescript
// features/新機能/lib/service-factory.ts
export const createAuthenticatedNewFeatureService = (supabase: SupabaseClient<Database>) => {
  const repository = createNewFeatureRepository(supabase);
  return createNewFeatureService(repository);
};
```

## テストの書き方

**実際のテスト例**: `app/features/bucket-list/services/__tests__/bucket-list.service.test.ts`

```typescript
describe("createBucketItem", () => {
  it("有効なデータの場合、Result<Success>で新しい項目が返されること", async () => {
    const mockRepository = createMockRepository();
    const service = createBucketItem(mockRepository);
    
    const result = await service(validInsertData);
    
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data).toEqual(expectedItem);
    }
  });

  it("無効なデータの場合、Result<Failure>で返されること", async () => {
    const mockRepository = createMockRepository();
    const service = createBucketItem(mockRepository);
    
    const result = await service(invalidInsertData);
    
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ValidationError");
    }
  });
});
```

## 重要な原則

### ❌ 避けるべきパターン

```typescript
// ❌ クラスベースの実装
export class BucketListService {
  async createItem(data: BucketItemInsert) {
    // ...
  }
}

// ❌ try-catch での例外処理
export async function createItem(data: BucketItemInsert) {
  try {
    // ...
  } catch (error) {
    throw new Error("Failed");
  }
}
```

### ✅ 推奨パターン

```typescript
// ✅ 関数型 + Result型
export const createItem =
  (repository: Repository) =>
  async (data: BucketItemInsert): Promise<Result<BucketItem, BucketListError>> => {
    // Result型でエラーハンドリング
  };
```

## 関連ドキュメント

- **アーキテクチャ詳細**: [architecture.md](./architecture.md)
- **認証システム**: [authentication.md](./authentication.md)
- **Result型の詳細**: `app/shared/types/result.ts`
- **エラー型の定義**: `app/shared/types/errors.ts`

---

**重要**: このプロジェクトは一貫して関数型アプローチで実装されています。新機能追加時もこのパターンに従ってください。