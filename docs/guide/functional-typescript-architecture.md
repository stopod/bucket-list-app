# 関数型TypeScriptアーキテクチャガイド

このガイドは、Claude Codeが関数型プログラミングとClean Architectureを組み合わせたTypeScriptアプリケーションを構築するための完全な指針を提供します。

## 🏗️ アーキテクチャ概要

### 基本思想

1. **関数型ファースト**: 純粋関数、不変性、関数合成を重視
2. **型安全性**: TypeScriptの型システムを最大限活用
3. **Result型**: 例外に依存しない型安全なエラーハンドリング
4. **Repository Pattern**: データアクセス層の抽象化
5. **Dependency Injection**: Factory Patternによる依存関係の管理

### レイヤー構成

```
app/
├── features/[feature-name]/
│   ├── components/          # Presentation Layer (React Components)
│   ├── services/            # Application Service Layer
│   │   ├── [feature]-service.ts              # 従来型Service（段階的移行用）
│   │   └── functional-[feature]-service.ts   # 関数型Service（推奨）
│   ├── repositories/        # Infrastructure Layer
│   │   ├── [feature]-repository.ts           # Repository Interface
│   │   └── supabase-[feature]-repository.ts  # Concrete Implementation
│   ├── lib/                 # Domain Logic & Utilities
│   │   ├── business-logic.ts    # 純粋なビジネスロジック関数
│   │   ├── schemas.ts           # Validation Schemas
│   │   └── repository-factory.ts # DI Factory
│   ├── hooks/               # Custom React Hooks
│   └── types.ts             # Domain Types
└── shared/
    ├── types/
    │   ├── result.ts        # Result<T, E> Type Definition
    │   ├── errors.ts        # Domain Error Types
    │   └── database.ts      # Database Schema Types
    ├── utils/
    │   └── result-helpers.ts # Result Operation Helpers
    └── hooks/
        └── use-result-operation.ts # Result-aware React Hooks
```

## 🔧 Result型によるエラーハンドリング

### Result型の定義

Claude Codeは以下のResult型を使用してください：

```typescript
// shared/types/result.ts
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

export interface Failure<E> {
  readonly success: false;
  readonly error: E;
}

// Type Guards
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> =>
  result.success === true;

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> =>
  result.success === false;

// Constructors
export const success = <T>(data: T): Success<T> => ({
  success: true,
  data,
});

export const failure = <E>(error: E): Failure<E> => ({
  success: false,
  error,
});
```

### エラー型の定義

```typescript
// shared/types/errors.ts
export interface DomainError {
  readonly type: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ValidationError extends DomainError {
  readonly type: 'ValidationError';
  readonly field?: string;
}

export interface NotFoundError extends DomainError {
  readonly type: 'NotFoundError';
  readonly resource: string;
  readonly id: string;
}

export interface DatabaseError extends DomainError {
  readonly type: 'DatabaseError';
  readonly operation: string;
}

// Error Constructors
export const validationError = (
  message: string,
  field?: string,
  details?: Record<string, unknown>
): ValidationError => ({
  type: 'ValidationError',
  message,
  field,
  details,
});

export const notFoundError = (
  resource: string,
  id: string,
  message?: string
): NotFoundError => ({
  type: 'NotFoundError',
  resource,
  id,
  message: message || `${resource} with id ${id} not found`,
});

export const databaseError = (
  operation: string,
  message: string,
  details?: Record<string, unknown>
): DatabaseError => ({
  type: 'DatabaseError',
  operation,
  message,
  details,
});
```

## 🏛️ Repository Pattern実装

### Repository Interface

```typescript
// features/bucket-list/repositories/bucket-list-repository.ts
import { Result } from '../../../shared/types/result';
import { DomainError } from '../../../shared/types/errors';
import { BucketItem, BucketItemCreate, BucketItemUpdate } from '../types';

export interface BucketListRepository {
  findAll(userId: string): Promise<Result<BucketItem[], DomainError>>;
  findById(id: string, userId: string): Promise<Result<BucketItem, DomainError>>;
  create(item: BucketItemCreate): Promise<Result<BucketItem, DomainError>>;
  update(id: string, item: BucketItemUpdate): Promise<Result<BucketItem, DomainError>>;
  delete(id: string, userId: string): Promise<Result<void, DomainError>>;
}
```

