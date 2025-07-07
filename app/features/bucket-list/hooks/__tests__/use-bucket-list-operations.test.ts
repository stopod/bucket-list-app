import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBucketListOperations } from "../use-bucket-list-operations";
import type { BucketListRepository } from "~/features/bucket-list/repositories";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
  BucketListFilters,
  BucketListSort,
} from "~/features/bucket-list/types";
import type { BucketListError } from "~/shared/types/errors";

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
  display_name: "テストユーザー",
  total_items: 10,
  completed_items: 3,
  in_progress_items: 2,
  not_started_items: 5,
  completion_rate: 0.3,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const mockBucketItemWithCategory = {
  ...mockBucketItem,
  category: mockCategory,
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

const mockError: BucketListError = {
  type: "DatabaseError",
  message: "データベースエラーが発生しました",
  details: "Connection failed",
};

describe("useBucketListOperations", () => {
  let mockRepository: BucketListRepository;

  beforeEach(() => {
    mockRepository = {
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
    };
  });

  describe("初期化", () => {
    it("初期状態が正しく設定されること", () => {
      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      expect(result.current.items).toEqual([]);
      expect(result.current.itemsWithCategory).toEqual([]);
      expect(result.current.currentItem).toBeNull();
      expect(result.current.categories).toEqual([]);
      expect(result.current.userStats).toBeNull();
      expect(result.current.dashboardData).toBeDefined();
      expect(result.current.dashboardData.items).toEqual([]);
      expect(result.current.dashboardData.categories).toEqual([]);
      expect(result.current.dashboardData.stats.total_items).toBe(0);
    });

    it("コールバックオプションが正しく設定されること", () => {
      const onItemCreated = vi.fn();
      const onItemUpdated = vi.fn();
      const onItemDeleted = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository, {
          onItemCreated,
          onItemUpdated,
          onItemDeleted,
          onError,
        })
      );

      expect(result.current.createItem).toBeDefined();
      expect(result.current.updateItem).toBeDefined();
      expect(result.current.deleteItem).toBeDefined();
    });
  });

  describe("データ取得操作", () => {
    it("loadUserItemsが正しく動作すること", async () => {
      const mockItems = [mockBucketItem];
      mockRepository.findByProfileId = vi.fn().mockResolvedValue(mockItems);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.loadUserItems("user-123");
      });

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith("user-123", undefined, undefined);
    });

    it("loadUserItemsWithCategoryが正しく動作すること", async () => {
      const mockItemsWithCategory = [mockBucketItemWithCategory];
      mockRepository.findByProfileId = vi.fn().mockResolvedValue(mockItemsWithCategory);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.loadUserItemsWithCategory("user-123");
      });

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith("user-123", undefined, undefined);
    });

    it("loadUserItemsでフィルターとソートが適用されること", async () => {
      const filters: BucketListFilters = {
        category_id: 1,
        priority: "high",
        status: "not_started",
      };
      const sort: BucketListSort = {
        field: "created_at",
        direction: "desc",
      };

      mockRepository.findByProfileId = vi.fn().mockResolvedValue([mockBucketItem]);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.loadUserItems("user-123", filters, sort);
      });

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith("user-123", filters, sort);
    });

    it("loadItemが正しく動作すること", async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(mockBucketItem);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.loadItem("test-id");
      });

      expect(mockRepository.findById).toHaveBeenCalledWith("test-id");
    });

    it("loadCategoriesが正しく動作すること", async () => {
      const mockCategories = [mockCategory];
      mockRepository.findAllCategories = vi.fn().mockResolvedValue(mockCategories);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(mockRepository.findAllCategories).toHaveBeenCalled();
    });

    it("loadUserStatsが正しく動作すること", async () => {
      mockRepository.getUserStats = vi.fn().mockResolvedValue(mockUserStats);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.loadUserStats("user-123");
      });

      expect(mockRepository.getUserStats).toHaveBeenCalledWith("user-123");
    });
  });

  describe("データ変更操作", () => {
    it("createItemが正しく動作すること", async () => {
      const mockCreatedItem = { ...mockBucketItem, ...mockInsertData };
      mockRepository.create = vi.fn().mockResolvedValue(mockCreatedItem);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.createItem(mockInsertData);
      });

      expect(mockRepository.create).toHaveBeenCalledWith(mockInsertData);
    });

    it("updateItemが正しく動作すること", async () => {
      const mockUpdatedItem = { ...mockBucketItem, ...mockUpdateData };
      mockRepository.update = vi.fn().mockResolvedValue(mockUpdatedItem);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.updateItem("test-id", mockUpdateData);
      });

      expect(mockRepository.update).toHaveBeenCalledWith("test-id", mockUpdateData);
    });

    it("completeItemが正しく動作すること", async () => {
      const mockCompletedItem = { ...mockBucketItem, status: "completed" as const };
      mockRepository.update = vi.fn().mockResolvedValue(mockCompletedItem);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.completeItem("test-id", "完了コメント");
      });

      expect(mockRepository.update).toHaveBeenCalledWith("test-id", {
        status: "completed",
        completed_comment: "完了コメント",
      });
    });

    it("deleteItemが正しく動作すること", async () => {
      mockRepository.delete = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.deleteItem("test-id");
      });

      expect(mockRepository.delete).toHaveBeenCalledWith("test-id");
    });
  });

  describe("コールバック処理", () => {
    it("createItem成功時にonItemCreatedが呼ばれること", async () => {
      const onItemCreated = vi.fn();
      const mockCreatedItem = { ...mockBucketItem, ...mockInsertData };
      mockRepository.create = vi.fn().mockResolvedValue(mockCreatedItem);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository, { onItemCreated })
      );

      await act(async () => {
        await result.current.createItem(mockInsertData);
      });

      expect(onItemCreated).toHaveBeenCalledWith(mockCreatedItem);
    });

    it("updateItem成功時にonItemUpdatedが呼ばれること", async () => {
      const onItemUpdated = vi.fn();
      const mockUpdatedItem = { ...mockBucketItem, ...mockUpdateData };
      mockRepository.update = vi.fn().mockResolvedValue(mockUpdatedItem);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository, { onItemUpdated })
      );

      await act(async () => {
        await result.current.updateItem("test-id", mockUpdateData);
      });

      expect(onItemUpdated).toHaveBeenCalledWith(mockUpdatedItem);
    });

    it("deleteItem成功時にonItemDeletedが呼ばれること", async () => {
      const onItemDeleted = vi.fn();
      mockRepository.delete = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository, { onItemDeleted })
      );

      await act(async () => {
        await result.current.deleteItem("test-id");
      });

      expect(onItemDeleted).toHaveBeenCalled();
    });

    it("エラー時にonErrorが呼ばれること", async () => {
      const onError = vi.fn();
      mockRepository.create = vi.fn().mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository, { onError })
      );

      await act(async () => {
        try {
          await result.current.createItem(mockInsertData);
        } catch (error) {
          // エラーは内部でハンドリングされる
        }
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("状態管理", () => {
    it("ローディング状態が正しく更新されること", async () => {
      let resolveCreate: (value: BucketItem) => void;
      const createPromise = new Promise<BucketItem>((resolve) => {
        resolveCreate = resolve;
      });
      mockRepository.create = vi.fn().mockReturnValue(createPromise);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      // 操作開始
      const createPromiseResult = act(async () => {
        await result.current.createItem(mockInsertData);
      });

      // ローディング状態の確認
      expect(result.current.isCreating).toBe(true);
      expect(result.current.isAnyLoading).toBe(true);

      // 操作完了
      act(() => {
        resolveCreate!({ ...mockBucketItem, ...mockInsertData });
      });

      await createPromiseResult;

      // ローディング状態の確認
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isItemCreated).toBe(true);
    });

    it("エラー状態が正しく更新されること", async () => {
      const testError = new Error("Test error");
      mockRepository.create = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        try {
          await result.current.createItem(mockInsertData);
        } catch (error) {
          // エラーは内部でハンドリングされる
        }
      });

      expect(result.current.createError).toBeDefined();
      expect(result.current.hasAnyError).toBe(true);
    });
  });

  describe("状態リセット・エラークリア", () => {
    it("resetAllが全ての状態をリセットすること", async () => {
      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      // 状態をセット
      await act(async () => {
        // 何らかの操作を実行してから状態をリセット
        result.current.resetAll();
      });

      // 状態がリセットされていることを確認
      expect(result.current.items).toEqual([]);
      expect(result.current.itemsWithCategory).toEqual([]);
      expect(result.current.currentItem).toBeUndefined();
      expect(result.current.categories).toEqual([]);
      expect(result.current.userStats).toBeUndefined();
    });

    it("clearErrorsが全てのエラーをクリアすること", async () => {
      const testError = new Error("Test error");
      mockRepository.create = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      // エラーを発生させる
      await act(async () => {
        try {
          await result.current.createItem(mockInsertData);
        } catch (error) {
          // エラーは内部でハンドリングされる
        }
      });

      // エラーがあることを確認
      expect(result.current.hasAnyError).toBe(true);

      // エラーをクリア
      act(() => {
        result.current.clearErrors();
      });

      // エラーがクリアされていることを確認
      expect(result.current.createError).toBeUndefined();
      expect(result.current.hasAnyError).toBe(false);
    });
  });

  describe("複合操作", () => {
    it("loadDashboardDataが正しく動作すること", async () => {
      const mockDashboardData = {
        items: [mockBucketItemWithCategory],
        categories: [mockCategory],
        stats: mockUserStats,
        itemsByCategory: [
          {
            category: mockCategory,
            items: [mockBucketItemWithCategory],
          },
        ],
        recentCompletedItems: [],
        upcomingItems: [],
      };

      // 複数のRepository操作をモック
      mockRepository.findAllWithCategory = vi.fn().mockResolvedValue([mockBucketItemWithCategory]);
      mockRepository.findAllCategories = vi.fn().mockResolvedValue([mockCategory]);
      mockRepository.getUserStats = vi.fn().mockResolvedValue(mockUserStats);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        await result.current.loadDashboardData("user-123");
      });

      expect(mockRepository.findAllWithCategory).toHaveBeenCalled();
      expect(mockRepository.findAllCategories).toHaveBeenCalled();
      expect(mockRepository.getUserStats).toHaveBeenCalledWith("user-123");
      expect(result.current.isDashboardLoaded).toBe(true);
    });

    it("並行でのデータ取得が正しく動作すること", async () => {
      mockRepository.findByProfileId = vi.fn().mockResolvedValue([mockBucketItem]);
      mockRepository.findAllCategories = vi.fn().mockResolvedValue([mockCategory]);
      mockRepository.getUserStats = vi.fn().mockResolvedValue(mockUserStats);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      // 複数の操作を並行実行
      await act(async () => {
        await Promise.all([
          result.current.loadUserItems("user-123"),
          result.current.loadCategories(),
          result.current.loadUserStats("user-123"),
        ]);
      });

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith("user-123", undefined, undefined);
      expect(mockRepository.findAllCategories).toHaveBeenCalled();
      expect(mockRepository.getUserStats).toHaveBeenCalledWith("user-123");
      expect(result.current.isItemsLoaded).toBe(true);
      expect(result.current.areCategoriesLoaded).toBe(true);
      expect(result.current.areStatsLoaded).toBe(true);
    });
  });

  describe("エラー処理", () => {
    it("Repository層のエラーが適切に処理されること", async () => {
      const repositoryError = new Error("Database connection failed");
      mockRepository.findByProfileId = vi.fn().mockRejectedValue(repositoryError);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        try {
          await result.current.loadUserItems("user-123");
        } catch (error) {
          // エラーは内部でハンドリングされる
        }
      });

      expect(result.current.itemsError).toBeDefined();
      expect(result.current.hasAnyError).toBe(true);
    });

    it("複数のエラーが同時に発生した場合、適切に処理されること", async () => {
      const itemsError = new Error("Items fetch failed");
      const categoriesError = new Error("Categories fetch failed");
      
      mockRepository.findByProfileId = vi.fn().mockRejectedValue(itemsError);
      mockRepository.findAllCategories = vi.fn().mockRejectedValue(categoriesError);

      const { result } = renderHook(() =>
        useBucketListOperations(mockRepository)
      );

      await act(async () => {
        try {
          await Promise.all([
            result.current.loadUserItems("user-123"),
            result.current.loadCategories(),
          ]);
        } catch (error) {
          // エラーは内部でハンドリングされる
        }
      });

      expect(result.current.itemsError).toBeDefined();
      expect(result.current.categoriesError).toBeDefined();
      expect(result.current.hasAnyError).toBe(true);
    });
  });
});