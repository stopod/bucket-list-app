/**
 * 関数型BucketListServiceのテスト
 * Result型を使用したエラーハンドリングと各種Service操作のテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FunctionalBucketListRepository } from "~/features/bucket-list/repositories/bucket-list.repository";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
} from "~/features/bucket-list/types";
import {
  getUserBucketItems,
  getUserBucketItemsWithCategory,
  createBucketItem,
  updateBucketItem,
  completeBucketItem,
  deleteBucketItem,
  getBucketItemsByCategory,
  getDashboardData,
  createFunctionalBucketListService,
} from "../bucket-list.service";
import { success, failure } from "~/shared/types/result";
import { isSuccess, isFailure } from "~/shared/types/result";
import { createValidationError } from "~/shared/types/errors";

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

const mockCategory: Category = {
  id: 1,
  name: "テストカテゴリ",
  color: "bg-blue-100",
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockBucketItemWithCategory = {
  ...mockBucketItem,
  category: mockCategory,
};

// mockUserStats removed as it's not used in the tests

// Repository のモック
const createMockRepository = (): FunctionalBucketListRepository => ({
  findAll: vi.fn(),
  findAllWithCategory: vi.fn(),
  findById: vi.fn(),
  findByProfileId: vi.fn(),
  findPublic: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAllCategories: vi.fn(),
  findCategoryById: vi.fn(),
  getUserStats: vi.fn(),
});

// business-logic のモック
vi.mock("~/features/bucket-list/lib/business-logic", () => ({
  groupItemsByCategory: vi.fn(() => [
    { category: mockCategory, items: [mockBucketItemWithCategory] },
  ]),
  validateBucketItemInsert: vi.fn(() => success(mockBucketItem)),
  validateBucketItemUpdate: vi.fn(() => success(mockBucketItem)),
  canEditCompletedItem: vi.fn(() => success(true)),
  getRecentlyCompletedItems: vi.fn(() => [mockBucketItem]),
  getUpcomingItems: vi.fn(() => [mockBucketItem]),
  calculateUserStats: vi.fn(() => ({
    total_count: 10,
    completed_count: 5,
    completion_rate: 50.0,
  })),
}));

describe("BucketListService 関数型実装", () => {
  let mockRepository: FunctionalBucketListRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    vi.clearAllMocks();
  });

  describe("getUserBucketItems", () => {
    it("ユーザーIDを指定した場合、そのユーザーのバケットリスト項目が取得できること", async () => {
      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(
        success([mockBucketItem])
      );

      const result =
        await getUserBucketItems(mockRepository)("test-profile-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([mockBucketItem]);
      }
      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(
        "test-profile-id",
        undefined,
        undefined
      );
    });

    it("フィルターとソート条件を指定した場合、適切にRepositoryに渡されること", async () => {
      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(
        success([mockBucketItem])
      );

      const filters = { category_id: 1, status: "not_started" as const };
      const sort = { field: "created_at" as const, direction: "desc" as const };

      const result = await getUserBucketItems(mockRepository)(
        "test-profile-id",
        filters,
        sort
      );

      expect(isSuccess(result)).toBe(true);
      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(
        "test-profile-id",
        filters,
        sort
      );
    });

    it("Repositoryでエラーが発生した場合、Result<Failure>で返されること", async () => {
      const mockError = {
        type: "DatabaseError" as const,
        message: "Database connection failed",
        operation: "read" as const,
        code: "CONNECTION_ERROR",
      };
      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(
        failure(mockError)
      );

      const result =
        await getUserBucketItems(mockRepository)("test-profile-id");

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toEqual(mockError);
      }
    });
  });

  describe("getUserBucketItemsWithCategory", () => {
    it("ユーザーIDを指定した場合、カテゴリ情報付きのバケットリスト項目が取得できること", async () => {
      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(
        success([mockBucketItemWithCategory])
      );

      const result =
        await getUserBucketItemsWithCategory(mockRepository)("test-profile-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data[0]).toHaveProperty("category");
        expect(result.data[0].category).toEqual(mockCategory);
      }
      expect(mockRepository.findAllWithCategory).toHaveBeenCalledWith(
        { profile_id: "test-profile-id" },
        undefined
      );
    });

    it("フィルターが指定された場合、ユーザーIDと結合されてRepositoryに渡されること", async () => {
      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(
        success([mockBucketItemWithCategory])
      );

      const filters = { category_id: 1 };
      await getUserBucketItemsWithCategory(mockRepository)(
        "test-profile-id",
        filters
      );

      expect(mockRepository.findAllWithCategory).toHaveBeenCalledWith(
        { profile_id: "test-profile-id", category_id: 1 },
        undefined
      );
    });
  });

  describe("createBucketItem", () => {
    it("有効なデータの場合、バリデーション後にバケットリスト項目が作成できること", async () => {
      const insertData: BucketItemInsert = {
        title: "新しいアイテム",
        description: "新しい説明",
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        profile_id: "test-profile-id",
      };

      vi.mocked(mockRepository.create).mockResolvedValue(
        success(mockBucketItem)
      );

      const result = await createBucketItem(mockRepository)(insertData);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockBucketItem);
      }
      expect(mockRepository.create).toHaveBeenCalledWith(mockBucketItem);
    });

    it("バリデーションエラーの場合、Repository呼び出しなしでエラーが返されること", async () => {
      const insertData: BucketItemInsert = {
        title: "", // 空のタイトル
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        profile_id: "test-profile-id",
      };

      const mockValidationError = createValidationError(
        "title",
        "Title is required"
      );
      const { validateBucketItemInsert } = await import(
        "~/features/bucket-list/lib/business-logic"
      );
      vi.mocked(validateBucketItemInsert).mockReturnValue(
        failure(mockValidationError)
      );

      const result = await createBucketItem(mockRepository)(insertData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
      }
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateBucketItem", () => {
    it("有効なデータの場合、バリデーション後にバケットリスト項目が更新できること", async () => {
      const updateData: BucketItemUpdate = {
        title: "更新されたタイトル",
        description: "更新された説明",
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(
        success(mockBucketItem)
      );
      vi.mocked(mockRepository.update).mockResolvedValue(
        success({
          ...mockBucketItem,
          ...updateData,
        })
      );

      const result = await updateBucketItem(mockRepository)(
        "test-id",
        updateData
      );

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.title).toBe("更新されたタイトル");
      }
      expect(mockRepository.findById).toHaveBeenCalledWith("test-id");
      expect(mockRepository.update).toHaveBeenCalledWith(
        "test-id",
        mockBucketItem
      );
    });

    it("存在しないIDの場合、NotFoundエラーが返されること", async () => {
      const updateData: BucketItemUpdate = {
        title: "更新されたタイトル",
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(success(null));

      const result = await updateBucketItem(mockRepository)(
        "nonexistent-id",
        updateData
      );

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("NotFoundError");
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("完了済みアイテムの編集チェックでエラーの場合、適切なエラーが返されること", async () => {
      const updateData: BucketItemUpdate = {
        title: "更新されたタイトル",
      };

      const completedItem = { ...mockBucketItem, status: "completed" as const };
      vi.mocked(mockRepository.findById).mockResolvedValue(
        success(completedItem)
      );

      const mockBusinessError = createValidationError(
        "status",
        "Cannot edit completed item"
      );
      const { canEditCompletedItem } = await import(
        "~/features/bucket-list/lib/business-logic"
      );
      vi.mocked(canEditCompletedItem).mockReturnValue(
        failure(mockBusinessError)
      );

      const result = await updateBucketItem(mockRepository)(
        "test-id",
        updateData
      );

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
      }
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("completeBucketItem", () => {
    it("有効なIDの場合、完了データでバケットリスト項目が更新できること", async () => {
      const completedItem = { ...mockBucketItem, status: "completed" as const };

      vi.mocked(mockRepository.findById).mockResolvedValue(
        success(mockBucketItem)
      );
      vi.mocked(mockRepository.update).mockResolvedValue(
        success(completedItem)
      );

      // validateBucketItemUpdateとcanEditCompletedItemが成功を返すよう設定
      const { validateBucketItemUpdate, canEditCompletedItem } = await import(
        "~/features/bucket-list/lib/business-logic"
      );
      vi.mocked(validateBucketItemUpdate).mockReturnValue(
        success({
          status: "completed",
          completion_comment: "完了コメント",
          completed_at: expect.any(String),
        })
      );
      vi.mocked(canEditCompletedItem).mockReturnValue(success(true));

      const result = await completeBucketItem(mockRepository)(
        "test-id",
        "完了コメント"
      );

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.status).toBe("completed");
      }
      expect(mockRepository.update).toHaveBeenCalledWith(
        "test-id",
        expect.objectContaining({
          status: "completed",
          completion_comment: "完了コメント",
          completed_at: expect.any(String),
        })
      );
    });

    it("コメント未指定の場合、nullで更新されること", async () => {
      const completedItem = { ...mockBucketItem, status: "completed" as const };

      vi.mocked(mockRepository.findById).mockResolvedValue(
        success(mockBucketItem)
      );
      vi.mocked(mockRepository.update).mockResolvedValue(
        success(completedItem)
      );

      // validateBucketItemUpdateとcanEditCompletedItemが成功を返すよう設定
      const { validateBucketItemUpdate, canEditCompletedItem } = await import(
        "~/features/bucket-list/lib/business-logic"
      );
      vi.mocked(validateBucketItemUpdate).mockReturnValue(
        success({
          status: "completed",
          completion_comment: null,
          completed_at: expect.any(String),
        })
      );
      vi.mocked(canEditCompletedItem).mockReturnValue(success(true));

      const result = await completeBucketItem(mockRepository)("test-id");

      expect(isSuccess(result)).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith(
        "test-id",
        expect.objectContaining({
          status: "completed",
          completion_comment: null,
          completed_at: expect.any(String),
        })
      );
    });
  });

  describe("deleteBucketItem", () => {
    it("有効なIDの場合、バケットリスト項目が削除できること", async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(success(undefined));

      const result = await deleteBucketItem(mockRepository)("test-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBeUndefined();
      }
      expect(mockRepository.delete).toHaveBeenCalledWith("test-id");
    });

    it("削除に失敗した場合、Result<Failure>で返されること", async () => {
      const mockError = {
        type: "DatabaseError" as const,
        message: "Delete failed",
        operation: "delete" as const,
        code: "DELETE_ERROR",
      };
      vi.mocked(mockRepository.delete).mockResolvedValue(failure(mockError));

      const result = await deleteBucketItem(mockRepository)("test-id");

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toEqual(mockError);
      }
    });
  });

  describe("getBucketItemsByCategory", () => {
    it("ユーザーIDを指定した場合、カテゴリ別にグループ化された項目が取得できること", async () => {
      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(
        success([mockBucketItemWithCategory])
      );
      vi.mocked(mockRepository.findAllCategories).mockResolvedValue(
        success([mockCategory])
      );

      const result =
        await getBucketItemsByCategory(mockRepository)("test-profile-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([
          { category: mockCategory, items: [mockBucketItemWithCategory] },
        ]);
      }
      expect(mockRepository.findAllWithCategory).toHaveBeenCalledWith(
        { profile_id: "test-profile-id" },
        undefined
      );
      expect(mockRepository.findAllCategories).toHaveBeenCalled();
    });

    it("項目取得またはカテゴリ取得でエラーが発生した場合、Result<Failure>で返されること", async () => {
      const mockError = {
        type: "DatabaseError" as const,
        message: "Database error",
        operation: "read" as const,
        code: "DB_ERROR",
      };
      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(
        failure(mockError)
      );
      vi.mocked(mockRepository.findAllCategories).mockResolvedValue(
        success([mockCategory])
      );

      const result =
        await getBucketItemsByCategory(mockRepository)("test-profile-id");

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toEqual(mockError);
      }
    });
  });

  describe("getDashboardData", () => {
    it("ユーザーIDを指定した場合、ダッシュボードデータが取得できること", async () => {
      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(
        success([mockBucketItemWithCategory])
      );
      vi.mocked(mockRepository.findAllCategories).mockResolvedValue(
        success([mockCategory])
      );

      const result = await getDashboardData(mockRepository)("test-profile-id");

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toHaveProperty("items");
        expect(result.data).toHaveProperty("categories");
        expect(result.data).toHaveProperty("stats");
        expect(result.data).toHaveProperty("itemsByCategory");
        expect(result.data).toHaveProperty("recentCompletedItems");
        expect(result.data).toHaveProperty("upcomingItems");
      }
    });

    it("項目取得またはカテゴリ取得でエラーが発生した場合、Result<Failure>で返されること", async () => {
      const mockError = {
        type: "DatabaseError" as const,
        message: "Database error",
        operation: "read" as const,
        code: "DB_ERROR",
      };
      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(
        failure(mockError)
      );
      vi.mocked(mockRepository.findAllCategories).mockResolvedValue(
        success([mockCategory])
      );

      const result = await getDashboardData(mockRepository)("test-profile-id");

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toEqual(mockError);
      }
    });
  });

  describe("createFunctionalBucketListService", () => {
    it("全てのService関数が適切にバインドされていること", () => {
      const service = createFunctionalBucketListService(mockRepository);

      expect(service).toHaveProperty("getUserBucketItems");
      expect(service).toHaveProperty("getUserBucketItemsWithCategory");
      expect(service).toHaveProperty("getPublicBucketItems");
      expect(service).toHaveProperty("getBucketItem");
      expect(service).toHaveProperty("createBucketItem");
      expect(service).toHaveProperty("updateBucketItem");
      expect(service).toHaveProperty("completeBucketItem");
      expect(service).toHaveProperty("deleteBucketItem");
      expect(service).toHaveProperty("getCategories");
      expect(service).toHaveProperty("getUserStats");
      expect(service).toHaveProperty("getBucketItemsByCategory");
      expect(service).toHaveProperty("getDashboardData");

      // 各関数が関数型であることを確認
      expect(typeof service.getUserBucketItems).toBe("function");
      expect(typeof service.createBucketItem).toBe("function");
      expect(typeof service.updateBucketItem).toBe("function");
    });

    it("Service関数経由でRepository操作が実行されること", async () => {
      const service = createFunctionalBucketListService(mockRepository);
      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(
        success([mockBucketItem])
      );

      const result = await service.getUserBucketItems("test-profile-id");

      expect(isSuccess(result)).toBe(true);
      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(
        "test-profile-id",
        undefined,
        undefined
      );
    });
  });
});