### Concrete Implementation

```typescript
// features/bucket-list/repositories/supabase-bucket-list-repository.ts
import { supabase } from '../../../lib/supabase';
import { BucketListRepository } from './bucket-list-repository';
import { success, failure } from '../../../shared/types/result';
import { databaseError, notFoundError } from '../../../shared/types/errors';

export class SupabaseBucketListRepository implements BucketListRepository {
  async findAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('bucket_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return failure(databaseError('findAll', error.message));
      }

      return success(data || []);
    } catch (error) {
      return failure(databaseError('findAll', String(error)));
    }
  }

  async findById(id: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('bucket_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return failure(notFoundError('BucketItem', id));
        }
        return failure(databaseError('findById', error.message));
      }

      return success(data);
    } catch (error) {
      return failure(databaseError('findById', String(error)));
    }
  }

  // 他のメソッドも同様にResult型を返すよう実装
}
```

## 🔄 関数型Service Layer

### 純粋なビジネスロジック関数

```typescript
// features/bucket-list/lib/business-logic.ts
import { BucketItem, BucketItemCreate, Priority, Status } from '../types';
import { Result, success, failure } from '../../../shared/types/result';
import { ValidationError, validationError } from '../../../shared/types/errors';

// 純粋関数：バリデーション
export const validateBucketItemCreate = (
  data: Partial<BucketItemCreate>
): Result<BucketItemCreate, ValidationError> => {
  if (!data.title?.trim()) {
    return failure(validationError('Title is required', 'title'));
  }

  if (data.title.length > 200) {
    return failure(validationError('Title must be 200 characters or less', 'title'));
  }

  if (!data.category_id) {
    return failure(validationError('Category is required', 'category_id'));
  }

  return success({
    title: data.title.trim(),
    description: data.description?.trim() || '',
    category_id: data.category_id,
    priority: data.priority || 'medium',
    status: data.status || 'not_started',
    is_public: data.is_public || false,
    due_date: data.due_date || null,
    due_type: data.due_type || 'unspecified',
    user_id: data.user_id!,
  });
};

// 純粋関数：統計計算
export const calculateAchievementStats = (items: BucketItem[]) => {
  const total = items.length;
  const completed = items.filter(item => item.status === 'completed').length;
  const inProgress = items.filter(item => item.status === 'in_progress').length;
  const notStarted = items.filter(item => item.status === 'not_started').length;
  
  return {
    total,
    completed,
    inProgress,
    notStarted,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

// 純粋関数：フィルタリング
export const filterBucketItems = (
  items: BucketItem[],
  filters: {
    category?: string;
    status?: Status;
    priority?: Priority;
    search?: string;
  }
) => {
  return items.filter(item => {
    if (filters.category && item.category_id !== filters.category) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
};
```

### 関数型Service Layer

```typescript
// features/bucket-list/services/functional-bucket-list-service.ts
import { BucketListRepository } from '../repositories/bucket-list-repository';
import { Result, success, failure } from '../../../shared/types/result';
import { DomainError } from '../../../shared/types/errors';
import { BucketItem, BucketItemCreate, BucketItemUpdate } from '../types';
import { validateBucketItemCreate } from '../lib/business-logic';

// 高階関数：Repository依存のService関数を生成
export const createBucketItem = (repository: BucketListRepository) => 
  async (data: Partial<BucketItemCreate>): Promise<Result<BucketItem, DomainError>> => {
    // バリデーション
    const validationResult = validateBucketItemCreate(data);
    if (!validationResult.success) {
      return failure(validationResult.error);
    }

    // リポジトリ操作
    return await repository.create(validationResult.data);
  };

export const updateBucketItem = (repository: BucketListRepository) =>
  async (
    id: string,
    data: BucketItemUpdate,
    userId: string
  ): Promise<Result<BucketItem, DomainError>> => {
    // 存在確認
    const existingResult = await repository.findById(id, userId);
    if (!existingResult.success) {
      return failure(existingResult.error);
    }

    // 更新実行
    return await repository.update(id, data);
  };

export const deleteBucketItem = (repository: BucketListRepository) =>
  async (id: string, userId: string): Promise<Result<void, DomainError>> => {
    // 存在確認
    const existingResult = await repository.findById(id, userId);
    if (!existingResult.success) {
      return failure(existingResult.error);
    }

    // 削除実行
    return await repository.delete(id, userId);
  };

export const getAllBucketItems = (repository: BucketListRepository) =>
  async (userId: string): Promise<Result<BucketItem[], DomainError>> => {
    return await repository.findAll(userId);
  };

export const getBucketItemById = (repository: BucketListRepository) =>
  async (id: string, userId: string): Promise<Result<BucketItem, DomainError>> => {
    return await repository.findById(id, userId);
  };

// Service Factory：依存関係を注入したService関数群を返す
export const createBucketListService = (repository: BucketListRepository) => ({
  createItem: createBucketItem(repository),
  updateItem: updateBucketItem(repository),
  deleteItem: deleteBucketItem(repository),
  getAllItems: getAllBucketItems(repository),
  getItemById: getBucketItemById(repository),
});
```

