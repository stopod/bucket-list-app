/**
 * 関数型BucketListService - Result型を活用した安全なエラーハンドリング
 * クラスベースからの関数型アプローチへの変換
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

// ビジネスロジック関数のインポート
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
 * Repository操作のエラーを適切なBucketListErrorに変換するヘルパー
 */
const handleRepositoryError = (
  error: unknown,
  operation: string,
): BucketListError => {
  if (error instanceof Error) {
    if (
      error.message.includes("not found") ||
      error.message.includes("Not found")
    ) {
      return createNotFoundError("bucket-item", undefined, error.message);
    }
    if (
      error.message.includes("database") ||
      error.message.includes("supabase")
    ) {
      return createDatabaseError(error.message, operation as any);
    }
    return createApplicationError(
      `${operation} failed: ${error.message}`,
      error,
    );
  }
  return createApplicationError(
    `Unknown error in ${operation}`,
    new Error(String(error)),
  );
};

/**
 * バケットリスト項目取得（ユーザー別）
 */
export const getUserBucketItems =
  (repository: BucketListRepository) =>
  async (
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ): Promise<Result<BucketItem[], BucketListError>> => {
    return wrapAsync(
      () => repository.findByProfileId(profileId, filters, sort),
      (error: unknown) => handleRepositoryError(error, "getUserBucketItems"),
    );
  };

/**
 * バケットリスト項目取得（カテゴリ情報付き）
 */
export const getUserBucketItemsWithCategory =
  (repository: BucketListRepository) =>
  async (
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ): Promise<
    Result<(BucketItem & { category: Category })[], BucketListError>
  > => {
    const userFilters = {
      ...filters,
      profile_id: profileId,
    };

    return wrapAsync(
      () => repository.findAllWithCategory(userFilters, sort),
      (error: unknown) =>
        handleRepositoryError(error, "getUserBucketItemsWithCategory"),
    );
  };

/**
 * 公開バケットリスト項目取得
 */
export const getPublicBucketItems =
  (repository: BucketListRepository) =>
  async (
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ): Promise<Result<BucketItem[], BucketListError>> => {
    return wrapAsync(
      () => repository.findPublic(filters, sort),
      (error: unknown) => handleRepositoryError(error, "getPublicBucketItems"),
    );
  };

/**
 * バケットリスト項目取得（ID指定）
 */
export const getBucketItem =
  (repository: BucketListRepository) =>
  async (id: string): Promise<Result<BucketItem, BucketListError>> => {
    return wrapAsync(
      async () => {
        const item = await repository.findById(id);
        if (!item) {
          throw new Error(`Bucket item with id ${id} not found`);
        }
        return item;
      },
      (error: unknown) => handleRepositoryError(error, "getBucketItem"),
    );
  };

/**
 * バケットリスト項目作成（バリデーション付き）
 */
export const createBucketItem =
  (repository: BucketListRepository) =>
  async (
    data: BucketItemInsert,
  ): Promise<Result<BucketItem, BucketListError>> => {
    // ビジネスロジック：バリデーション実行
    const validationResult = validateBucketItemInsert(data);
    if (!validationResult.success) {
      return validationResult;
    }

    // Repository操作実行
    return wrapAsync(
      () => repository.create(validationResult.data),
      (error: unknown) => handleRepositoryError(error, "createBucketItem"),
    );
  };

/**
 * バケットリスト項目更新（バリデーション・ビジネスルールチェック付き）
 */
export const updateBucketItem =
  (repository: BucketListRepository) =>
  async (
    id: string,
    data: BucketItemUpdate,
  ): Promise<Result<BucketItem, BucketListError>> => {
    // ビジネスロジック：バリデーション実行
    const validationResult = validateBucketItemUpdate(data);
    if (!validationResult.success) {
      return validationResult;
    }

    // 既存アイテム取得してビジネスルールチェック
    const existingItemResult = await getBucketItem(repository)(id);
    if (!existingItemResult.success) {
      return existingItemResult;
    }

    const editCheckResult = canEditCompletedItem(existingItemResult.data);
    if (!editCheckResult.success) {
      return editCheckResult;
    }

    // Repository操作実行
    return wrapAsync(
      () => repository.update(id, validationResult.data),
      (error: unknown) => handleRepositoryError(error, "updateBucketItem"),
    );
  };

/**
 * バケットリスト項目完了
 */
