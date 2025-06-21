# テスト駆動開発ガイド

このガイドは、Claude CodeがVitestを使用してテスト駆動開発を実践するための完全な指針を提供します。関数型アプローチとResult型を活用した型安全なテスト戦略を詳述します。

## 🧪 TDD基本原則

### Red-Green-Refactor サイクル

Claude Codeは**必ず**以下の順序で開発を進めてください：

1. **🔴 Red**: 失敗するテストを書く
2. **🟢 Green**: テストがパスする最小限の実装
3. **🔄 Refactor**: コードの改善（テストは常にパス）
4. **📝 Commit**: 各サイクル完了後にコミット

### 実装禁止ルール

- テストコードなしの実装は**絶対禁止**
- テストが書けない設計は設計の問題として認識
- 「後でテストを書く」は**許可しない**

## 🛠️ Vitest設定と実行

### 基本コマンド

```bash
# テスト実行
npm test

# ウォッチモード（推奨：開発中常時実行）
npm test -- --watch

# UI付きテスト実行
npm run test:ui

# カバレッジ測定
npm run test:coverage

# 特定ファイルのテスト
npm test -- path/to/test-file.test.ts

# 特定のテストケースのみ実行
npm test -- --grep "特定のテストケース名"
```

### 必須設定確認

```bash
# vitest.config.tsの確認
cat vitest.config.ts

# test-setup.tsの確認
cat test-setup.ts
```

## 📝 テストケース記述規約

### 日本語必須ルール

**すべて**のテストケース名は日本語で記述してください：

```typescript
// ✅ 正しい記述
describe("createBucketItem", () => {
  it("有効なデータを渡した場合、新しいバケットアイテムが作成されること", async () => {
    // テストコード
  });

  it("タイトルが空文字の場合、ValidationErrorが返されること", async () => {
    // テストコード
  });
});

// ❌ 間違った記述
describe("createBucketItem", () => {
  it("should create bucket item", async () => {
    // 英語は禁止
  });

  it("validates input", () => {
    // 曖昧な表現は禁止
  });
});
```

### テストケース命名パターン

#### パターン1: 条件＋期待値形式
```typescript
it("[条件]の場合、[期待される結果]こと", () => {
  // 例：
  // "有効なデータの場合、Successが返されること"
  // "無効なデータの場合、ValidationErrorが返されること"
});
```

#### パターン2: 機能動作確認形式
```typescript
it("[機能]が[期待通りに動作する]こと", () => {
  // 例：
  // "統計計算が正確に実行されること"
  // "フィルタリングが適切に動作すること"
});
```

#### パターン3: 状態変化確認形式
```typescript
it("[操作]により[状態が変化]すること", () => {
  // 例：
  // "アイテム削除によりリストから項目が除去されること"
  // "ステータス更新により表示が変更されること"
});
```

## 🔍 Result型テスト戦略

### Result型テストの基本パターン

```typescript
import { describe, it, expect } from 'vitest';
import { isSuccess, isFailure } from '../../../shared/types/result';

describe("Result型を返す関数のテスト", () => {
  it("成功ケース：Successが返されること", async () => {
    const result = await targetFunction(validInput);

    // Result型の成功チェック
    expect(isSuccess(result)).toBe(true);
    
    // 型ガードを使用した安全なデータアクセス
    if (isSuccess(result)) {
      expect(result.data).toEqual(expectedData);
      expect(result.data.id).toBeDefined();
    }
  });

  it("失敗ケース：Failureが返されること", async () => {
    const result = await targetFunction(invalidInput);

    // Result型の失敗チェック
    expect(isFailure(result)).toBe(true);
    
    // 型ガードを使用した安全なエラーアクセス
    if (isFailure(result)) {
      expect(result.error.type).toBe('ValidationError');
      expect(result.error.message).toContain('required');
    }
  });
});
```

### エラー型別テストパターン