## 🏭 Dependency Injection

### Repository Factory

```typescript
// features/bucket-list/lib/repository-factory.ts
import { BucketListRepository } from '../repositories/bucket-list-repository';
import { SupabaseBucketListRepository } from '../repositories/supabase-bucket-list-repository';

export const createBucketListRepository = (): BucketListRepository => {
  return new SupabaseBucketListRepository();
};
```

### Service Factory Integration

```typescript
// features/bucket-list/lib/service-factory.ts
import { createBucketListRepository } from './repository-factory';
import { createBucketListService } from '../services/functional-bucket-list-service';

export const createBucketListServiceInstance = () => {
  const repository = createBucketListRepository();
  return createBucketListService(repository);
};
```

## ⚛️ React Integration

### Result型対応Custom Hook

```typescript
// shared/hooks/use-result-operation.ts
import { useState, useCallback } from 'react';
import { Result, isSuccess, isFailure } from '../types/result';

export interface UseResultOperationState<T, E> {
  data: T | null;
  error: E | null;
  loading: boolean;
}

export const useResultOperation = <T, E>() => {
  const [state, setState] = useState<UseResultOperationState<T, E>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(
    async (operation: () => Promise<Result<T, E>>) => {
      setState({ data: null, error: null, loading: true });

      try {
        const result = await operation();

        if (isSuccess(result)) {
          setState({ data: result.data, error: null, loading: false });
          return result.data;
        } else {
          setState({ data: null, error: result.error, loading: false });
          throw result.error;
        }
      } catch (error) {
        const errorValue = error as E;
        setState({ data: null, error: errorValue, loading: false });
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.loading,
    hasError: state.error !== null,
    hasData: state.data !== null,
  };
};
```

### Component内での使用例

```typescript
// features/bucket-list/components/bucket-item-form.tsx
import React from 'react';
import { useResultOperation } from '../../../shared/hooks/use-result-operation';
import { createBucketListServiceInstance } from '../lib/service-factory';
import { BucketItem, BucketItemCreate } from '../types';
import { DomainError } from '../../../shared/types/errors';

export const BucketItemForm: React.FC = () => {
  const bucketListService = createBucketListServiceInstance();
  const createOperation = useResultOperation<BucketItem, DomainError>();

  const handleSubmit = async (formData: Partial<BucketItemCreate>) => {
    try {
      const createdItem = await createOperation.execute(() =>
        bucketListService.createItem(formData)
      );
      
      // 成功時の処理
      console.log('Item created:', createdItem);
    } catch (error) {
      // エラーは既にstateに設定されているため、UIで表示可能
      console.error('Failed to create item:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* フォーム要素 */}
      {createOperation.hasError && (
        <div className="error">
          Error: {createOperation.error?.message}
        </div>
      )}
      {createOperation.isLoading && <div>Creating...</div>}
    </form>
  );
};
```

## 🧪 テスト戦略

### Pure Function Testing

