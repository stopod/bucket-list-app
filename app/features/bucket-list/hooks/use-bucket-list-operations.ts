import { useCallback } from "react";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
  BucketListFilters,
  BucketListSort,
} from "~/features/bucket-list/types";
import type { BucketListRepository } from "~/features/bucket-list/repositories";
import type { Result } from "~/shared/types/result";
import type { BucketListError } from "~/shared/types/errors";
import {
  useResultOperation,
  useParallelResultOperations,
} from "~/shared/hooks/use-result-operation";
import {
  createFunctionalBucketListService,
  getUserBucketItems,
  getUserBucketItemsWithCategory,
  getBucketItem,
  createBucketItem,
  updateBucketItem,
  deleteBucketItem,
  getCategories,
  getUserStats,
  getDashboardData,
} from "~/features/bucket-list/services/functional-bucket-list-service";

/**
 * バケットリスト項目の取得Hook（Result型対応）
 */
export function useBucketListItems(repository: BucketListRepository) {
  return useResultOperation<BucketItem[], BucketListError>({
    initialData: [],
  });
}

/**
 * カテゴリ付きバケットリスト項目の取得Hook
 */
export function useBucketListItemsWithCategory(
  repository: BucketListRepository,
) {
  return useResultOperation<
    (BucketItem & { category: Category })[],
    BucketListError
  >({
    initialData: [],
  });
}

/**
 * 単一バケットリスト項目の取得Hook
 */
export function useBucketListItem(repository: BucketListRepository) {
  return useResultOperation<BucketItem, BucketListError>();
}

/**
 * バケットリスト項目作成Hook
 */
export function useCreateBucketItem(
  repository: BucketListRepository,
  options: {
    onSuccess?: (item: BucketItem) => void;
    onError?: (error: BucketListError) => void;
  } = {},
) {
  const { onSuccess, onError } = options;

  return useResultOperation<BucketItem, BucketListError>({
    onSuccess,
    onError,
  });
}

/**
 * バケットリスト項目更新Hook
 */
export function useUpdateBucketItem(
  repository: BucketListRepository,
  options: {
    onSuccess?: (item: BucketItem) => void;
    onError?: (error: BucketListError) => void;
  } = {},
) {
  const { onSuccess, onError } = options;

  return useResultOperation<BucketItem, BucketListError>({
    onSuccess,
    onError,
  });
}

/**
 * バケットリスト項目削除Hook
 */
export function useDeleteBucketItem(
  repository: BucketListRepository,
  options: {
    onSuccess?: () => void;
    onError?: (error: BucketListError) => void;
  } = {},
) {
  const { onSuccess, onError } = options;

  return useResultOperation<void, BucketListError>({
    onSuccess,
    onError,
  });
}

/**
 * カテゴリ一覧取得Hook
 */
export function useCategories(repository: BucketListRepository) {
  return useResultOperation<Category[], BucketListError>({
    initialData: [],
  });
}

/**
 * ユーザー統計取得Hook
 */
export function useUserStats(repository: BucketListRepository) {
  return useResultOperation<UserBucketStats, BucketListError>();
}

/**
 * ダッシュボードデータ取得Hook（複合データ）
 */
export function useDashboardData(repository: BucketListRepository) {
  return useResultOperation<
    {
      items: (BucketItem & { category: Category })[];
      categories: Category[];
      stats: UserBucketStats;
      itemsByCategory: Array<{
        category: Category;
        items: (BucketItem & { category: Category })[];
      }>;
      recentCompletedItems: BucketItem[];
      upcomingItems: BucketItem[];
    },
    BucketListError
  >({
    initialData: {
      items: [],
      categories: [],
      stats: {
        profile_id: null,
        display_name: null,
        total_items: 0,
        completed_items: 0,
        in_progress_items: 0,
        not_started_items: 0,
        completion_rate: 0,
      },
      itemsByCategory: [],
      recentCompletedItems: [],
      upcomingItems: [],
    },
  });
}

/**
 * 包括的なバケットリスト操作Hook
 * 全ての操作を一つのオブジェクトにまとめて提供
 */
