/**
 * Repository同値性テスト
 * 従来のクラスベースRepositoryと関数型Repositoryが同じ結果を返すことを検証
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseBucketListRepository } from "../supabase-bucket-list-repository";
import { createFunctionalBucketListRepository } from "../functional-bucket-list-repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
  BucketListFilters,
  BucketListSort,
} from "~/features/bucket-list/types";

// モックデータ
const mockBucketItem: BucketItem = {
  id: "test-id",
  profile_id: "user-123",
  title: "テスト項目",
  description: "テスト説明",
  category_id: 1,
  priority: "high",
  status: "not_started",
  is_public: false,
  due_type: "specific_date",
  due_date: "2024-12-31",
  completed_at: null,
  completion_comment: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const mockCategory: Category = {
  id: 1,
  name: "旅行・観光",
  color: "#FF6B6B",
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockUserStats: UserBucketStats = {
  profile_id: "user-123",
  total_items: 10,
  completed_items: 3,
  not_started_items: 5,
  in_progress_items: 2,
  completion_rate: 0.3,
  display_name: null,
};

const mockInsertData: BucketItemInsert = {
  profile_id: "user-123",
  title: "新しい項目",
  description: "新しい項目の説明",
  category_id: 1,
  priority: "medium",
  status: "not_started",
  is_public: false,
  due_type: "this_year",
};

const mockUpdateData: BucketItemUpdate = {
  title: "更新された項目",
  description: "更新された説明",
  priority: "low",
  status: "completed",
};

describe("Repository同値性テスト", () => {
  let classBasedRepository: SupabaseBucketListRepository;
  let functionalRepository: ReturnType<typeof createFunctionalBucketListRepository>;
  let mockSupabase: SupabaseClient<Database>;
  let mockFrom: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockDelete: any;
  let mockEq: any;
  let mockOrder: any;
  let mockSingle: any;
  let mockOr: any;

  beforeEach(() => {
    // 共通のモック設定
    mockSingle = vi.fn();
    mockOr = vi.fn();
    mockOrder = vi.fn(() => ({ data: [], error: null }));
    
    // Create a mock chain object that has all the necessary methods
    const mockChain = {
      select: vi.fn(),
      single: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      eq: vi.fn(),
    };
    
    // Set up the chain to return itself for method chaining
    mockChain.select.mockReturnValue(mockChain);
    mockChain.single.mockReturnValue(mockChain);
    mockChain.or.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    
    // Override specific methods for testing
    mockEq = mockChain.eq;
    mockSelect = mockChain.select;
    mockSingle = mockChain.single;
    mockOr = mockChain.or;
    mockOrder = mockChain.order;
    
    mockInsert = vi.fn(() => mockChain);
    mockUpdate = vi.fn(() => mockChain);
    mockDelete = vi.fn(() => mockChain);
    mockFrom = vi.fn(() => mockChain);

    mockSupabase = {
      from: mockFrom,
    } as any;

    // 両方のRepositoryを同じモックSupabaseクライアントで初期化
    classBasedRepository = new SupabaseBucketListRepository(mockSupabase);
    functionalRepository = createFunctionalBucketListRepository(mockSupabase);
  });

  describe("findAll操作の同値性", () => {
    it("成功時に両方のRepositoryが同じ結果を返すこと", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const classBasedResult = await classBasedRepository.findAll();
      const functionalResult = await functionalRepository.findAll();

      expect(classBasedResult).toEqual(mockData);
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }
    });

    it("フィルター適用時に両方のRepositoryが同じクエリを実行すること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const filters: BucketListFilters = {
        profile_id: "user-123",
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        search: "テスト",
      };

      // モックをリセット
      vi.clearAllMocks();

      await classBasedRepository.findAll(filters);
      const classBasedCalls = {
        fromCalls: mockFrom.mock.calls.length,
        selectCalls: mockSelect.mock.calls.length,
        eqCalls: mockEq.mock.calls.length,
        orCalls: mockOr.mock.calls.length,
        orderCalls: mockOrder.mock.calls.length,
      };

      // モックをリセット
      vi.clearAllMocks();

      await functionalRepository.findAll(filters);
      const functionalCalls = {
        fromCalls: mockFrom.mock.calls.length,
        selectCalls: mockSelect.mock.calls.length,
        eqCalls: mockEq.mock.calls.length,
        orCalls: mockOr.mock.calls.length,
        orderCalls: mockOrder.mock.calls.length,
      };

      // 同じ数のメソッド呼び出しが行われることを確認
      expect(functionalCalls).toEqual(classBasedCalls);
    });

    it("エラー時の処理が適切に行われること", async () => {
      const mockError = { message: "Database error", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      // クラスベースはエラーを投げる
      await expect(classBasedRepository.findAll()).rejects.toThrow();

      // 関数型はResult型でエラーを返す
      const functionalResult = await functionalRepository.findAll();
      expect(functionalResult.success).toBe(false);
      if (!functionalResult.success) {
        expect(functionalResult.error.message).toContain("Database error");
      }
    });
  });

  describe("findById操作の同値性", () => {
    it("存在するIDで両方のRepositoryが同じ結果を返すこと", async () => {
      mockSingle.mockResolvedValue({ data: mockBucketItem, error: null });

      const classBasedResult = await classBasedRepository.findById("test-id");
      const functionalResult = await functionalRepository.findById("test-id");

      expect(classBasedResult).toEqual(mockBucketItem);
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }
    });

    it("存在しないIDで両方のRepositoryがnullを返すこと", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const classBasedResult = await classBasedRepository.findById("non-existent");
      const functionalResult = await functionalRepository.findById("non-existent");

      expect(classBasedResult).toBeNull();
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }
    });
  });

  describe("create操作の同値性", () => {
    it("作成時に両方のRepositoryが同じ結果を返すこと", async () => {
      const mockCreatedItem = { ...mockBucketItem, ...mockInsertData };
      mockSingle.mockResolvedValue({ data: mockCreatedItem, error: null });

      const classBasedResult = await classBasedRepository.create(mockInsertData);
      const functionalResult = await functionalRepository.create(mockInsertData);

      expect(classBasedResult).toEqual(mockCreatedItem);
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }

      // 両方とも同じデータで insert が呼ばれることを確認
      expect(mockInsert).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = mockInsert.mock.calls;
      expect(firstCall[0]).toEqual(secondCall[0]);
    });
  });

  describe("update操作の同値性", () => {
    it("更新時に両方のRepositoryが同じ結果を返すこと", async () => {
      const mockUpdatedItem = { ...mockBucketItem, ...mockUpdateData };
      mockSingle.mockResolvedValue({ data: mockUpdatedItem, error: null });

      const classBasedResult = await classBasedRepository.update("test-id", mockUpdateData);
      const functionalResult = await functionalRepository.update("test-id", mockUpdateData);

      expect(classBasedResult).toEqual(mockUpdatedItem);
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }

      // 両方とも同じデータで update が呼ばれることを確認
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = mockUpdate.mock.calls;
      expect(firstCall[0]).toEqual(secondCall[0]);
    });
  });

  describe("delete操作の同値性", () => {
    it("削除時に両方のRepositoryが同じ動作をすること", async () => {
      mockEq.mockResolvedValue({ data: null, error: null });

      const classBasedResult = await classBasedRepository.delete("test-id");
      const functionalResult = await functionalRepository.delete("test-id");

      expect(classBasedResult).toBeUndefined();
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toBeUndefined();
      }

      // 両方とも同じ ID で delete が呼ばれることを確認
      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockEq).toHaveBeenCalledWith("id", "test-id");
    });
  });

  describe("findAllCategories操作の同値性", () => {
    it("カテゴリ取得で両方のRepositoryが同じ結果を返すこと", async () => {
      const mockCategories = [mockCategory];
      mockOrder.mockResolvedValue({ data: mockCategories, error: null });

      const classBasedResult = await classBasedRepository.findAllCategories();
      const functionalResult = await functionalRepository.findAllCategories();

      expect(classBasedResult).toEqual(mockCategories);
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }
    });
  });

  describe("getUserStats操作の同値性", () => {
    it("ユーザー統計取得で両方のRepositoryが同じ結果を返すこと", async () => {
      mockSingle.mockResolvedValue({ data: mockUserStats, error: null });

      const classBasedResult = await classBasedRepository.getUserStats("user-123");
      const functionalResult = await functionalRepository.getUserStats("user-123");

      expect(classBasedResult).toEqual(mockUserStats);
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }
    });

    it("存在しないユーザーでnullを返すこと", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const classBasedResult = await classBasedRepository.getUserStats("non-existent");
      const functionalResult = await functionalRepository.getUserStats("non-existent");

      expect(classBasedResult).toBeNull();
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }
    });
  });

  describe("複雑なシナリオの同値性", () => {
    it("複数のフィルターとソートを適用した場合の同値性", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const filters: BucketListFilters = {
        profile_id: "user-123",
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        search: "テスト検索",
      };

      const sort: BucketListSort = {
        field: "created_at",
        direction: "desc",
      };

      const classBasedResult = await classBasedRepository.findByProfileId("user-123", filters, sort);
      const functionalResult = await functionalRepository.findByProfileId("user-123", filters, sort);

      expect(classBasedResult).toEqual(mockData);
      expect(functionalResult.success).toBe(true);
      if (functionalResult.success) {
        expect(functionalResult.data).toEqual(classBasedResult);
      }
    });

    it("エラー処理の一貫性確認", async () => {
      const errorScenarios = [
        { code: "PGRST301", message: "Permission denied" },
        { code: "PGRST400", message: "Bad request" },
        { code: "PGRST500", message: "Internal server error" },
      ];

      for (const scenario of errorScenarios) {
        mockOrder.mockResolvedValue({ data: null, error: scenario });

        // クラスベースは例外を投げる
        await expect(classBasedRepository.findAll()).rejects.toThrow();

        // 関数型はResult型でエラーを返す
        const functionalResult = await functionalRepository.findAll();
        expect(functionalResult.success).toBe(false);
        if (!functionalResult.success) {
          expect(functionalResult.error.message).toContain(scenario.message);
        }
      }
    });
  });

  describe("パフォーマンス特性の比較", () => {
    it("同じ数のSupabaseクライアント呼び出しが行われること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      // クラスベースの呼び出し回数カウント
      vi.clearAllMocks();
      await classBasedRepository.findAll();
      const classBasedCallCount = mockFrom.mock.calls.length;

      // 関数型の呼び出し回数カウント
      vi.clearAllMocks();
      await functionalRepository.findAll();
      const functionalCallCount = mockFrom.mock.calls.length;

      expect(functionalCallCount).toBe(classBasedCallCount);
    });

    it("同一の引数で同一のSupabaseメソッドが呼ばれること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const testId = "test-id";

      // 両方のRepositoryで同じ操作を実行
      vi.clearAllMocks();
      await classBasedRepository.findById(testId);
      const classBasedFromCall = mockFrom.mock.calls[0];
      const classBasedEqCall = mockEq.mock.calls[0];

      vi.clearAllMocks();
      await functionalRepository.findById(testId);
      const functionalFromCall = mockFrom.mock.calls[0];
      const functionalEqCall = mockEq.mock.calls[0];

      // 同じテーブル名で from が呼ばれることを確認
      expect(functionalFromCall).toEqual(classBasedFromCall);
      // 同じ引数で eq が呼ばれることを確認
      expect(functionalEqCall).toEqual(classBasedEqCall);
    });
  });
});