```typescript
// features/bucket-list/lib/__tests__/business-logic.test.ts
import { describe, it, expect } from 'vitest';
import { validateBucketItemCreate, calculateAchievementStats } from '../business-logic';
import { isSuccess, isFailure } from '../../../../shared/types/result';

describe('validateBucketItemCreate', () => {
  it('有効なデータの場合、Success<BucketItemCreate>が返されること', () => {
    const validData = {
      title: 'Test Item',
      category_id: 'category-1',
      user_id: 'user-1',
    };

    const result = validateBucketItemCreate(validData);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.title).toBe('Test Item');
      expect(result.data.priority).toBe('medium'); // デフォルト値
      expect(result.data.status).toBe('not_started'); // デフォルト値
    }
  });

  it('タイトルが空の場合、ValidationErrorが返されること', () => {
    const invalidData = {
      title: '',
      category_id: 'category-1',
      user_id: 'user-1',
    };

    const result = validateBucketItemCreate(invalidData);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe('ValidationError');
      expect(result.error.field).toBe('title');
    }
  });
});

describe('calculateAchievementStats', () => {
  it('空の配列の場合、適切な統計が返されること', () => {
    const result = calculateAchievementStats([]);

    expect(result).toEqual({
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionRate: 0,
    });
  });
});
```

### Service Function Testing

```typescript
// features/bucket-list/services/__tests__/functional-bucket-list-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createBucketItem } from '../functional-bucket-list-service';
import { BucketListRepository } from '../../repositories/bucket-list-repository';
import { success, failure } from '../../../../shared/types/result';
import { validationError } from '../../../../shared/types/errors';

describe('createBucketItem', () => {
  it('有効なデータの場合、新しいアイテムが作成されること', async () => {
    // Mock Repository
    const mockRepository: BucketListRepository = {
      create: vi.fn().mockResolvedValue(success({ id: '1', title: 'Test Item' })),
      // 他のメソッドもモック
    } as any;

    const createItemService = createBucketItem(mockRepository);
    
    const validData = {
      title: 'Test Item',
      category_id: 'category-1',
      user_id: 'user-1',
    };

    const result = await createItemService(validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Test Item');
    }
    expect(mockRepository.create).toHaveBeenCalledOnce();
  });

  it('無効なデータの場合、ValidationErrorが返されること', async () => {
    const mockRepository = {} as BucketListRepository;
    const createItemService = createBucketItem(mockRepository);

    const invalidData = { title: '' }; // 不完全なデータ

    const result = await createItemService(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('ValidationError');
    }
  });
});
```

## 📋 実装チェックリスト

Claude Codeは新機能実装時に以下をチェックしてください：

### ✅ アーキテクチャ遵守

- [ ] Repository Interfaceを定義
- [ ] Concrete Implementationを作成
- [ ] Result型を使用したエラーハンドリング
- [ ] 純粋関数としてビジネスロジックを実装
- [ ] 関数型Service Layerの採用
- [ ] Dependency Injectionの実装

### ✅ 型安全性

- [ ] すべての関数がResult型を返す
- [ ] エラー型が適切に定義されている
- [ ] TypeScriptの型チェックがパス
- [ ] 型ガードを使用した安全な分岐処理

### ✅ テスト

- [ ] 純粋関数のユニットテスト
- [ ] Service関数のテスト
- [ ] エラーケースのテスト
- [ ] 日本語でのテストケース記述

### ✅ 品質

- [ ] ESLintエラーなし
- [ ] Prettierフォーマット済み
- [ ] コードカバレッジ80%以上
- [ ] ビルドエラーなし

## 🔄 段階的移行戦略

### 既存コードの移行

1. **新機能**: 完全に関数型アプローチで実装
2. **既存機能**: 段階的にリファクタリング
3. **レガシーコード**: 必要に応じて従来型を維持

### 移行の優先順位

1. **Critical Path**: 最も重要な機能から移行
2. **High Traffic**: 使用頻度の高い機能
3. **Bug-prone**: エラーが多発する機能
4. **Low Risk**: 影響範囲が限定的な機能

## 📚 参考資料

### 関数型プログラミング

- 関数合成とコンビネーター
- モナド的パターン（Result型）
- 不変性の維持

### TypeScript活用

- 高度な型システム
- 型レベルプログラミング
- 条件型とマップ型

### テスト戦略

- 純粋関数のテスト容易性
- モックとスタブの活用
- 統合テストとE2Eテスト

---

**重要**: この設計思想を一貫して適用することで、保守性が高く、テストしやすく、型安全なアプリケーションを構築できます。Claude Codeは必ずこのガイドに従って実装してください。