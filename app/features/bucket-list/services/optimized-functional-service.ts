/**
 * 最適化された関数型BucketListService
 * パフォーマンス最適化とメモ化を活用した高性能版
 */

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

import type { Result } from "~/shared/types/result";
import type { BucketListError } from "~/shared/types/errors";
import { success, failure } from "~/shared/types/result";
import { wrapAsync, combineResults } from "~/shared/utils/result-helpers";
import {
  createDatabaseError,
  createNotFoundError,
  createApplicationError,
} from "~/shared/types/errors";

// 最適化ヘルパーの使用
import {
  lazyResult,
  optimizedCurry,
  createMemoizedSelector,
  optimizedPipeline,
  createBatchProcessor,
  createOptimizedErrorHandler,
} from "~/shared/utils/performance-optimized-helpers";

import {
  groupItemsByCategory as groupItems,
  validateBucketItemInsert,
  validateBucketItemUpdate,
  canEditCompletedItem,
  getRecentlyCompletedItems,
  getUpcomingItems,
  calculateUserStats as computeUserStats,
} from "~/features/bucket-list/lib/business-logic";

/**
 * 最適化されたエラーハンドラー
 */
const optimizedErrorHandler = createOptimizedErrorHandler<BucketListError>({
  'not found': (error) => createNotFoundError("bucket-item", undefined, error instanceof Error ? error.message : String(error)),
  'permission denied': (error) => createApplicationError("権限がありません", error),
  'network': (error) => createDatabaseError("ネットワークエラー", error),
  'timeout': (error) => createDatabaseError("タイムアウト", error),
  'default': (error) => createDatabaseError("予期しないエラー", error),
});

/**
 * メモ化されたセレクター
 */
const selectActiveItems = createMemoizedSelector(
  (items: BucketItem[]) => items.filter(item => item.status !== 'completed'),
  (a, b) => a.length === b.length && a.every((item, index) => item.id === b[index].id)
);

const selectCompletedItems = createMemoizedSelector(
  (items: BucketItem[]) => items.filter(item => item.status === 'completed'),
  (a, b) => a.length === b.length && a.every((item, index) => item.id === b[index].id)
);

const selectItemsByCategory = createMemoizedSelector(
  (items: BucketItem[]) => groupItems(items),
  (a, b) => Object.keys(a).length === Object.keys(b).length
);

/**
 * 最適化されたバッチ処理
 */
const createOptimizedBatchProcessor = (repository: BucketListRepository) => {
  return createBatchProcessor(
    async (items: BucketItemInsert[]) => {
      const results: BucketItem[] = [];
      for (const item of items) {
        try {
          const result = await repository.create(item);
          results.push(result);
        } catch (error) {
          throw optimizedErrorHandler(error);
        }
      }
      return results;
    },
    5, // バッチサイズ
    200 // デバウンス時間
  );
};

/**
 * 最適化されたファクトリー関数
 */