```typescript
describe("エラーハンドリングテスト", () => {
  it("ValidationError：必須フィールド不足でValidationErrorが返されること", async () => {
    const invalidData = { title: '' }; // 必須フィールド不足
    const result = await validateFunction(invalidData);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe('ValidationError');
      expect(result.error.field).toBe('title');
    }
  });

  it("NotFoundError：存在しないIDでNotFoundErrorが返されること", async () => {
    const result = await findFunction('non-existent-id');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe('NotFoundError');
      expect(result.error.resource).toBe('BucketItem');
    }
  });

  it("DatabaseError：DB接続エラーでDatabaseErrorが返されること", async () => {
    // Mock database error
    const mockRepository = createMockRepositoryWithError();
    const result = await serviceWithRepository(mockRepository);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe('DatabaseError');
    }
  });
});
```

## 🎯 テスト対象の優先順位

### 1. 最優先：純粋関数

```typescript
// features/bucket-list/lib/__tests__/business-logic.test.ts
describe("validateBucketItemCreate", () => {
  // バリデーション関数のテスト
  it("有効なデータの場合、正規化されたデータがSuccessで返されること", () => {
    const validData = {
      title: '  Test Item  ', // 前後の空白
      category_id: 'cat-1',
      user_id: 'user-1',
    };

    const result = validateBucketItemCreate(validData);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.title).toBe('Test Item'); // 空白が除去されている
      expect(result.data.priority).toBe('medium'); // デフォルト値
    }
  });

  it("タイトルが200文字を超える場合、ValidationErrorが返されること", () => {
    const longTitle = 'a'.repeat(201);
    const invalidData = {
      title: longTitle,
      category_id: 'cat-1',
      user_id: 'user-1',
    };

    const result = validateBucketItemCreate(invalidData);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.field).toBe('title');
      expect(result.error.message).toContain('200 characters');
    }
  });
});

describe("calculateAchievementStats", () => {
  it("完了率が正確に計算されること", () => {
    const items = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'in_progress' },
      { status: 'not_started' },
    ] as BucketItem[];

    const stats = calculateAchievementStats(items);

    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2);
    expect(stats.completionRate).toBe(50); // 2/4 * 100
  });

  it("空の配列の場合、0%で返されること", () => {
    const stats = calculateAchievementStats([]);

    expect(stats).toEqual({
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionRate: 0,
    });
  });
});
```

### 2. 高優先：Service層関数

```typescript
// features/bucket-list/services/__tests__/functional-bucket-list-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createBucketItem } from '../functional-bucket-list-service';

describe("createBucketItem", () => {
  it("リポジトリ呼び出しが成功した場合、作成されたアイテムが返されること", async () => {
    // Arrange: Mock Repository
    const mockItem = { id: '1', title: 'Test Item' } as BucketItem;
    const mockRepository = {
      create: vi.fn().mockResolvedValue(success(mockItem)),
    } as any;

    const createService = createBucketItem(mockRepository);
    const validData = {
      title: 'Test Item',
      category_id: 'cat-1',
      user_id: 'user-1',
    };

    // Act
    const result = await createService(validData);

    // Assert
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data).toEqual(mockItem);
    }
    expect(mockRepository.create).toHaveBeenCalledOnce();
  });

  it("バリデーションエラーの場合、リポジトリが呼ばれずエラーが返されること", async () => {
    // Arrange
    const mockRepository = {
      create: vi.fn(),
    } as any;

    const createService = createBucketItem(mockRepository);
    const invalidData = { title: '' }; // 無効なデータ

    // Act
    const result = await createService(invalidData);

    // Assert
    expect(isFailure(result)).toBe(true);
    expect(mockRepository.create).not.toHaveBeenCalled(); // 呼ばれていないことを確認
  });
});
```

### 3. 中優先：Repository層

```typescript
// features/bucket-list/repositories/__tests__/supabase-bucket-list-repository.test.ts
import { describe, it, expect, vi } from 'vitest';

// Note: 実際のDBテストは統合テストで実施
// Unit TestではSupabaseクライアントをモック
describe("SupabaseBucketListRepository", () => {
  it("正常なレスポンスの場合、データがSuccessで返されること", async () => {
    // Supabaseクライアントのモック
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: '1', title: 'Test' }],
        error: null,
      }),
    };

    // テスト実装...
  });
});
```

