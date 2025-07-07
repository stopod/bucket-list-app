import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBucketListOperations } from "../use-bucket-list-operations";
import type { BucketListRepository } from "~/features/bucket-list/repositories";

describe("useBucketListOperations - 基本テスト", () => {
  let mockRepository: BucketListRepository;

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      findAllWithCategory: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      findByProfileId: vi.fn().mockResolvedValue([]),
      findPublic: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
      findAllCategories: vi.fn().mockResolvedValue([]),
      findCategoryById: vi.fn().mockResolvedValue(null),
      getUserStats: vi.fn().mockResolvedValue(null),
    };
  });

  it("Hookが正しく初期化されること", () => {
    const { result } = renderHook(() =>
      useBucketListOperations(mockRepository)
    );

    // 基本的なプロパティが存在することを確認
    expect(result.current).toBeDefined();
    expect(typeof result.current.loadUserItems).toBe("function");
    expect(typeof result.current.loadUserItemsWithCategory).toBe("function");
    expect(typeof result.current.loadItem).toBe("function");
    expect(typeof result.current.createItem).toBe("function");
    expect(typeof result.current.updateItem).toBe("function");
    expect(typeof result.current.deleteItem).toBe("function");
    expect(typeof result.current.loadCategories).toBe("function");
    expect(typeof result.current.loadUserStats).toBe("function");
    expect(typeof result.current.loadDashboardData).toBe("function");
    expect(typeof result.current.resetAll).toBe("function");
    expect(typeof result.current.clearErrors).toBe("function");
  });

  it("コールバックオプションでHookが作成できること", () => {
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

    expect(result.current).toBeDefined();
    expect(typeof result.current.createItem).toBe("function");
    expect(typeof result.current.updateItem).toBe("function");
    expect(typeof result.current.deleteItem).toBe("function");
  });

  it("初期状態の値が適切に設定されること", () => {
    const { result } = renderHook(() =>
      useBucketListOperations(mockRepository)
    );

    // データの初期状態
    expect(result.current.items).toEqual([]);
    expect(result.current.itemsWithCategory).toEqual([]);
    expect(result.current.categories).toEqual([]);

    // ローディング状態の初期状態
    expect(result.current.isLoadingItems).toBe(false);
    expect(result.current.isLoadingItem).toBe(false);
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.isLoadingCategories).toBe(false);
    expect(result.current.isLoadingStats).toBe(false);
    expect(result.current.isLoadingDashboard).toBe(false);

    // 成功状態の初期状態
    expect(result.current.isItemsLoaded).toBe(false);
    expect(result.current.isItemLoaded).toBe(false);
    expect(result.current.isItemCreated).toBe(false);
    expect(result.current.isItemUpdated).toBe(false);
    expect(result.current.isItemDeleted).toBe(false);
    expect(result.current.areCategoriesLoaded).toBe(false);
    expect(result.current.areStatsLoaded).toBe(false);
    expect(result.current.isDashboardLoaded).toBe(false);

    // 総合状態の初期状態
    expect(result.current.hasAnyError).toBe(false);
    expect(result.current.isAnyLoading).toBe(false);
  });

  it("dashboardDataの初期状態が正しく設定されること", () => {
    const { result } = renderHook(() =>
      useBucketListOperations(mockRepository)
    );

    const dashboardData = result.current.dashboardData;
    expect(dashboardData).toBeDefined();
    expect(dashboardData.items).toEqual([]);
    expect(dashboardData.categories).toEqual([]);
    expect(dashboardData.itemsByCategory).toEqual([]);
    expect(dashboardData.recentCompletedItems).toEqual([]);
    expect(dashboardData.upcomingItems).toEqual([]);
    expect(dashboardData.stats).toBeDefined();
    expect(dashboardData.stats.total_items).toBe(0);
    expect(dashboardData.stats.completed_items).toBe(0);
    expect(dashboardData.stats.in_progress_items).toBe(0);
    expect(dashboardData.stats.not_started_items).toBe(0);
    expect(dashboardData.stats.completion_rate).toBe(0);
  });

  it("resetAll関数とclearErrors関数が存在すること", () => {
    const { result } = renderHook(() =>
      useBucketListOperations(mockRepository)
    );

    expect(typeof result.current.resetAll).toBe("function");
    expect(typeof result.current.clearErrors).toBe("function");

    // TDD: 関数を呼び出してもエラーが発生しないことを確認（act()でラップ）
    act(() => {
      result.current.resetAll();
    });
    
    act(() => {
      result.current.clearErrors();
    });
    
    // 実行後もエラーが発生しないことを確認
    expect(result.current.hasAnyError).toBe(false);
  });
});