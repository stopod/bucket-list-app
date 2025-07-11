/**
 * 関数型BucketListService - Result型を活用した安全なエラーハンドリング
 * カリー化された関数と関数合成による純粋な関数型アプローチ
 */

import type { FunctionalBucketListRepository } from "~/features/bucket-list/repositories/bucket-list.repository";
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
import { success } from "~/shared/types/result";
import { combineResults } from "~/shared/utils/result-helpers";
import { createNotFoundError } from "~/shared/types/errors";

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
 * バケットリスト項目取得（ユーザー別）
 */
export const getUserBucketItems =
  (repository: FunctionalBucketListRepository) =>
  async (
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort
  ): Promise<Result<BucketItem[], BucketListError>> => {
    return repository.findByProfileId(profileId, filters, sort);
  };

/**
 * バケットリスト項目取得（カテゴリ情報付き）
 */
export const getUserBucketItemsWithCategory =
  (repository: FunctionalBucketListRepository) =>
  async (
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort
  ): Promise<
    Result<(BucketItem & { category: Category })[], BucketListError>
  > => {
    const userFilters = {
      ...filters,
      profile_id: profileId,
    };

    return repository.findAllWithCategory(userFilters, sort);
  };

/**
 * 公開バケットリスト項目取得
 */
export const getPublicBucketItems =
  (repository: FunctionalBucketListRepository) =>
  async (
    filters?: BucketListFilters,
    sort?: BucketListSort
  ): Promise<Result<BucketItem[], BucketListError>> => {
    return repository.findPublic(filters, sort);
  };

/**
 * バケットリスト項目取得（ID指定）
 */
export const getBucketItem =
  (repository: FunctionalBucketListRepository) =>
  async (id: string): Promise<Result<BucketItem | null, BucketListError>> => {
    return repository.findById(id);
  };

/**
 * バケットリスト項目作成（バリデーション付き）
 */
export const createBucketItem =
  (repository: FunctionalBucketListRepository) =>
  async (
    data: BucketItemInsert
  ): Promise<Result<BucketItem, BucketListError>> => {
    // ビジネスロジック：バリデーション実行
    const validationResult = validateBucketItemInsert(data);
    if (!validationResult.success) {
      return validationResult;
    }

    // Repository操作実行
    return repository.create(validationResult.data);
  };

/**
 * バケットリスト項目更新（バリデーション・ビジネスルールチェック付き）
 */
export const updateBucketItem =
  (repository: FunctionalBucketListRepository) =>
  async (
    id: string,
    data: BucketItemUpdate
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

    // 注意: getBucketItemは今はnullも返すので、nullチェックが必要
    if (!existingItemResult.data) {
      return {
        success: false,
        error: createNotFoundError("bucket-item", id),
      };
    }

    const editCheckResult = canEditCompletedItem(existingItemResult.data);
    if (!editCheckResult.success) {
      return editCheckResult;
    }

    // Repository操作実行
    return repository.update(id, validationResult.data);
  };

/**
 * バケットリスト項目完了
 */
export const completeBucketItem =
  (repository: FunctionalBucketListRepository) =>
  async (
    id: string,
    comment?: string
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
  (repository: FunctionalBucketListRepository) =>
  async (id: string): Promise<Result<void, BucketListError>> => {
    return repository.delete(id);
  };

/**
 * カテゴリ一覧取得
 */
export const getCategories =
  (repository: FunctionalBucketListRepository) =>
  async (): Promise<Result<Category[], BucketListError>> => {
    return repository.findAllCategories();
  };

/**
 * ユーザー統計取得
 */
export const getUserStats =
  (repository: FunctionalBucketListRepository) =>
  async (
    profileId: string
  ): Promise<Result<UserBucketStats | null, BucketListError>> => {
    return repository.getUserStats(profileId);
  };

/**
 * カテゴリ別バケットリスト項目取得（ビジネスロジック使用）
 */
export const getBucketItemsByCategory =
  (repository: FunctionalBucketListRepository) =>
  async (
    profileId: string
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
  (repository: FunctionalBucketListRepository) =>
  async (
    profileId: string
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
    const stats = {
      ...computeUserStats(items), // Repository呼び出しの代わりに計算
      profile_id: profileId,
    };
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
  repository: FunctionalBucketListRepository
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
