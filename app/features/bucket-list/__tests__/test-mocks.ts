/**
 * テスト用のモック関数群
 * Repository、Service、外部依存関係のモック実装
 */

import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FunctionalBucketListRepository } from "~/features/bucket-list/repositories/bucket-list.repository";
import type { Database } from "~/shared/types/database";
import { success, failure } from "~/shared/types/result";
import { createDatabaseError } from "~/shared/types/errors";
import {
  createMockBucketItem,
  createMockBucketItemWithCategory,
  createMockCategory,
  createMockUserStats,
} from "./test-helpers";

/**
 * Supabase クライアントのモック
 */
export const createMockSupabaseClient = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    // デフォルトの成功レスポンス
    then: vi.fn().mockResolvedValue({
      data: [createMockBucketItem()],
      error: null,
    }),
  };

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQuery),
    mockQuery,
  } as unknown as SupabaseClient<Database> & { mockQuery: typeof mockQuery };

  return mockSupabase;
};

/**
 * 成功レスポンスを返すSupabaseクライアント
 */
export const createSuccessfulSupabaseClient = () => {
  const mockSupabase = createMockSupabaseClient();

  // 全ての操作で成功を返す
  mockSupabase.mockQuery.select.mockResolvedValue({
    data: [createMockBucketItem()],
    error: null,
  });

  mockSupabase.mockQuery.single.mockResolvedValue({
    data: createMockBucketItem(),
    error: null,
  });

  mockSupabase.mockQuery.insert.mockResolvedValue({
    data: createMockBucketItem(),
    error: null,
  });

  mockSupabase.mockQuery.update.mockResolvedValue({
    data: createMockBucketItem(),
    error: null,
  });

  mockSupabase.mockQuery.delete.mockResolvedValue({
    data: null,
    error: null,
  });

  return mockSupabase;
};

/**
 * エラーレスポンスを返すSupabaseクライアント
 */
export const createErrorSupabaseClient = (
  errorMessage: string = "Database error"
) => {
  const mockSupabase = createMockSupabaseClient();
  const mockError = { message: errorMessage, code: "DB_ERROR" };

  // 全ての操作でエラーを返す
  mockSupabase.mockQuery.select.mockResolvedValue({
    data: null,
    error: mockError,
  });

  mockSupabase.mockQuery.single.mockResolvedValue({
    data: null,
    error: mockError,
  });

  mockSupabase.mockQuery.insert.mockResolvedValue({
    data: null,
    error: mockError,
  });

  mockSupabase.mockQuery.update.mockResolvedValue({
    data: null,
    error: mockError,
  });

  mockSupabase.mockQuery.delete.mockResolvedValue({
    data: null,
    error: mockError,
  });

  return mockSupabase;
};

/**
 * Repository のモック（成功バージョン）
 */
export const createMockRepositorySuccess =
  (): FunctionalBucketListRepository => ({
    findAll: vi.fn().mockResolvedValue(success([createMockBucketItem()])),
    findAllWithCategory: vi
      .fn()
      .mockResolvedValue(success([createMockBucketItemWithCategory()])),
    findById: vi.fn().mockResolvedValue(success(createMockBucketItem())),
    findByProfileId: vi
      .fn()
      .mockResolvedValue(success([createMockBucketItem()])),
    findPublic: vi.fn().mockResolvedValue(success([createMockBucketItem()])),
    create: vi.fn().mockResolvedValue(success(createMockBucketItem())),
    update: vi.fn().mockResolvedValue(success(createMockBucketItem())),
    delete: vi.fn().mockResolvedValue(success(undefined)),
    findAllCategories: vi
      .fn()
      .mockResolvedValue(success([createMockCategory()])),
    findCategoryById: vi.fn().mockResolvedValue(success(createMockCategory())),
    getUserStats: vi.fn().mockResolvedValue(success(createMockUserStats())),
  });

/**
 * Repository のモック（失敗バージョン）
 */
export const createMockRepositoryFailure = (
  errorMessage: string = "Repository error"
): FunctionalBucketListRepository => {
  const mockError = createDatabaseError(errorMessage, "read", "MOCK_ERROR");

  return {
    findAll: vi.fn().mockResolvedValue(failure(mockError)),
    findAllWithCategory: vi.fn().mockResolvedValue(failure(mockError)),
    findById: vi.fn().mockResolvedValue(failure(mockError)),
    findByProfileId: vi.fn().mockResolvedValue(failure(mockError)),
    findPublic: vi.fn().mockResolvedValue(failure(mockError)),
    create: vi.fn().mockResolvedValue(failure(mockError)),
    update: vi.fn().mockResolvedValue(failure(mockError)),
    delete: vi.fn().mockResolvedValue(failure(mockError)),
    findAllCategories: vi.fn().mockResolvedValue(failure(mockError)),
    findCategoryById: vi.fn().mockResolvedValue(failure(mockError)),
    getUserStats: vi.fn().mockResolvedValue(failure(mockError)),
  };
};

/**
 * Repository のモック（部分的成功バージョン）
 */
