# テスト戦略 実装ガイド

## 📋 概要
- **目的**: Vitest + React Testing Library を使用したテスト戦略の実装
- **対象読者**: 開発者、QA担当者
- **前提知識**: React, TypeScript, Vitest, Testing Library
- **推定作業時間**: 4-6時間

## 🏗 アーキテクチャ

### 設計思想
- **品質重視**: テストケースの質 > 量
- **保守性**: メンテナンスしやすいテスト設計
- **実用性**: ビジネスロジックを重点的にテスト
- **日本語化**: 読みやすいテストケース記述

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
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
    },
  },
})
```

#### 2. テスト環境セットアップ
```typescript
// test-setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Supabase クライアントのモック
vi.mock('~/lib/supabase', () => ({
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
}))

// 環境変数のモック
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
```

### テストコード作成規約

#### 1. テストケース記述規則
- **日本語必須**: 全てのテストケース名は日本語で記述
- **条件＋期待値形式**: 「〜の場合、〜であること」の形式
- **具体的な観点**: 確認観点と期待される結果を明確に示す

```typescript
// ✅ Good
describe('BucketListService', () => {
  it('ユーザーIDを指定した場合、そのユーザーのバケットリスト項目が取得できること', async () => {
    // テスト実装
  })

  it('空の統計データを渡した場合、0%表示で適切に処理されること', () => {
    // テスト実装
  })
})

// ❌ Bad
describe('BucketListService', () => {
  it('should return user bucket items', async () => {
    // テスト実装
  })

  it('handles empty data', () => {
    // テスト実装
  })
})
```

#### 2. テスト対象の優先順位
1. **ビジネスロジック**: Service層、Repository層
2. **カスタムコンポーネント**: 独自実装のUIコンポーネント
3. **統合テスト**: コンポーネント間の連携
4. **外部ライブラリのコンポーネント**: テスト不要（shadcn-ui等）

### 実装例

#### Service層テスト
```typescript
// app/features/bucket-list/services/__tests__/bucket-list-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BucketListService } from '../bucket-list-service'
import type { BucketListRepository } from '~/features/bucket-list/repositories'

const mockRepository: BucketListRepository = {
  findAll: vi.fn(),
  findByProfileId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  // ... 他のメソッド
}

describe('BucketListService', () => {
  let service: BucketListService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new BucketListService(mockRepository)
  })

  describe('getUserBucketItems', () => {
    it('ユーザーIDを指定した場合、そのユーザーのバケットリスト項目が取得できること', async () => {
      const profileId = 'user-1'
      const mockItems = [
        { id: '1', title: 'Test Item', profile_id: profileId }
      ]

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(mockItems)

      const result = await service.getUserBucketItems(profileId)

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(profileId, undefined, undefined)
      expect(result).toEqual(mockItems)
    })

    it('フィルターとソート条件を指定した場合、それらの条件がリポジトリに正しく渡されること', async () => {
      const profileId = 'user-1'
      const filters = { status: 'completed' as const }
      const sort = { field: 'created_at' as const, direction: 'desc' as const }

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue([])

      await service.getUserBucketItems(profileId, filters, sort)

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(profileId, filters, sort)
    })
  })
})
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

### テスト実行コマンド
```bash
npm test          # 通常実行
npm run test:ui   # UI付き実行  
npm run test:coverage  # カバレッジ測定
```

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
vi.mock('~/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      // 必要なメソッドをすべて追加
    })),
  },
}))
```

#### 問題2: 型エラーが発生する
**原因**: テスト用の型定義不足
**解決方法**:
```typescript
// 型安全なモック作成
const mockRepository: jest.Mocked<BucketListRepository> = {
  findAll: vi.fn().mockResolvedValue([]),
  // 全メソッドをモック化
}
```

#### 問題3: 非同期テストのタイムアウト
**原因**: 非同期処理の待機不足
**解決方法**:
```typescript
// 適切な非同期テスト
it('非同期処理の場合、正しく完了を待機すること', async () => {
  const result = await service.asyncMethod()
  expect(result).toBeDefined()
})
```

### デバッグ方法
```typescript
// テスト用デバッグログ
beforeEach(() => {
  if (process.env.DEBUG_TESTS) {
    console.log('Test started:', expect.getState().currentTestName)
  }
})
```

## 📚 参考資料
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [テスト規約詳細](../project/requirements.md#テスト要件)

---
**更新履歴**
- 2025-01-11: 初版作成 (Development Team)
- CLAUDE.mdテスト規約を基に包括的ガイド化