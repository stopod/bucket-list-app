import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseBucketListRepository } from "../supabase-bucket-list-repository";
import { BucketListRepositoryError } from "../bucket-list-repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type {
  BucketItemInsert,
  BucketItemUpdate,
  BucketListFilters,
  BucketListSort,
} from "~/features/bucket-list/types";

describe("SupabaseBucketListRepository - エラーハンドリング・境界値テスト", () => {
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
    mockOrder = vi.fn();
    mockEq = vi.fn();
    mockSelect = vi.fn();
    mockInsert = vi.fn();
    mockUpdate = vi.fn();
    mockDelete = vi.fn();
    mockFrom = vi.fn();

    // チェインメソッドの設定
    mockSingle.mockReturnValue({ data: null, error: null });
    mockOr.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ data: [], error: null });
    mockEq.mockReturnValue({ 
      select: mockSelect, 
      single: mockSingle,
      or: mockOr,
      order: mockOrder,
      eq: mockEq 
    });
    mockSelect.mockReturnValue({ 
      eq: mockEq, 
      single: mockSingle,
      or: mockOr,
      order: mockOrder 
    });
    mockInsert.mockReturnValue({ 
      select: mockSelect, 
      single: mockSingle 
    });
    mockUpdate.mockReturnValue({ 
      eq: mockEq, 
      select: mockSelect, 
      single: mockSingle 
    });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    mockSupabase = {
      from: mockFrom,
    } as any;

    repository = new SupabaseBucketListRepository(mockSupabase);
  });

  describe("境界値テスト", () => {
    it("空文字列のIDでfindByIdを呼び出した場合、適切に処理されること", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "Invalid ID", code: "PGRST116" } });

      const result = await repository.findById("");

      expect(mockEq).toHaveBeenCalledWith("id", "");
      expect(result).toBeNull();
    });

    it("非常に長いIDでfindByIdを呼び出した場合、適切に処理されること", async () => {
      const longId = "a".repeat(1000);
      mockSingle.mockResolvedValue({ data: null, error: { message: "No rows found", code: "PGRST116" } });

      const result = await repository.findById(longId);

      expect(mockEq).toHaveBeenCalledWith("id", longId);
      expect(result).toBeNull();
    });

    it("特殊文字を含むIDでfindByIdを呼び出した場合、適切に処理されること", async () => {
      const specialId = "test-id-with-!@#$%^&*()";
      mockSingle.mockResolvedValue({ data: null, error: { message: "No rows found", code: "PGRST116" } });

      const result = await repository.findById(specialId);

      expect(mockEq).toHaveBeenCalledWith("id", specialId);
      expect(result).toBeNull();
    });

    it("非常に長い検索クエリでfindAllを呼び出した場合、適切に処理されること", async () => {
      const longSearch = "テスト".repeat(100);
      mockOrder.mockResolvedValue({ data: [], error: null });

      const filters: BucketListFilters = {
        search: longSearch,
      };

      const result = await repository.findAll(filters);

      expect(mockOr).toHaveBeenCalledWith(`title.ilike.%${longSearch}%,description.ilike.%${longSearch}%`);
      expect(result).toEqual([]);
    });

    it("特殊文字を含む検索クエリでfindAllを呼び出した場合、適切に処理されること", async () => {
      const specialSearch = "test & test | test";
      mockOrder.mockResolvedValue({ data: [], error: null });

      const filters: BucketListFilters = {
        search: specialSearch,
      };

      const result = await repository.findAll(filters);

      expect(mockOr).toHaveBeenCalledWith(`title.ilike.%${specialSearch}%,description.ilike.%${specialSearch}%`);
      expect(result).toEqual([]);
    });

    it("数値の境界値でfindCategoryByIdを呼び出した場合、適切に処理されること", async () => {
      const testCases = [0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
      
      for (const testId of testCases) {
        mockSingle.mockResolvedValue({ data: null, error: { message: "No rows found", code: "PGRST116" } });
        
        const result = await repository.findCategoryById(testId);
        
        expect(mockEq).toHaveBeenCalledWith("id", testId);
        expect(result).toBeNull();
      }
    });
  });

  describe("エラーハンドリング詳細テスト", () => {
    it("ネットワークエラーが発生した場合、適切にエラーハンドリングされること", async () => {
      const networkError = { 
        message: "Network request failed", 
        code: "NETWORK_ERROR" 
      };
      mockOrder.mockResolvedValue({ data: null, error: networkError });

      await expect(repository.findAll()).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.findAll()).rejects.toThrow("Failed to fetch bucket items: Network request failed");
    });

    it("権限エラーが発生した場合、適切にエラーハンドリングされること", async () => {
      const permissionError = { 
        message: "Permission denied", 
        code: "PGRST301" 
      };
      mockOrder.mockResolvedValue({ data: null, error: permissionError });

      await expect(repository.findPublic()).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.findPublic()).rejects.toThrow("Failed to fetch public bucket items: Permission denied");
    });

    it("データベース制約違反エラーが発生した場合、適切にエラーハンドリングされること", async () => {
      const constraintError = { 
        message: "Foreign key constraint violation", 
        code: "23503" 
      };
      mockSingle.mockResolvedValue({ data: null, error: constraintError });

      const invalidData: BucketItemInsert = {
        profile_id: "user-123",
        title: "テスト項目",
        description: "テスト説明",
        category_id: 999999, // 存在しないカテゴリID
        priority: "high",
        status: "not_started",
        is_public: false,
        due_type: "this_year",
      };

      await expect(repository.create(invalidData)).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.create(invalidData)).rejects.toThrow("Failed to create bucket item: Foreign key constraint violation");
    });

    it("データベース接続エラーが発生した場合、適切にエラーハンドリングされること", async () => {
      const connectionError = { 
        message: "Connection timeout", 
        code: "PGRST001" 
      };
      mockOrder.mockResolvedValue({ data: null, error: connectionError });

      await expect(repository.findAllCategories()).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.findAllCategories()).rejects.toThrow("Failed to fetch categories: Connection timeout");
    });

    it("不正なSQLエラーが発生した場合、適切にエラーハンドリングされること", async () => {
      const sqlError = { 
        message: "Invalid SQL syntax", 
        code: "PGRST102" 
      };
      mockSingle.mockResolvedValue({ data: null, error: sqlError });

      await expect(repository.getUserStats("user-123")).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.getUserStats("user-123")).rejects.toThrow("Failed to fetch user stats: Invalid SQL syntax");
    });
  });

  describe("Null/Undefinedハンドリング", () => {
    it("updateでnullデータを渡した場合、適切に処理されること", async () => {
      const nullUpdateData: BucketItemUpdate = {
        title: null as any,
        description: null as any,
        priority: null as any,
      };
      
      mockSingle.mockResolvedValue({ data: null, error: { message: "Null constraint violation", code: "23502" } });

      await expect(repository.update("test-id", nullUpdateData)).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.update("test-id", nullUpdateData)).rejects.toThrow("Failed to update bucket item: Null constraint violation");
    });

    it("createでundefinedフィールドを含むデータを渡した場合、適切に処理されること", async () => {
      const undefinedData: BucketItemInsert = {
        profile_id: "user-123",
        title: "テスト項目",
        description: undefined as any,
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        due_type: "this_year",
      };

      mockSingle.mockResolvedValue({ 
        data: { 
          ...undefinedData, 
          id: "test-id",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z" 
        }, 
        error: null 
      });

      const result = await repository.create(undefinedData);

      expect(mockInsert).toHaveBeenCalledWith({
        ...undefinedData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(result).toBeDefined();
    });

    it("filtersでundefinedフィールドを含む場合、適切に処理されること", async () => {
      const filtersWithUndefined: BucketListFilters = {
        profile_id: "user-123",
        category_id: undefined,
        priority: undefined,
        status: undefined,
        is_public: undefined,
        search: undefined,
      };

      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await repository.findAll(filtersWithUndefined);

      expect(mockEq).toHaveBeenCalledWith("profile_id", "user-123");
      expect(mockEq).not.toHaveBeenCalledWith("category_id", undefined);
      expect(mockEq).not.toHaveBeenCalledWith("priority", undefined);
      expect(mockEq).not.toHaveBeenCalledWith("status", undefined);
      expect(mockEq).not.toHaveBeenCalledWith("is_public", undefined);
      expect(mockOr).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe("異常なソート設定", () => {
    it("無効なソートフィールドを指定した場合、適切に処理されること", async () => {
      const invalidSort: BucketListSort = {
        field: "invalid_field" as any,
        direction: "asc",
      };

      mockOrder.mockResolvedValue({ data: null, error: { message: "Invalid sort field", code: "PGRST103" } });

      await expect(repository.findAll(undefined, invalidSort)).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.findAll(undefined, invalidSort)).rejects.toThrow("Failed to fetch bucket items: Invalid sort field");
    });

    it("無効なソート方向を指定した場合、適切に処理されること", async () => {
      const invalidSort: BucketListSort = {
        field: "title",
        direction: "invalid" as any,
      };

      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await repository.findAll(undefined, invalidSort);

      expect(mockOrder).toHaveBeenCalledWith("title", { ascending: false }); // "invalid"は"asc"以外なのでfalse
      expect(result).toEqual([]);
    });
  });

  describe("大量データ処理", () => {
    it("大量データの取得でメモリ制限に達した場合、適切にエラーハンドリングされること", async () => {
      const memoryError = { 
        message: "Memory limit exceeded", 
        code: "PGRST500" 
      };
      mockOrder.mockResolvedValue({ data: null, error: memoryError });

      await expect(repository.findAll()).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.findAll()).rejects.toThrow("Failed to fetch bucket items: Memory limit exceeded");
    });

    it("大量データの作成でタイムアウトした場合、適切にエラーハンドリングされること", async () => {
      const timeoutError = { 
        message: "Request timeout", 
        code: "PGRST408" 
      };
      mockSingle.mockResolvedValue({ data: null, error: timeoutError });

      const largeData: BucketItemInsert = {
        profile_id: "user-123",
        title: "テスト項目",
        description: "x".repeat(10000), // 大量のテキストデータ
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        due_type: "this_year",
      };

      await expect(repository.create(largeData)).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.create(largeData)).rejects.toThrow("Failed to create bucket item: Request timeout");
    });
  });

  describe("並行処理エラー", () => {
    it("同時更新による競合状態が発生した場合、適切にエラーハンドリングされること", async () => {
      const concurrencyError = { 
        message: "Concurrent update detected", 
        code: "PGRST409" 
      };
      mockSingle.mockResolvedValue({ data: null, error: concurrencyError });

      const updateData: BucketItemUpdate = {
        title: "更新されたタイトル",
        status: "completed",
      };

      await expect(repository.update("test-id", updateData)).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.update("test-id", updateData)).rejects.toThrow("Failed to update bucket item: Concurrent update detected");
    });

    it("同時削除による競合状態が発生した場合、適切にエラーハンドリングされること", async () => {
      const concurrencyError = { 
        message: "Resource already deleted", 
        code: "PGRST410" 
      };
      mockEq.mockResolvedValue({ data: null, error: concurrencyError });

      await expect(repository.delete("test-id")).rejects.toThrow(BucketListRepositoryError);
      await expect(repository.delete("test-id")).rejects.toThrow("Failed to delete bucket item: Resource already deleted");
    });
  });
});