export function useBucketListOperations(
  repository: BucketListRepository,
  options: {
    onItemCreated?: (item: BucketItem) => void;
    onItemUpdated?: (item: BucketItem) => void;
    onItemDeleted?: () => void;
    onError?: (error: BucketListError) => void;
  } = {},
) {
  const { onItemCreated, onItemUpdated, onItemDeleted, onError } = options;

  // 個別操作のHook
  const fetchItems = useBucketListItems(repository);
  const fetchItemsWithCategory = useBucketListItemsWithCategory(repository);
  const fetchItem = useBucketListItem(repository);
  const createItem = useCreateBucketItem(repository, {
    onSuccess: onItemCreated,
    onError,
  });
  const updateItem = useUpdateBucketItem(repository, {
    onSuccess: onItemUpdated,
    onError,
  });
  const deleteItem = useDeleteBucketItem(repository, {
    onSuccess: onItemDeleted,
    onError,
  });
  const fetchCategories = useCategories(repository);
  const fetchUserStats = useUserStats(repository);
  const fetchDashboardData = useDashboardData(repository);

  // 関数型サービスを使用した操作関数
  const functionalService = createFunctionalBucketListService(repository);

  const operations = {
    // データ取得操作
    loadUserItems: useCallback(
      async (
        profileId: string,
        filters?: BucketListFilters,
        sort?: BucketListSort,
      ) => {
        return await fetchItems.execute(
          functionalService.getUserBucketItems,
          profileId,
          filters,
          sort,
        );
      },
      [fetchItems, functionalService],
    ),

    loadUserItemsWithCategory: useCallback(
      async (
        profileId: string,
        filters?: BucketListFilters,
        sort?: BucketListSort,
      ) => {
        return await fetchItemsWithCategory.execute(
          functionalService.getUserBucketItemsWithCategory,
          profileId,
          filters,
          sort,
        );
      },
      [fetchItemsWithCategory, functionalService],
    ),

    loadItem: useCallback(
      async (id: string) => {
        return await fetchItem.execute(functionalService.getBucketItem, id);
      },
      [fetchItem, functionalService],
    ),

    // データ変更操作
    createItem: useCallback(
      async (data: BucketItemInsert) => {
        return await createItem.execute(
          functionalService.createBucketItem,
          data,
        );
      },
      [createItem, functionalService],
    ),

    updateItem: useCallback(
      async (id: string, data: BucketItemUpdate) => {
        return await updateItem.execute(
          functionalService.updateBucketItem,
          id,
          data,
        );
      },
      [updateItem, functionalService],
    ),

    completeItem: useCallback(
      async (id: string, comment?: string) => {
        return await updateItem.execute(
          functionalService.completeBucketItem,
          id,
          comment,
        );
      },
      [updateItem, functionalService],
    ),

    deleteItem: useCallback(
      async (id: string) => {
        return await deleteItem.execute(functionalService.deleteBucketItem, id);
      },
      [deleteItem, functionalService],
    ),

    // メタデータ取得操作
    loadCategories: useCallback(async () => {
      return await fetchCategories.execute(functionalService.getCategories);
    }, [fetchCategories, functionalService]),

    loadUserStats: useCallback(
      async (profileId: string) => {
        return await fetchUserStats.execute(
          functionalService.getUserStats,
          profileId,
        );
      },
      [fetchUserStats, functionalService],
    ),

    loadDashboardData: useCallback(
      async (profileId: string) => {
        return await fetchDashboardData.execute(
          functionalService.getDashboardData,
          profileId,
        );
      },
      [fetchDashboardData, functionalService],
    ),

    // 状態リセット操作
    resetAll: useCallback(() => {
      fetchItems.reset();
      fetchItemsWithCategory.reset();
      fetchItem.reset();
      createItem.reset();
      updateItem.reset();
      deleteItem.reset();
      fetchCategories.reset();
      fetchUserStats.reset();
      fetchDashboardData.reset();
    }, [
      fetchItems,
      fetchItemsWithCategory,
      fetchItem,
      createItem,
      updateItem,
      deleteItem,
      fetchCategories,
      fetchUserStats,
      fetchDashboardData,
    ]),

    // エラークリア操作
    clearErrors: useCallback(() => {
      fetchItems.clearError();
      fetchItemsWithCategory.clearError();
      fetchItem.clearError();
      createItem.clearError();
      updateItem.clearError();
      deleteItem.clearError();
      fetchCategories.clearError();
      fetchUserStats.clearError();
      fetchDashboardData.clearError();
    }, [
      fetchItems,
      fetchItemsWithCategory,
      fetchItem,
      createItem,
      updateItem,
      deleteItem,
      fetchCategories,
      fetchUserStats,
      fetchDashboardData,
    ]),
  };

  // 状態の集約
  const state = {
    // データ状態
    items: fetchItems.data,
    itemsWithCategory: fetchItemsWithCategory.data,
    currentItem: fetchItem.data,
    categories: fetchCategories.data,
    userStats: fetchUserStats.data,
    dashboardData: fetchDashboardData.data,

    // ローディング状態
    isLoadingItems: fetchItems.isLoading,
    isLoadingItem: fetchItem.isLoading,
    isCreating: createItem.isLoading,
    isUpdating: updateItem.isLoading,
    isDeleting: deleteItem.isLoading,
    isLoadingCategories: fetchCategories.isLoading,
    isLoadingStats: fetchUserStats.isLoading,
    isLoadingDashboard: fetchDashboardData.isLoading,

    // エラー状態
    itemsError: fetchItems.error,
    itemError: fetchItem.error,
    createError: createItem.error,
    updateError: updateItem.error,
    deleteError: deleteItem.error,
    categoriesError: fetchCategories.error,
    statsError: fetchUserStats.error,
    dashboardError: fetchDashboardData.error,

    // 成功状態
    isItemsLoaded: fetchItems.isSuccess,
    isItemLoaded: fetchItem.isSuccess,
    isItemCreated: createItem.isSuccess,
    isItemUpdated: updateItem.isSuccess,
    isItemDeleted: deleteItem.isSuccess,
    areCategoriesLoaded: fetchCategories.isSuccess,
    areStatsLoaded: fetchUserStats.isSuccess,
    isDashboardLoaded: fetchDashboardData.isSuccess,

    // 総合状態
    hasAnyError: !!(
      fetchItems.error ||
      fetchItem.error ||
      createItem.error ||
      updateItem.error ||
      deleteItem.error ||
      fetchCategories.error ||
      fetchUserStats.error ||
      fetchDashboardData.error
    ),
    isAnyLoading:
      fetchItems.isLoading ||
      fetchItem.isLoading ||
      createItem.isLoading ||
      updateItem.isLoading ||
      deleteItem.isLoading ||
      fetchCategories.isLoading ||
      fetchUserStats.isLoading ||
      fetchDashboardData.isLoading,
  };

  return {
    ...operations,
    ...state,
  };
}