### 4. 低優先：Component層

```typescript
// features/bucket-list/components/__tests__/achievement-stats.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementStats } from '../achievement-stats';

describe("AchievementStats", () => {
  it("統計データが正しく表示されること", () => {
    const stats = {
      total: 10,
      completed: 3,
      inProgress: 2,
      notStarted: 5,
      completionRate: 30,
    };

    render(<AchievementStats stats={stats} />);

    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('3件完了')).toBeInTheDocument();
  });

  it("統計データが0の場合、適切に表示されること", () => {
    const emptyStats = {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionRate: 0,
    };

    render(<AchievementStats stats={emptyStats} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
```

## 🔧 モックとスタブ戦略

### Repository層のモック

```typescript
import { vi } from 'vitest';
import { BucketListRepository } from '../repositories/bucket-list-repository';
import { success, failure } from '../../../shared/types/result';

// 成功パターンのモック
const createMockRepository = (mockData: any): BucketListRepository => ({
  findAll: vi.fn().mockResolvedValue(success(mockData.items || [])),
  findById: vi.fn().mockResolvedValue(success(mockData.item)),
  create: vi.fn().mockResolvedValue(success(mockData.created)),
  update: vi.fn().mockResolvedValue(success(mockData.updated)),
  delete: vi.fn().mockResolvedValue(success(undefined)),
});

// エラーパターンのモック
const createMockRepositoryWithError = (errorType: string): BucketListRepository => ({
  findAll: vi.fn().mockResolvedValue(failure({ type: errorType, message: 'Test error' })),
  findById: vi.fn().mockResolvedValue(failure({ type: errorType, message: 'Test error' })),
  create: vi.fn().mockResolvedValue(failure({ type: errorType, message: 'Test error' })),
  update: vi.fn().mockResolvedValue(failure({ type: errorType, message: 'Test error' })),
  delete: vi.fn().mockResolvedValue(failure({ type: errorType, message: 'Test error' })),
});
```

### 外部依存関係のモック

```typescript
// Supabaseクライアントのモック
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}));
```

## 📊 カバレッジ目標と測定

### 目標カバレッジ

- **純粋関数**: 100%（例外なし）
- **Service層**: 90%以上
- **Repository層**: 80%以上
- **Component層**: 70%以上
- **全体**: 80%以上

### カバレッジ測定

```bash
# カバレッジレポート生成
npm run test:coverage

# カバレッジレポートをブラウザで表示
open coverage/index.html
```

### カバレッジ確認項目

1. **Statement Coverage**: 実行された文の割合
2. **Branch Coverage**: 分岐の網羅率
3. **Function Coverage**: 関数の実行率
4. **Line Coverage**: 実行された行の割合

## 🚀 TDD実践フロー

### Step 1: テストファイル作成

```bash
# テストファイルの作成
# パターン: [対象ファイル名].test.ts
touch app/features/bucket-list/services/__tests__/new-service.test.ts
```

### Step 2: 失敗するテスト作成

```typescript
// Red Phase: 失敗するテストを書く
import { describe, it, expect } from 'vitest';

describe("新機能", () => {
  it("基本的な動作が期待通りであること", () => {
    // まだ実装されていない関数を呼び出す
    const result = newFunction('test input');
    
    expect(result).toBe('expected output');
  });
});
```

### Step 3: テスト実行（Red確認）

```bash
npm test -- new-service.test.ts
# テストが失敗することを確認（Redフェーズ）
```

### Step 4: 最小限の実装

```typescript
// Green Phase: テストがパスする最小限の実装
export const newFunction = (input: string): string => {
  return 'expected output'; // ハードコード（最小限）
};
```

### Step 5: テスト実行（Green確認）

```bash
npm test -- new-service.test.ts
# テストがパスすることを確認（Greenフェーズ）
```

### Step 6: リファクタリング

```typescript
// Refactor Phase: より良い実装に改善
export const newFunction = (input: string): string => {
  // 実際のロジックを実装
  return processInput(input);
};
```