export const createMockRepositoryPartialSuccess =
  (): FunctionalBucketListRepository => {
    const mockError = createDatabaseError(
      "Partial failure",
      "read",
      "PARTIAL_ERROR"
    );

    return {
      findAll: vi.fn().mockResolvedValue(success([createMockBucketItem()])),
      findAllWithCategory: vi.fn().mockResolvedValue(failure(mockError)),
      findById: vi.fn().mockResolvedValue(success(createMockBucketItem())),
      findByProfileId: vi
        .fn()
        .mockResolvedValue(success([createMockBucketItem()])),
      findPublic: vi.fn().mockResolvedValue(success([createMockBucketItem()])),
      create: vi.fn().mockResolvedValue(success(createMockBucketItem())),
      update: vi.fn().mockResolvedValue(failure(mockError)),
      delete: vi.fn().mockResolvedValue(success(undefined)),
      findAllCategories: vi
        .fn()
        .mockResolvedValue(success([createMockCategory()])),
      findCategoryById: vi
        .fn()
        .mockResolvedValue(success(createMockCategory())),
      getUserStats: vi.fn().mockResolvedValue(success(createMockUserStats())),
    };
  };

/**
 * Repository のモック（カスタム応答バージョン）
 */
export const createMockRepositoryCustom = (
  customResponses: Partial<FunctionalBucketListRepository>
): FunctionalBucketListRepository => {
  const defaultRepo = createMockRepositorySuccess();

  return {
    ...defaultRepo,
    ...customResponses,
  };
};

/**
 * business-logic モジュールのモック
 */
export const createMockBusinessLogic = () => ({
  groupItemsByCategory: vi
    .fn()
    .mockReturnValue([
      {
        category: createMockCategory(),
        items: [createMockBucketItemWithCategory()],
      },
    ]),
  validateBucketItemInsert: vi
    .fn()
    .mockReturnValue(success(createMockBucketItem())),
  validateBucketItemUpdate: vi
    .fn()
    .mockReturnValue(success(createMockBucketItem())),
  canEditCompletedItem: vi.fn().mockReturnValue(success(true)),
  getRecentlyCompletedItems: vi.fn().mockReturnValue([createMockBucketItem()]),
  getUpcomingItems: vi.fn().mockReturnValue([createMockBucketItem()]),
  calculateUserStats: vi.fn().mockReturnValue({
    total_count: 10,
    completed_count: 5,
    completion_rate: 50.0,
  }),
  calculateAchievementRate: vi.fn().mockReturnValue(50),
  calculateCategoryStats: vi.fn().mockReturnValue([
    {
      category: createMockCategory(),
      total: 10,
      completed: 5,
      rate: 50,
    },
  ]),
});

/**
 * 特定のメソッドのレスポンスをセットアップする関数
 */
export const setupRepositoryMock = <
  T extends keyof FunctionalBucketListRepository,
>(
  mockRepo: FunctionalBucketListRepository,
  method: T,
  response: ReturnType<FunctionalBucketListRepository[T]>
) => {
  (mockRepo[method] as ReturnType<typeof vi.fn>).mockResolvedValue(response);
};

/**
 * Repository メソッドが呼ばれたかどうかをチェックするアサーション
 * Note: これらの関数は実際のテストファイル内でexpectと一緒に使用する必要があります
 */
export const getRepositoryMethodCallCount = (
  mockRepo: FunctionalBucketListRepository,
  method: keyof FunctionalBucketListRepository
) => {
  const mockMethod = mockRepo[method] as ReturnType<typeof vi.fn>;
  return mockMethod.mock.calls.length;
};

/**
 * Repository メソッドの呼び出し引数を取得
 */
export const getRepositoryMethodCallArgs = (
  mockRepo: FunctionalBucketListRepository,
  method: keyof FunctionalBucketListRepository,
  callIndex: number = 0
) => {
  const mockMethod = mockRepo[method] as ReturnType<typeof vi.fn>;
  return mockMethod.mock.calls[callIndex];
};

/**
 * すべてのRepository メソッドの呼び出しをクリアする関数
 */
export const clearRepositoryMocks = (
  mockRepo: FunctionalBucketListRepository
) => {
  Object.values(mockRepo).forEach((method) => {
    if (typeof method === "function" && "mockClear" in method) {
      method.mockClear();
    }
  });
};

/**
 * テスト用のタイムアウト設定
 */
export const TEST_TIMEOUT = 5000;

/**
 * テスト用のプロフィールID
 */
export const TEST_PROFILE_ID = "test-profile-id";

/**
 * テスト用のカテゴリID
 */
export const TEST_CATEGORY_ID = 1;

/**
 * テスト用のアイテムID
 */
export const TEST_ITEM_ID = "test-item-id";

/**
 * よく使われるテストデータセット
 */
export const TEST_DATA_SETS = {
  EMPTY_RESPONSE: { data: [], error: null },
  SINGLE_ITEM_RESPONSE: { data: [createMockBucketItem()], error: null },
  MULTIPLE_ITEMS_RESPONSE: {
    data: [
      createMockBucketItem({ id: "item-1" }),
      createMockBucketItem({ id: "item-2" }),
      createMockBucketItem({ id: "item-3" }),
    ],
    error: null,
  },
  ERROR_RESPONSE: {
    data: null,
    error: { message: "Test error", code: "TEST_ERROR" },
  },
  NOT_FOUND_RESPONSE: { data: null, error: { code: "PGRST116" } },
};

/**
 * テスト用のエラーメッセージ
 */
export const TEST_ERROR_MESSAGES = {
  DATABASE_ERROR: "Database connection failed",
  VALIDATION_ERROR: "Validation failed",
  NOT_FOUND_ERROR: "Item not found",
  BUSINESS_RULE_ERROR: "Business rule violation",
  UNAUTHORIZED_ERROR: "Unauthorized access",
};
