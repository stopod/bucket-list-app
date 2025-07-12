# テスト戦略 実装ガイド

## 📋 概要

- **目的**: Vitest + React Testing Library を使用したテスト駆動開発戦略の完全実装
- **対象読者**: 開発者、QA担当者
- **前提知識**: React, TypeScript, Vitest, Testing Library, Result型、関数型プログラミング
- **推定作業時間**: 4-6時間

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

### 設計思想

- **品質重視**: テストケースの質 > 量
- **保守性**: メンテナンスしやすいテスト設計
- **実用性**: ビジネスロジックを重点的にテスト
- **日本語化**: 読みやすいテストケース記述
- **Result型対応**: 型安全なエラーハンドリングのテスト

### 主要コンポーネント

- **Vitest**: テストランナー・フレームワーク
- **@testing-library/react**: コンポーネントテスト
- **jsdom**: ブラウザ環境シミュレーション
- **Mock Setup**: Supabase・外部依存のモック

### テスト構成

```
app/
├── features/
│   └── [feature]/
│       ├── services/__tests__/         # Service層テスト
│       ├── repositories/__tests__/     # Repository層テスト
│       └── components/__tests__/       # コンポーネントテスト
├── test-setup.ts                      # グローバルテスト設定
└── vitest.config.ts                   # Vitest設定
```

## 💻 実装詳細

### 基本実装