export const createOptimizedFunctionalBucketListService = (
  repository: BucketListRepository
) => {
  // バッチ処理インスタンス
  const batchProcessor = createOptimizedBatchProcessor(repository);
  
  // カリー化された関数群
  const curriedFindById = optimizedCurry(
    async (id: number, options?: { includeDeleted?: boolean }) => {
      try {
        const item = await repository.findById(id);
        if (!item) {
          throw new Error(`Item with id ${id} not found`);
        }
        return item;
      } catch (error) {
        throw optimizedErrorHandler(error);
      }
    }
  );

  const curriedUpdate = optimizedCurry(
    async (id: number, data: BucketItemUpdate) => {
      try {
        const updated = await repository.update(id, data);
        if (!updated) {
          throw new Error(`Failed to update item with id ${id}`);
        }
        return updated;
      } catch (error) {
        throw optimizedErrorHandler(error);
      }
    }
  );

  /**
   * 最適化されたアイテム取得
   */
  const getOptimizedBucketItems = lazyResult(
    () => wrapAsync(async () => {
      const items = await repository.findAllWithCategory();
      return items;
    }),
    optimizedErrorHandler
  );

  /**
   * 最適化されたパイプライン処理
   */
  const processItemsWithPipeline = optimizedPipeline(
    (items: BucketItem[]) => items.filter(item => item.status !== 'deleted'),
    (items: BucketItem[]) => items.sort((a, b) => 
      new Date(b.updated_at || b.created_at).getTime() - 
      new Date(a.updated_at || a.created_at).getTime()
    ),
    (items: BucketItem[]) => items.slice(0, 100) // 最大100件に制限
  );

  return {
    /**
     * 最適化されたアイテム取得
     */
    getUserBucketItems: async (profileId: string): Promise<Result<BucketItem[], BucketListError>> => {
      return wrapAsync(async () => {
        const items = await repository.findByProfileId(profileId);
        return processItemsWithPipeline(items);
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたアイテム作成
     */
    createBucketItem: async (data: BucketItemInsert): Promise<Result<BucketItem, BucketListError>> => {
      return wrapAsync(async () => {
        const validationResult = validateBucketItemInsert(data);
        if (validationResult.success === false) {
          throw new Error(validationResult.error.message);
        }
        
        const item = await repository.create(data);
        return item;
      }, optimizedErrorHandler);
    },

    /**
     * バッチ作成（最適化）
     */
    createBucketItemsBatch: async (items: BucketItemInsert[]): Promise<Result<BucketItem[], BucketListError>> => {
      return wrapAsync(async () => {
        const results = await Promise.all(
          items.map(item => batchProcessor(item))
        );
        return results;
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたアイテム更新
     */
    updateBucketItem: async (id: number, data: BucketItemUpdate): Promise<Result<BucketItem, BucketListError>> => {
      return wrapAsync(async () => {
        const validationResult = validateBucketItemUpdate(data);
        if (validationResult.success === false) {
          throw new Error(validationResult.error.message);
        }
        
        const updateFn = curriedUpdate(id);
        return await updateFn(data);
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたアイテム削除
     */
    deleteBucketItem: async (id: number): Promise<Result<boolean, BucketListError>> => {
      return wrapAsync(async () => {
        const result = await repository.delete(id);
        return result;
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたアイテム取得（ID指定）
     */
    getBucketItem: async (id: number): Promise<Result<BucketItem, BucketListError>> => {
      return wrapAsync(async () => {
        const getFn = curriedFindById(id);
        return await getFn();
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたカテゴリ取得
     */
    getCategories: async (): Promise<Result<Category[], BucketListError>> => {
      return wrapAsync(async () => {
        const categories = await repository.findAllCategories();
        return categories;
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたフィルタリング
     */
    getBucketItemsByStatus: async (status: string): Promise<Result<BucketItem[], BucketListError>> => {
      return wrapAsync(async () => {
        const items = await repository.findByStatus(status);
        return processItemsWithPipeline(items);
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたカテゴリ別取得
     */
    getBucketItemsByCategory: async (categoryId: number): Promise<Result<BucketItem[], BucketListError>> => {
      return wrapAsync(async () => {
        const items = await repository.findByCategory(categoryId);
        return processItemsWithPipeline(items);
      }, optimizedErrorHandler);
    },

    /**
     * 最適化された統計計算
     */
    getUserStats: async (profileId: string): Promise<Result<UserBucketStats, BucketListError>> => {
      return wrapAsync(async () => {
        const items = await repository.findByProfileId(profileId);
        const processedItems = processItemsWithPipeline(items);
        
        // メモ化されたセレクターを使用
        const activeItems = selectActiveItems(processedItems);
        const completedItems = selectCompletedItems(processedItems);
        
        const stats = computeUserStats(processedItems);
        
        return {
          profile_id: profileId,
          display_name: null,
          total_items: processedItems.length,
          completed_items: completedItems.length,
          in_progress_items: activeItems.filter(item => item.status === 'in_progress').length,
          not_started_items: activeItems.filter(item => item.status === 'not_started').length,
          completion_rate: stats.completion_rate,
        };
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたダッシュボードデータ
     */
    getDashboardData: async (profileId: string): Promise<Result<{
      items: BucketItem[];
      stats: UserBucketStats;
      recentlyCompleted: BucketItem[];
      upcomingItems: BucketItem[];
      categoryGroups: Record<string, BucketItem[]>;
    }, BucketListError>> => {
      return wrapAsync(async () => {
        const items = await repository.findByProfileId(profileId);
        const processedItems = processItemsWithPipeline(items);
        
        // 並列処理で統計を計算
        const [stats, recentlyCompleted, upcomingItems] = await Promise.all([
          computeUserStats(processedItems),
          getRecentlyCompletedItems(processedItems),
          getUpcomingItems(processedItems),
        ]);
        
        // メモ化されたセレクターを使用
        const categoryGroups = selectItemsByCategory(processedItems);
        
        return {
          items: processedItems,
          stats: {
            profile_id: profileId,
            display_name: null,
            total_items: processedItems.length,
            completed_items: selectCompletedItems(processedItems).length,
            in_progress_items: selectActiveItems(processedItems).filter(item => item.status === 'in_progress').length,
            not_started_items: selectActiveItems(processedItems).filter(item => item.status === 'not_started').length,
            completion_rate: stats.completion_rate,
          },
          recentlyCompleted,
          upcomingItems,
          categoryGroups,
        };
      }, optimizedErrorHandler);
    },

    /**
     * 最適化されたキャッシュクリア
     */
    clearCache: () => {
      // メモ化されたセレクターのキャッシュをクリア
      // 実際の実装では WeakMap を使用しているため自動的にガベージコレクションされる
    },

    /**
     * パフォーマンス統計
     */
    getPerformanceStats: () => {
      return {
        memoryUsage: process.memoryUsage(),
        cacheSize: 0, // 実際の実装では適切な値を返す
        batchProcessingEnabled: true,
        optimizationsEnabled: true,
      };
    },
  };
};

/**
 * 最適化されたサービスの型定義
 */
export type OptimizedFunctionalBucketListService = ReturnType<typeof createOptimizedFunctionalBucketListService>;