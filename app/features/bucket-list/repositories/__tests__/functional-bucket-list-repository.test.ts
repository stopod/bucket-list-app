import { describe, it, expect, vi, beforeEach } from "vitest";
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
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const mockCategory: Category = {
  id: 1,
  name: "旅行・観光",
  description: "旅行や観光に関する項目",
  color: "#FF6B6B",
  icon: "🗺️",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const mockUserStats: UserBucketStats = {
  profile_id: "user-123",
  total_items: 10,
  completed_items: 3,
  not_started_items: 5,
  in_progress_items: 2,
  completion_rate: 0.3,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
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

describe("FunctionalBucketListRepository", () => {
  let repository: ReturnType<typeof createFunctionalBucketListRepository>;
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
    // モックの初期化
    mockSingle = vi.fn();
    mockOr = vi.fn();
    mockOrder = vi.fn(() => ({ data: [], error: null }));
    mockEq = vi.fn(() => ({
      select: mockSelect,
      single: mockSingle,
      or: mockOr,
      order: mockOrder,
    }));
    mockSelect = vi.fn(() => ({
      eq: mockEq,
      single: mockSingle,
      or: mockOr,
      order: mockOrder,
    }));
    mockInsert = vi.fn(() => ({
      select: mockSelect,
      single: mockSingle,
    }));
    mockUpdate = vi.fn(() => ({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    }));
    mockDelete = vi.fn(() => ({
      eq: mockEq,
    }));
    mockFrom = vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    }));

    mockSupabase = {
      from: mockFrom,
    } as any;

    repository = createFunctionalBucketListRepository(mockSupabase);
  });

  describe("findAll", () => {
    it("成功時にResult<BucketItem[], BucketListError>型で結果が返されること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
      }
      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockSelect).toHaveBeenCalledWith("*");
    });

    it("フィルターが適用されること", async () => {
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

      const result = await repository.findAll(filters);

      expect(result.success).toBe(true);
      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
      expect(mockEq).toHaveBeenCalledWith("category_id", 1);
      expect(mockEq).toHaveBeenCalledWith("priority", "high");
      expect(mockEq).toHaveBeenCalledWith("status", "not_started");
      expect(mockEq).toHaveBeenCalledWith("is_public", false);
      expect(mockOr).toHaveBeenCalledWith("title.ilike.%テスト%,description.ilike.%テスト%");
    });

    it("ソートが適用されること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const sort: BucketListSort = {
        field: "title",
        direction: "asc",
      };

      const result = await repository.findAll(undefined, sort);

      expect(result.success).toBe(true);
      expect(mockOrder).toHaveBeenCalledWith("title", { ascending: true });
    });

    it("エラー時にResult<never, BucketListError>型で結果が返されること", async () => {
      const mockError = { message: "Database error", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findAll();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("DatabaseError");
        expect(result.error.message).toContain("findAll failed: Database error");
      }
    });

    it("データがnullの場合、空配列が返されること", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("findAllWithCategory", () => {
    it("カテゴリ情報を含む結果が正しく返されること", async () => {
      const mockDataWithCategory = [{ ...mockBucketItem, category: mockCategory }];
      mockOrder.mockResolvedValue({ data: mockDataWithCategory, error: null });

      const result = await repository.findAllWithCategory();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockDataWithCategory);
      }
      expect(mockSelect).toHaveBeenCalledWith(`
          *,
          category:categories(*)
        `);
    });

    it("エラー時に適切なエラーが返されること", async () => {
      const mockError = { message: "Join error", code: "PGRST302" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findAllWithCategory();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("findAllWithCategory failed: Join error");
      }
    });
  });

  describe("findById", () => {
    it("IDに該当するアイテムが返されること", async () => {
      mockSingle.mockResolvedValue({ data: mockBucketItem, error: null });

      const result = await repository.findById("test-id");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockBucketItem);
      }
      expect(mockEq).toHaveBeenCalledWith("id", "test-id");
      expect(mockSingle).toHaveBeenCalled();
    });

    it("該当するデータが存在しない場合、nullが返されること", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findById("non-existent-id");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("PGRST116以外のエラーが発生した場合、エラーが返されること", async () => {
      const mockError = { message: "Database error", code: "PGRST301" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findById("test-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("findById failed: Database error");
      }
    });
  });

  describe("findByProfileId", () => {
    it("プロファイルIDに該当するアイテムが返されること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findByProfileId("user-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
      }
      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
    });

    it("エラー時に適切なエラーが返されること", async () => {
      const mockError = { message: "Access denied", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findByProfileId("user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("findByProfileId failed: Access denied");
      }
    });
  });

  describe("findPublic", () => {
    it("公開アイテムが返されること", async () => {
      const mockData = [{ ...mockBucketItem, is_public: true }];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findPublic();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
      }
      expect(mockEq).toHaveBeenCalledWith("is_public", true);
    });

    it("エラー時に適切なエラーが返されること", async () => {
      const mockError = { message: "Query error", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findPublic();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("findPublic failed: Query error");
      }
    });
  });

  describe("create", () => {
    it("新しいアイテムが作成されること", async () => {
      const mockCreatedItem = { ...mockBucketItem, ...mockInsertData };
      mockSingle.mockResolvedValue({ data: mockCreatedItem, error: null });

      const result = await repository.create(mockInsertData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCreatedItem);
      }
      expect(mockInsert).toHaveBeenCalledWith({
        ...mockInsertData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it("作成エラー時に適切なエラーが返されること", async () => {
      const mockError = { message: "Validation error", code: "PGRST400" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.create(mockInsertData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("create failed: Validation error");
      }
    });
  });

  describe("update", () => {
    it("既存のアイテムが更新されること", async () => {
      const mockUpdatedItem = { ...mockBucketItem, ...mockUpdateData };
      mockSingle.mockResolvedValue({ data: mockUpdatedItem, error: null });

      const result = await repository.update("test-id", mockUpdateData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUpdatedItem);
      }
      expect(mockUpdate).toHaveBeenCalledWith({
        ...mockUpdateData,
        updated_at: expect.any(String),
      });
      expect(mockEq).toHaveBeenCalledWith("id", "test-id");
    });

    it("更新エラー時に適切なエラーが返されること", async () => {
      const mockError = { message: "Update failed", code: "PGRST404" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.update("test-id", mockUpdateData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("update failed: Update failed");
      }
    });
  });

  describe("delete", () => {
    it("アイテムが削除されること", async () => {
      mockEq.mockResolvedValue({ data: null, error: null });

      const result = await repository.delete("test-id");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "test-id");
    });

    it("削除エラー時に適切なエラーが返されること", async () => {
      const mockError = { message: "Delete failed", code: "PGRST404" };
      mockEq.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.delete("test-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("delete failed: Delete failed");
      }
    });
  });

  describe("findAllCategories", () => {
    it("全てのカテゴリが返されること", async () => {
      const mockCategories = [mockCategory];
      mockOrder.mockResolvedValue({ data: mockCategories, error: null });

      const result = await repository.findAllCategories();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCategories);
      }
      expect(mockFrom).toHaveBeenCalledWith("categories");
      expect(mockOrder).toHaveBeenCalledWith("id");
    });

    it("エラー時に適切なエラーが返されること", async () => {
      const mockError = { message: "Categories fetch error", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findAllCategories();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("findAllCategories failed: Categories fetch error");
      }
    });
  });

  describe("findCategoryById", () => {
    it("IDに該当するカテゴリが返されること", async () => {
      mockSingle.mockResolvedValue({ data: mockCategory, error: null });

      const result = await repository.findCategoryById(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCategory);
      }
      expect(mockEq).toHaveBeenCalledWith("id", 1);
    });

    it("該当するカテゴリが存在しない場合、nullが返されること", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findCategoryById(999);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe("getUserStats", () => {
    it("ユーザー統計が返されること", async () => {
      mockSingle.mockResolvedValue({ data: mockUserStats, error: null });

      const result = await repository.getUserStats("user-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUserStats);
      }
      expect(mockFrom).toHaveBeenCalledWith("user_bucket_stats");
      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
    });

    it("該当するユーザー統計が存在しない場合、nullが返されること", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.getUserStats("non-existent-user");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("PGRST116以外のエラーが発生した場合、エラーが返されること", async () => {
      const mockError = { message: "Stats fetch error", code: "PGRST301" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.getUserStats("user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("getUserStats failed: Stats fetch error");
      }
    });
  });

  describe("例外処理", () => {
    it("予期しない例外が発生した場合、適切なエラーが返されること", async () => {
      // Supabaseクライアント自体が例外をスローする場合をシミュレート
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await repository.findAll();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("DatabaseError");
        expect(result.error.message).toContain("findAll failed: Unexpected error");
      }
    });

    it("nullエラーが適切に処理されること", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });
});