#### 1. Vitest設定

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
});
```

#### 2. テスト環境セットアップ

```typescript
// test-setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Supabase クライアントのモック
vi.mock("~/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// 環境変数のモック
process.env.VITE_SUPABASE_URL = "https://test.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
```

### テストコード作成規約

#### 1. テストケース記述規則

- **日本語必須**: 全てのテストケース名は日本語で記述
- **条件＋期待値形式**: 「〜の場合、〜であること」の形式
- **具体的な観点**: 確認観点と期待される結果を明確に示す

```typescript
// ✅ Good
describe("BucketListService", () => {
  it("ユーザーIDを指定した場合、そのユーザーのバケットリスト項目が取得できること", async () => {
    // テスト実装
  });

  it("空の統計データを渡した場合、0%表示で適切に処理されること", () => {
    // テスト実装
  });
});

// ❌ Bad
describe("BucketListService", () => {
  it("should return user bucket items", async () => {
    // テスト実装
  });

  it("handles empty data", () => {
    // テスト実装
  });
});
```

#### 2. テスト対象の優先順位

1. **最優先：純粋関数**: business-logic.ts内の計算・変換関数
2. **高優先：Service層**: 関数型・従来型両方のService関数
3. **中優先：Repository層**: データアクセス層の動作
4. **低優先：Component層**: カスタムコンポーネント
5. **テスト不要**: 外部ライブラリのコンポーネント（shadcn-ui等）

#### 3. Result型テスト戦略

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

### 実装例

#### 純粋関数テスト（最優先）

```typescript
// features/bucket-list/lib/__tests__/business-logic.test.ts
import { describe, it, expect } from 'vitest';
import { validateBucketItemCreate, calculateAchievementStats } from '../business-logic';
import { isSuccess, isFailure } from '../../../../shared/types/result';

describe('validateBucketItemCreate', () => {
  it('有効なデータの場合、正規化されたデータがSuccessで返されること', () => {
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

  it('タイトルが200文字を超える場合、ValidationErrorが返されること', () => {
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

describe('calculateAchievementStats', () => {
  it('完了率が正確に計算されること', () => {
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

  it('空の配列の場合、0%で返されること', () => {
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

#### 関数型Service層テスト（高優先）

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

#### 従来型Service層テスト

```typescript
// app/features/bucket-list/services/__tests__/bucket-list-service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BucketListService } from "../bucket-list-service";
import type { BucketListRepository } from "~/features/bucket-list/repositories";

const mockRepository: BucketListRepository = {
  findAll: vi.fn(),
  findByProfileId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  // ... 他のメソッド
};

describe("BucketListService", () => {
  let service: BucketListService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BucketListService(mockRepository);
  });

  describe("getUserBucketItems", () => {
    it("ユーザーIDを指定した場合、そのユーザーのバケットリスト項目が取得できること", async () => {
      const profileId = "user-1";
      const mockItems = [
        { id: "1", title: "Test Item", profile_id: profileId },
      ];

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(mockItems);

      const result = await service.getUserBucketItems(profileId);

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(
        profileId,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockItems);
    });

    it("フィルターとソート条件を指定した場合、それらの条件がリポジトリに正しく渡されること", async () => {
      const profileId = "user-1";
      const filters = { status: "completed" as const };
      const sort = { field: "created_at" as const, direction: "desc" as const };

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue([]);

      await service.getUserBucketItems(profileId, filters, sort);

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(
        profileId,
        filters,
        sort,
      );
    });
  });
});
```

#### コンポーネントテスト

```typescript
// app/features/bucket-list/components/__tests__/achievement-stats.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AchievementStats } from '../achievement-stats'
import type { UserBucketStats } from '~/features/bucket-list/types'

describe('AchievementStats', () => {
  const mockStats: UserBucketStats = {
    profile_id: 'test-user',
    display_name: 'Test User',
    total_items: 10,
    completed_items: 3,
    in_progress_items: 2,
    not_started_items: 5,
    completion_rate: 30,
  }

  it('有効な統計データを渡した場合、達成状況が正しく表示されること', () => {
    render(<AchievementStats stats={mockStats} />)

    expect(screen.getByText('達成状況')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // total items
    expect(screen.getByText('3')).toBeInTheDocument() // completed items
  })

  it('統計情報を渡した場合、各カテゴリのラベルが正しく表示されること', () => {
    render(<AchievementStats stats={mockStats} />)

    expect(screen.getByText('総項目数')).toBeInTheDocument()
    expect(screen.getByText('完了')).toBeInTheDocument()
    expect(screen.getByText('進行中')).toBeInTheDocument()
    expect(screen.getByText('未着手')).toBeInTheDocument()
  })
})
```

### 設定手順

#### 1. 依存関係インストール

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui jsdom
```

#### 2. package.json スクリプト追加

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

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

## 🧪 テスト戦略

### ユニットテスト

- **Service層**: ビジネスロジックの正確性
- **Repository層**: データアクセスの動作
- **ユーティリティ関数**: 純粋関数の動作

### 統合テスト

- **コンポーネント間連携**: Service ↔ Component
- **認証フロー**: AuthContext ↔ AuthGuard
- **データフロー**: Repository ↔ Service ↔ Component

### E2Eテスト（将来拡張）

- **ユーザーシナリオ**: ログイン → データ操作 → ログアウト
- **Critical Path**: 主要機能の完全なフロー

## 🔧 トラブルシューティング

### よくある問題

#### 問題1: Supabaseクライアントのモックエラー

**原因**: モック設定の不完全性
**解決方法**:

```typescript
// より完全なモック設定
vi.mock("~/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      // 必要なメソッドをすべて追加
    })),
  },
}));
```

#### 問題2: 型エラーが発生する

**原因**: テスト用の型定義不足
**解決方法**:

```typescript
// 型安全なモック作成
const mockRepository: jest.Mocked<BucketListRepository> = {
  findAll: vi.fn().mockResolvedValue([]),
  // 全メソッドをモック化
};
```

#### 問題3: 非同期テストのタイムアウト

**原因**: 非同期処理の待機不足
**解決方法**:

```typescript
// 適切な非同期テスト
it("非同期処理の場合、正しく完了を待機すること", async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### デバッグ方法

```typescript
// テスト用デバッグログ
beforeEach(() => {
  if (process.env.DEBUG_TESTS) {
    console.log("Test started:", expect.getState().currentTestName);
  }
});
```

## 📚 参考資料

### Vitest公式ドキュメント

- [Vitest公式](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Mock Functions](https://vitest.dev/guide/mocking.html)

### 関連ガイド

- `development-workflow.md`: 開発フロー全体
- `architecture.md`: アーキテクチャ設計
- `../project/requirements.md`: プロジェクト要件

---

**重要**: TDDは単なるテスト手法ではなく、設計手法です。テストファーストにより、より良い設計と保守性の高いコードが生まれます。Claude Codeは必ずこのプロセスに従って開発してください。
