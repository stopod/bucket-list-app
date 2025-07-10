import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseBucketListRepository } from "../supabase-bucket-list-repository";
import { BucketListRepositoryError } from "../bucket-list-repository";
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
  description: "テストの説明",
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

describe("SupabaseBucketListRepository", () => {
  let repository: SupabaseBucketListRepository;
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

    repository = new SupabaseBucketListRepository(mockSupabase, "user-123");
  });

  describe("findAll", () => {
    it("フィルターなしの場合、全てのバケットリスト項目が取得できること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findAll();

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(result).toEqual(mockData);
    });

    it("フィルターありの場合、適切にフィルターが適用されること", async () => {
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

      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
      expect(mockEq).toHaveBeenCalledWith("category_id", 1);
      expect(mockEq).toHaveBeenCalledWith("priority", "high");
      expect(mockEq).toHaveBeenCalledWith("status", "not_started");
      expect(mockEq).toHaveBeenCalledWith("is_public", false);
      expect(mockOr).toHaveBeenCalledWith("title.ilike.%テスト%,description.ilike.%テスト%");
      expect(result).toEqual(mockData);
    });

    it("ソート設定がある場合、適切にソートが適用されること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const sort: BucketListSort = {
        field: "title",
        direction: "asc",
      };

      const result = await repository.findAll(undefined, sort);

      expect(mockOrder).toHaveBeenCalledWith("title", { ascending: true });
      expect(result).toEqual(mockData);
    });

    it("エラーが発生した場合、BucketListRepositoryErrorがスローされること", async () => {
      const mockError = { message: "Database error", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.findAll()).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.findAll()).rejects.toThrow(
        "Failed to fetch bucket items: Database error"
      );
    });

    it("データがnullの場合、空配列が返されること", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findAllWithCategory", () => {
    it("カテゴリ情報を含むバケットリスト項目が取得できること", async () => {
      const mockDataWithCategory = [{ ...mockBucketItem, category: mockCategory }];
      mockOrder.mockResolvedValue({ data: mockDataWithCategory, error: null });

      const result = await repository.findAllWithCategory();

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockSelect).toHaveBeenCalledWith(`
        *,
        category:categories(*)
      `);
      expect(result).toEqual(mockDataWithCategory);
    });

    it("エラーが発生した場合、適切なエラーメッセージがスローされること", async () => {
      const mockError = { message: "Join error", code: "PGRST302" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.findAllWithCategory()).rejects.toThrow(
        "Failed to fetch bucket items with categories: Join error"
      );
    });
  });

  describe("findById", () => {
    it("IDを指定した場合、該当するバケットリスト項目が取得できること", async () => {
      mockSingle.mockResolvedValue({ data: mockBucketItem, error: null });

      const result = await repository.findById("test-id");

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("id", "test-id");
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockBucketItem);
    });

    it("該当するデータが存在しない場合、nullが返されること", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findById("non-existent-id");

      expect(result).toBeNull();
    });

    it("PGRST116以外のエラーが発生した場合、BucketListRepositoryErrorがスローされること", async () => {
      const mockError = { message: "Database error", code: "PGRST301" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.findById("test-id")).rejects.toThrow(
        "Failed to fetch bucket item: Database error"
      );
    });
  });

  describe("findByProfileId", () => {
    it("プロファイルIDを指定した場合、該当するユーザーのバケットリスト項目が取得できること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findByProfileId("user-123");

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
      expect(result).toEqual(mockData);
    });

    it("エラーが発生した場合、適切なエラーメッセージがスローされること", async () => {
      const mockError = { message: "Access denied", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.findByProfileId("user-123")).rejects.toThrow(
        "Failed to fetch user bucket items: Access denied"
      );
    });
  });

  describe("findPublic", () => {
    it("公開設定のバケットリスト項目が取得できること", async () => {
      const mockData = [{ ...mockBucketItem, is_public: true }];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findPublic();

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("is_public", true);
      expect(result).toEqual(mockData);
    });

    it("エラーが発生した場合、適切なエラーメッセージがスローされること", async () => {
      const mockError = { message: "Query error", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.findPublic()).rejects.toThrow(
        "Failed to fetch public bucket items: Query error"
      );
    });
  });

  describe("create", () => {
    it("新しいバケットリスト項目が作成できること", async () => {
      const mockCreatedItem = { ...mockBucketItem, ...mockInsertData };
      mockSingle.mockResolvedValue({ data: mockCreatedItem, error: null });

      const result = await repository.create(mockInsertData);

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockInsert).toHaveBeenCalledWith({
        ...mockInsertData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedItem);
    });

    it("作成時にエラーが発生した場合、BucketListRepositoryErrorがスローされること", async () => {
      const mockError = { message: "Validation error", code: "PGRST400" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.create(mockInsertData)).rejects.toThrow(
        "Failed to create bucket item: Validation error"
      );
    });
  });

  describe("update", () => {
    it("既存のバケットリスト項目が更新できること", async () => {
      const mockUpdatedItem = { ...mockBucketItem, ...mockUpdateData };
      mockSingle.mockResolvedValue({ data: mockUpdatedItem, error: null });

      const result = await repository.update("test-id", mockUpdateData);

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockUpdate).toHaveBeenCalledWith({
        ...mockUpdateData,
        updated_at: expect.any(String),
      });
      expect(mockEq).toHaveBeenCalledWith("id", "test-id");
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedItem);
    });

    it("更新時にエラーが発生した場合、BucketListRepositoryErrorがスローされること", async () => {
      const mockError = { message: "Update failed", code: "PGRST404" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.update("test-id", mockUpdateData)).rejects.toThrow(
        "Failed to update bucket item: Update failed"
      );
    });
  });

  describe("delete", () => {
    it("指定されたバケットリスト項目が削除できること", async () => {
      mockEq.mockResolvedValue({ data: null, error: null });

      await repository.delete("test-id");

      expect(mockFrom).toHaveBeenCalledWith("bucket_items");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "test-id");
    });

    it("削除時にエラーが発生した場合、BucketListRepositoryErrorがスローされること", async () => {
      const mockError = { message: "Delete failed", code: "PGRST404" };
      mockEq.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.delete("test-id")).rejects.toThrow(
        "Failed to delete bucket item: Delete failed"
      );
    });
  });

  describe("findAllCategories", () => {
    it("全てのカテゴリが取得できること", async () => {
      const mockCategories = [mockCategory];
      mockOrder.mockResolvedValue({ data: mockCategories, error: null });

      const result = await repository.findAllCategories();

      expect(mockFrom).toHaveBeenCalledWith("categories");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockOrder).toHaveBeenCalledWith("id");
      expect(result).toEqual(mockCategories);
    });

    it("エラーが発生した場合、適切なエラーメッセージがスローされること", async () => {
      const mockError = { message: "Categories fetch error", code: "PGRST301" };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.findAllCategories()).rejects.toThrow(
        "Failed to fetch categories: Categories fetch error"
      );
    });
  });

  describe("findCategoryById", () => {
    it("IDを指定した場合、該当するカテゴリが取得できること", async () => {
      mockSingle.mockResolvedValue({ data: mockCategory, error: null });

      const result = await repository.findCategoryById(1);

      expect(mockFrom).toHaveBeenCalledWith("categories");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("id", 1);
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockCategory);
    });

    it("該当するカテゴリが存在しない場合、nullが返されること", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.findCategoryById(999);

      expect(result).toBeNull();
    });
  });

  describe("getUserStats", () => {
    it("プロファイルIDを指定した場合、ユーザー統計が取得できること", async () => {
      mockSingle.mockResolvedValue({ data: mockUserStats, error: null });

      const result = await repository.getUserStats("user-123");

      expect(mockFrom).toHaveBeenCalledWith("user_bucket_stats");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockUserStats);
    });

    it("該当するユーザー統計が存在しない場合、nullが返されること", async () => {
      const mockError = { message: "No rows found", code: "PGRST116" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await repository.getUserStats("non-existent-user");

      expect(result).toBeNull();
    });

    it("PGRST116以外のエラーが発生した場合、BucketListRepositoryErrorがスローされること", async () => {
      const mockError = { message: "Stats fetch error", code: "PGRST301" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      await expect(repository.getUserStats("user-123")).rejects.toThrow(
        "Failed to fetch user stats: Stats fetch error"
      );
    });
  });

  describe("プライベートヘルパーメソッド", () => {
    it("applyFiltersメソッドのテスト - 全てのフィルターが適用されること", async () => {
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

      await repository.findAll(filters);

      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
      expect(mockEq).toHaveBeenCalledWith("category_id", 1);
      expect(mockEq).toHaveBeenCalledWith("priority", "high");
      expect(mockEq).toHaveBeenCalledWith("status", "not_started");
      expect(mockEq).toHaveBeenCalledWith("is_public", false);
      expect(mockOr).toHaveBeenCalledWith("title.ilike.%テスト%,description.ilike.%テスト%");
    });

    it("applySortメソッドのテスト - デフォルトソートが適用されること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      await repository.findAll();

      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("applySortメソッドのテスト - カスタムソートが適用されること", async () => {
      const mockData = [mockBucketItem];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const sort: BucketListSort = {
        field: "title",
        direction: "asc",
      };

      await repository.findAll(undefined, sort);

      expect(mockOrder).toHaveBeenCalledWith("title", { ascending: true });
    });
  });
});