/**
 * 関数型BucketListRepositoryのテスト
 * Result型を使用したエラーハンドリングと各種Repository操作のテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createFunctionalBucketListRepository,
  handleRepositoryResult,
  combineRepositoryOperations,
  batchRepositoryOperations,
} from "../bucket-list.repository";
import type { Database } from "~/shared/types/database";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
} from "~/features/bucket-list/types";
import { isSuccess, isFailure } from "~/shared/types/result";

// テスト用のモックデータ
const mockBucketItem: BucketItem = {
  id: "test-id",
  title: "テストタイトル",
  description: "テスト説明",
  category_id: 1,
  priority: "high",
  status: "not_started",
  due_date: "2024-12-31",
  due_type: "specific_date",
  is_public: false,
  profile_id: "test-profile-id",
  completed_at: null,
  completion_comment: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const mockCategory = {
  id: 1,
  name: "テストカテゴリ",
  color: "bg-blue-100",
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockUserStats = {
  id: "stats-id",
  profile_id: "test-profile-id",
  total_count: 10,
  completed_count: 5,
  completion_rate: 50.0,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// Supabaseクライアントのモック
const createMockSupabaseClient = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQuery),
    mockQuery,
  } as unknown as SupabaseClient<Database> & { mockQuery: typeof mockQuery };

  return mockSupabase;
};

describe("createFunctionalBucketListRepository", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let repository: ReturnType<typeof createFunctionalBucketListRepository>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    repository = createFunctionalBucketListRepository(mockSupabase);
    vi.clearAllMocks();
  });

  describe("findAll", () => {
    it("フィルターなしの場合、全てのバケットリスト項目が取得できること", async () => {
      // 非同期処理のモック設定
      const mockPromise = Promise.resolve({
        data: [mockBucketItem],
        error: null,
      });

      mockSupabase.mockQuery.order.mockReturnValue(mockPromise);

      const result = await repository.findAll();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([mockBucketItem]);
      }
      expect(mockSupabase.from).toHaveBeenCalledWith("bucket_items");
    });

    it("フィルターを指定した場合、適切にフィルタリングされること", async () => {
      const mockPromise = Promise.resolve({
        data: [mockBucketItem],
        error: null,
      });

      mockSupabase.mockQuery.order.mockReturnValue(mockPromise);

      const filters = {
        category_id: 1,
        priority: "high" as const,
        status: "not_started" as const,
        search: "テスト",
      };

      const result = await repository.findAll(filters);

      expect(isSuccess(result)).toBe(true);
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith("category_id", 1);
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith(
        "priority",
        "high"
      );
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith(
        "status",
        "not_started"
      );
      expect(mockSupabase.mockQuery.or).toHaveBeenCalledWith(
        "title.ilike.%テスト%,description.ilike.%テスト%"
      );
    });

    it("データベースエラーの場合、Result<Failure>で返されること", async () => {
      const mockError = { message: "Database error", code: "DB_ERROR" };
      mockSupabase.mockQuery.select.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("DatabaseError");
        expect(result.error.message).toContain("findAll failed");
      }
    });
  });

  describe("findAllWithCategory", () => {
    it("カテゴリ情報を含むバケットリスト項目が取得できること", async () => {
      const mockItemWithCategory = {
        ...mockBucketItem,
        category: mockCategory,
      };

      const mockPromise = Promise.resolve({
        data: [mockItemWithCategory],
        error: null,
      });

      mockSupabase.mockQuery.order.mockReturnValue(mockPromise);

      const result = await repository.findAllWithCategory();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data[0]).toHaveProperty("category");
        expect(result.data[0].category).toEqual(mockCategory);
      }
    });

    it("カテゴリ結合でエラーが発生した場合、Result<Failure>で返されること", async () => {
      const mockError = { message: "Join error", code: "JOIN_ERROR" };
      mockSupabase.mockQuery.select.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await repository.findAllWithCategory();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("findAllWithCategory failed");
      }
    });
  });

  describe("findById", () => {
    it("有効なIDの場合、該当するバケットリスト項目が取得できること", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: mockBucketItem,
        error: null,
      });

      const result = await repository.findById("test-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockBucketItem);
      }
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith("id", "test-id");
    });

    it("存在しないIDの場合、nullが返されること", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" }, // No rows found
      });

      const result = await repository.findById("nonexistent-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBeNull();
      }
    });

    it("データベースエラーの場合、Result<Failure>で返されること", async () => {
      const mockError = { message: "Database error", code: "DB_ERROR" };
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await repository.findById("test-id");

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("findById failed");
      }
    });
  });

  describe("create", () => {
    it("有効なデータの場合、新しいバケットリスト項目が作成できること", async () => {
      const insertData: BucketItemInsert = {
        title: "新しいアイテム",
        description: "新しい説明",
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        profile_id: "test-profile-id",
      };

      mockSupabase.mockQuery.single.mockResolvedValue({
        data: { ...mockBucketItem, ...insertData },
        error: null,
      });

      const result = await repository.create(insertData);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.title).toBe("新しいアイテム");
        expect(result.data.description).toBe("新しい説明");
      }
      expect(mockSupabase.mockQuery.insert).toHaveBeenCalled();
    });

    it("作成に失敗した場合、Result<Failure>で返されること", async () => {
      const insertData: BucketItemInsert = {
        title: "新しいアイテム",
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        profile_id: "test-profile-id",
      };

      const mockError = { message: "Insert failed", code: "INSERT_ERROR" };
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await repository.create(insertData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("create failed");
      }
    });
  });

  describe("update", () => {
    it("有効なデータの場合、バケットリスト項目が更新できること", async () => {
      const updateData: BucketItemUpdate = {
        title: "更新されたタイトル",
        description: "更新された説明",
        status: "completed",
      };

      const updatedItem = { ...mockBucketItem, ...updateData };
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const result = await repository.update("test-id", updateData);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.title).toBe("更新されたタイトル");
        expect(result.data.status).toBe("completed");
      }
      expect(mockSupabase.mockQuery.update).toHaveBeenCalled();
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith("id", "test-id");
    });

    it("更新に失敗した場合、Result<Failure>で返されること", async () => {
      const updateData: BucketItemUpdate = {
        title: "更新されたタイトル",
      };

      const mockError = { message: "Update failed", code: "UPDATE_ERROR" };
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await repository.update("test-id", updateData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("update failed");
      }
    });
  });

  describe("delete", () => {
    it("有効なIDの場合、バケットリスト項目が削除できること", async () => {
      const mockPromise = Promise.resolve({
        data: null,
        error: null,
      });

      mockSupabase.mockQuery.eq.mockReturnValue(mockPromise);

      const result = await repository.delete("test-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBeUndefined();
      }
      expect(mockSupabase.mockQuery.delete).toHaveBeenCalled();
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith("id", "test-id");
    });

    it("削除に失敗した場合、Result<Failure>で返されること", async () => {
      const mockError = { message: "Delete failed", code: "DELETE_ERROR" };
      mockSupabase.mockQuery.delete.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await repository.delete("test-id");

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("delete failed");
      }
    });
  });

  describe("findAllCategories", () => {
    it("全てのカテゴリが取得できること", async () => {
      mockSupabase.mockQuery.order.mockResolvedValue({
        data: [mockCategory],
        error: null,
      });

      const result = await repository.findAllCategories();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([mockCategory]);
      }
      expect(mockSupabase.from).toHaveBeenCalledWith("categories");
    });

    it("カテゴリ取得に失敗した場合、Result<Failure>で返されること", async () => {
      const mockError = {
        message: "Category fetch failed",
        code: "FETCH_ERROR",
      };
      mockSupabase.mockQuery.order.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await repository.findAllCategories();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("findAllCategories failed");
      }
    });
  });

  describe("getUserStats", () => {
    it("有効なプロファイルIDの場合、ユーザー統計が取得できること", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: mockUserStats,
        error: null,
      });

      const result = await repository.getUserStats("test-profile-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockUserStats);
      }
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith(
        "profile_id",
        "test-profile-id"
      );
    });

    it("統計データが存在しない場合、nullが返されること", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" }, // No rows found
      });

      const result = await repository.getUserStats("nonexistent-profile");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBeNull();
      }
    });
  });
});

describe("Repository操作ヘルパー関数", () => {
  describe("handleRepositoryResult", () => {
    it("正常な操作の場合、結果がそのまま返されること", async () => {
      const mockOperation = vi
        .fn()
        .mockResolvedValue({ success: true, data: "test-data" });

      const result = await handleRepositoryResult(mockOperation);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe("test-data");
      }
    });

    it("例外が発生した場合、エラーハンドリングされること", async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error("Unexpected error"));

      const result = await handleRepositoryResult(mockOperation);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("Unexpected repository error");
      }
    });
  });

  describe("combineRepositoryOperations", () => {
    it("両方の操作が成功した場合、結果が組み合わされること", async () => {
      const op1 = vi.fn().mockResolvedValue({ success: true, data: "data1" });
      const op2 = vi.fn().mockResolvedValue({ success: true, data: "data2" });

      const result = await combineRepositoryOperations(op1, op2);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(["data1", "data2"]);
      }
    });

    it("最初の操作が失敗した場合、エラーが返されること", async () => {
      const op1 = vi.fn().mockResolvedValue({
        success: false,
        error: { type: "TestError", message: "Error 1" },
      });
      const op2 = vi.fn().mockResolvedValue({ success: true, data: "data2" });

      const result = await combineRepositoryOperations(op1, op2);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("Error 1");
      }
    });
  });

  describe("batchRepositoryOperations", () => {
    it("全ての操作が成功した場合、結果の配列が返されること", async () => {
      const operations = [
        vi.fn().mockResolvedValue({ success: true, data: "data1" }),
        vi.fn().mockResolvedValue({ success: true, data: "data2" }),
        vi.fn().mockResolvedValue({ success: true, data: "data3" }),
      ];

      const result = await batchRepositoryOperations(operations);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(["data1", "data2", "data3"]);
      }
    });

    it("いずれかの操作が失敗した場合、エラーが返されること", async () => {
      const operations = [
        vi.fn().mockResolvedValue({ success: true, data: "data1" }),
        vi.fn().mockResolvedValue({
          success: false,
          error: { type: "TestError", message: "Error 2" },
        }),
        vi.fn().mockResolvedValue({ success: true, data: "data3" }),
      ];

      const result = await batchRepositoryOperations(operations);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("Error 2");
      }
    });
  });
});