export const completeBucketItem =
  (repository: BucketListRepository) =>
  async (
    id: string,
    comment?: string,
  ): Promise<Result<BucketItem, BucketListError>> => {
    const updateData: BucketItemUpdate = {
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_comment: comment || null,
    };

    return updateBucketItem(repository)(id, updateData);
  };

/**
 * バケットリスト項目削除
 */
export const deleteBucketItem =
  (repository: BucketListRepository) =>
  async (id: string): Promise<Result<void, BucketListError>> => {
    return wrapAsync(
      () => repository.delete(id),
      (error: unknown) => handleRepositoryError(error, "deleteBucketItem"),
    );
  };

/**
 * カテゴリ一覧取得
 */
export const getCategories =
  (repository: BucketListRepository) =>
  async (): Promise<Result<Category[], BucketListError>> => {
    return wrapAsync(
      () => repository.findAllCategories(),
      (error: unknown) => handleRepositoryError(error, "getCategories"),
    );
  };

/**
 * ユーザー統計取得
 */
export const getUserStats =
  (repository: BucketListRepository) =>
  async (
    profileId: string,
  ): Promise<Result<UserBucketStats, BucketListError>> => {
    return wrapAsync(
      async () => {
        const stats = await repository.getUserStats(profileId);
        if (!stats) {
          throw new Error(`User stats for profile ${profileId} not found`);
        }
        return stats;
      },
      (error: unknown) => handleRepositoryError(error, "getUserStats"),
    );
  };

/**
 * カテゴリ別バケットリスト項目取得（ビジネスロジック使用）
 */
export const getBucketItemsByCategory =
  (repository: BucketListRepository) =>
  async (
    profileId: string,
  ): Promise<
    Result<
      Array<{
        category: Category;
        items: (BucketItem & { category: Category })[];
      }>,
      BucketListError
    >
  > => {
    // 並行してデータを取得
    const itemsResult =
      await getUserBucketItemsWithCategory(repository)(profileId);
    const categoriesResult = await getCategories(repository)();

    // 両方の結果を組み合わせ
    const combinedResult = combineResults(itemsResult, categoriesResult);

    if (!combinedResult.success) {
      return combinedResult;
    }

    const [items, categories] = combinedResult.data;

    // ビジネスロジック関数を使用してカテゴリ別にグループ化
    const itemsByCategory = groupItems(items, categories) as Array<{
      category: Category;
      items: (BucketItem & { category: Category })[];
    }>;

    return success(itemsByCategory);
  };

/**
 * ダッシュボードデータ取得（複合ビジネスロジック使用）
 */
export const getDashboardData =
  (repository: BucketListRepository) =>
  async (
    profileId: string,
  ): Promise<
    Result<
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
    >
  > => {
    // 複数の並行処理
    const [itemsResult, categoriesResult] = await Promise.all([
      getUserBucketItemsWithCategory(repository)(profileId),
      getCategories(repository)(),
    ]);

    // 結果を組み合わせ
    const combinedResult = combineResults(itemsResult, categoriesResult);

    if (!combinedResult.success) {
      return combinedResult;
    }

    const [items, categories] = combinedResult.data;

    // ビジネスロジック関数を使用して各種データを計算
    const stats = computeUserStats(items); // Repository呼び出しの代わりに計算
    const itemsByCategory = groupItems(items, categories) as Array<{
      category: Category;
      items: (BucketItem & { category: Category })[];
    }>;
    const recentCompletedItems = getRecentlyCompletedItems(items, 5);
    const upcomingItems = getUpcomingItems(items, 30, 5);

    return success({
      items,
      categories,
      stats,
      itemsByCategory,
      recentCompletedItems,
      upcomingItems,
    });
  };

/**
 * 関数型サービス操作を束ねるオブジェクト
 * 関数の一元管理と使いやすさのため
 */
export const createFunctionalBucketListService = (
  repository: BucketListRepository,
) => ({
  getUserBucketItems: getUserBucketItems(repository),
  getUserBucketItemsWithCategory: getUserBucketItemsWithCategory(repository),
  getPublicBucketItems: getPublicBucketItems(repository),
  getBucketItem: getBucketItem(repository),
  createBucketItem: createBucketItem(repository),
  updateBucketItem: updateBucketItem(repository),
  completeBucketItem: completeBucketItem(repository),
  deleteBucketItem: deleteBucketItem(repository),
  getCategories: getCategories(repository),
  getUserStats: getUserStats(repository),
  getBucketItemsByCategory: getBucketItemsByCategory(repository),
  getDashboardData: getDashboardData(repository),
});