### Step 7: テスト再実行

```bash
npm test -- new-service.test.ts
# リファクタリング後もテストがパスすることを確認
```

### Step 8: コミット

```bash
git add .
git commit -m "feat: 新機能の実装

Add new function with TDD approach
- Implement basic functionality
- Add comprehensive tests
- Ensure 100% coverage for pure functions

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 🎨 テストデータファクトリー

### テストデータ生成ヘルパー

```typescript
// __tests__/test-helpers.ts
import { BucketItem, BucketItemCreate } from '../types';

export const createMockBucketItem = (overrides: Partial<BucketItem> = {}): BucketItem => ({
  id: 'test-id',
  title: 'Test Item',
  description: 'Test Description',
  category_id: 'test-category',
  priority: 'medium',
  status: 'not_started',
  is_public: false,
  due_date: null,
  due_type: 'unspecified',
  user_id: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockBucketItemCreate = (
  overrides: Partial<BucketItemCreate> = {}
): BucketItemCreate => ({
  title: 'Test Item',
  description: 'Test Description',
  category_id: 'test-category',
  priority: 'medium',
  status: 'not_started',
  is_public: false,
  due_date: null,
  due_type: 'unspecified',
  user_id: 'test-user',
  ...overrides,
});
```

### ファクトリーの使用例

```typescript
describe("テストデータファクトリー使用例", () => {
  it("デフォルトデータでテストできること", () => {
    const item = createMockBucketItem();
    expect(item.title).toBe('Test Item');
  });

  it("部分的にオーバーライドできること", () => {
    const item = createMockBucketItem({
      title: 'Custom Title',
      status: 'completed',
    });
    
    expect(item.title).toBe('Custom Title');
    expect(item.status).toBe('completed');
    expect(item.category_id).toBe('test-category'); // デフォルト値は保持
  });
});
```

## 🔄 継続的テスト実行

### 開発時の推奨設定

```bash
# ターミナル1：開発サーバー
npm run dev

# ターミナル2：テストウォッチ
npm test -- --watch

# ターミナル3：型チェック
npm run typecheck -- --watch
```

### プリコミットフック設定

```bash
# テスト失敗時はコミットを阻止
npm test && npm run typecheck && git commit
```

## 📋 TDD チェックリスト

Claude Codeは以下を必ず確認してください：

### ✅ 開発プロセス

- [ ] テストファーストで実装している
- [ ] Red-Green-Refactorサイクルを守っている
- [ ] 各サイクルでコミットしている
- [ ] テストなしの実装を行っていない

### ✅ テスト品質

- [ ] テストケース名が日本語で記述されている
- [ ] 条件と期待値が明確に示されている
- [ ] Result型の成功・失敗両方をテストしている
- [ ] エラーケースが適切にテストされている

### ✅ カバレッジ

- [ ] 純粋関数のカバレッジが100%
- [ ] Service層のカバレッジが90%以上
- [ ] Repository層のカバレッジが80%以上
- [ ] 全体のカバレッジが80%以上

### ✅ 実行確認

- [ ] すべてのテストがパスしている
- [ ] TypeScriptエラーが0個
- [ ] ESLintエラーが0個
- [ ] ビルドが成功している

## 🚫 禁止事項

### 絶対にやってはいけないこと

- テストを後回しにする
- テストをスキップする
- 「動くからOK」で済ませる
- カバレッジを無視する
- 英語でテストケースを書く
- モックなしで外部依存をテストする

## 📚 参考情報

### Vitest公式ドキュメント

- [Vitest公式](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Mock Functions](https://vitest.dev/guide/mocking.html)

### 関連ガイド

- `development-workflow.md`: 開発フロー全体
- `functional-typescript-architecture.md`: アーキテクチャ設計
- `cleanup-automation.md`: 品質管理プロセス

---

**重要**: TDDは単なるテスト手法ではなく、設計手法です。テストファーストにより、より良い設計と保守性の高いコードが生まれます。Claude Codeは必ずこのプロセスに従って開発してください。