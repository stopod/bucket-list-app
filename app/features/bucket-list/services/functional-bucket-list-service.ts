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
import { 
  success, 
  failure
} from "~/shared/types/result";
import { 
  wrapAsync, 
  combineResults
} from "~/shared/utils/result-helpers";
import { 
  createDatabaseError, 
  createNotFoundError, 
  createApplicationError 
} from "~/shared/types/errors";

/**
 * Repository操作のエラーを適切なBucketListErrorに変換するヘルパー
 */
const handleRepositoryError = (error: unknown, operation: string): BucketListError => {
  if (error instanceof Error) {
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      return createNotFoundError('bucket-item', undefined, error.message);
    }
    if (error.message.includes('database') || error.message.includes('supabase')) {
      return createDatabaseError(error.message, operation as any);
    }
    return createApplicationError(`${operation} failed: ${error.message}`, error);
  }
  return createApplicationError(`Unknown error in ${operation}`, new Error(String(error)));
};

/**
 * バケットリスト項目取得（ユーザー別）
 */
export const getUserBucketItems = (repository: BucketListRepository) => 
  async (
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort
  ): Promise<Result<BucketItem[], BucketListError>> => {
    return wrapAsync(
      () => repository.findByProfileId(profileId, filters, sort),
      (error: unknown) => handleRepositoryError(error, 'getUserBucketItems')
    );
  };

/**
 * バケットリスト項目取得（カテゴリ情報付き）
 */
export const getUserBucketItemsWithCategory = (repository: BucketListRepository) =>
  async (
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort
  ): Promise<Result<(BucketItem & { category: Category })[], BucketListError>> => {
    const userFilters = {
      ...filters,
      profile_id: profileId,
    };

    return wrapAsync(
      () => repository.findAllWithCategory(userFilters, sort),
      (error: unknown) => handleRepositoryError(error, 'getUserBucketItemsWithCategory')
    );
  };

/**
 * 公開バケットリスト項目取得
 */
export const getPublicBucketItems = (repository: BucketListRepository) =>
  async (
    filters?: BucketListFilters,
    sort?: BucketListSort
  ): Promise<Result<BucketItem[], BucketListError>> => {
    return wrapAsync(
      () => repository.findPublic(filters, sort),
      (error: unknown) => handleRepositoryError(error, 'getPublicBucketItems')
    );
  };

/**
 * バケットリスト項目取得（ID指定）
 */
export const getBucketItem = (repository: BucketListRepository) =>
  async (id: string): Promise<Result<BucketItem, BucketListError>> => {
    return wrapAsync(
      async () => {
        const item = await repository.findById(id);
        if (!item) {
          throw new Error(`Bucket item with id ${id} not found`);
        }
        return item;
      },
      (error: unknown) => handleRepositoryError(error, 'getBucketItem')
    );
  };

/**
 * getBucketItemのエイリアス（既存コードとの互換性のため）
 */
export const getBucketItemById = (repository: BucketListRepository) =>
  getBucketItem(repository);

/**
 * バケットリスト項目作成
 */
export const createBucketItem = (repository: BucketListRepository) =>
  async (data: BucketItemInsert): Promise<Result<BucketItem, BucketListError>> => {
    return wrapAsync(
      () => repository.create(data),
      (error: unknown) => handleRepositoryError(error, 'createBucketItem')
    );
  };

/**
 * バケットリスト項目更新
 */
export const updateBucketItem = (repository: BucketListRepository) =>
  async (id: string, data: BucketItemUpdate): Promise<Result<BucketItem, BucketListError>> => {
    return wrapAsync(
      () => repository.update(id, data),
      (error: unknown) => handleRepositoryError(error, 'updateBucketItem')
    );
  };

/**
 * バケットリスト項目完了
 */
export const completeBucketItem = (repository: BucketListRepository) =>
  async (id: string, comment?: string): Promise<Result<BucketItem, BucketListError>> => {
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
export const deleteBucketItem = (repository: BucketListRepository) =>
  async (id: string): Promise<Result<void, BucketListError>> => {
    return wrapAsync(
      () => repository.delete(id),
      (error: unknown) => handleRepositoryError(error, 'deleteBucketItem')
    );
  };

/**
 * カテゴリ一覧取得
 */
export const getCategories = (repository: BucketListRepository) =>
  async (): Promise<Result<Category[], BucketListError>> => {
    return wrapAsync(
      () => repository.findAllCategories(),
      (error: unknown) => handleRepositoryError(error, 'getCategories')
    );
  };

/**
 * カテゴリ取得（ID指定）
 */
export const getCategory = (repository: BucketListRepository) =>
  async (id: number): Promise<Result<Category, BucketListError>> => {
    return wrapAsync(
      async () => {
        const category = await repository.findCategoryById(id);
        if (!category) {
          throw new Error(`Category with id ${id} not found`);
        }
        return category;
      },
      (error: unknown) => handleRepositoryError(error, 'getCategory')
    );
  };

/**
 * ユーザー統計取得
 */
export const getUserStats = (repository: BucketListRepository) =>
  async (profileId: string): Promise<Result<UserBucketStats, BucketListError>> => {
    return wrapAsync(
      async () => {
        const stats = await repository.getUserStats(profileId);
        if (!stats) {
          throw new Error(`User stats for profile ${profileId} not found`);
        }
        return stats;
      },
      (error: unknown) => handleRepositoryError(error, 'getUserStats')
    );
  };

/**
 * カテゴリ別バケットリスト項目取得（ビジネスロジック）
 */
export const getBucketItemsByCategory = (repository: BucketListRepository) =>
  async (profileId: string): Promise<Result<Array<{ category: Category; items: (BucketItem & { category: Category })[] }>, BucketListError>> => {
    // 並行してデータを取得
    const itemsResult = await getUserBucketItemsWithCategory(repository)(profileId);
    const categoriesResult = await getCategories(repository)();

    // 両方の結果を組み合わせ
    const combinedResult = combineResults(itemsResult, categoriesResult);
    
    if (!combinedResult.success) {
      return combinedResult;
    }

    const [items, categories] = combinedResult.data;

    // カテゴリ別にグループ化（純粋関数として実装）
    const itemsByCategory = categories
      .map((category: Category) => ({
        category,
        items: items.filter((item: BucketItem & { category: Category }) => item.category_id === category.id),
      }))
      .filter((group: { category: Category; items: (BucketItem & { category: Category })[] }) => group.items.length > 0);

    return success(itemsByCategory);
  };

/**
 * ダッシュボードデータ取得（複合ビジネスロジック）
 */
export const getDashboardData = (repository: BucketListRepository) =>
  async (profileId: string): Promise<Result<{
    items: (BucketItem & { category: Category })[];
    categories: Category[];
    stats: UserBucketStats;
    itemsByCategory: Array<{ category: Category; items: (BucketItem & { category: Category })[] }>;
  }, BucketListError>> => {
    // 複数の並行処理
    const [itemsResult, categoriesResult, statsResult] = await Promise.all([
      getUserBucketItemsWithCategory(repository)(profileId),
      getCategories(repository)(),
      getUserStats(repository)(profileId),
    ]);

    // すべての結果を組み合わせ
    const combinedResult = combineResults(itemsResult, categoriesResult, statsResult);
    
    if (!combinedResult.success) {
      return combinedResult;
    }

    const [items, categories, stats] = combinedResult.data;

    // アイテムカテゴリ分類を取得
    const itemsByCategoryResult = await getBucketItemsByCategory(repository)(profileId);
    
    if (!itemsByCategoryResult.success) {
      return itemsByCategoryResult;
    }

    return success({
      items,
      categories,
      stats,
      itemsByCategory: itemsByCategoryResult.data,
    });
  };

/**
 * 関数型サービス操作を束ねるオブジェクト
 * 関数の一元管理と使いやすさのため
 */
export const createFunctionalBucketListService = (repository: BucketListRepository) => ({
  getUserBucketItems: getUserBucketItems(repository),
  getUserBucketItemsWithCategory: getUserBucketItemsWithCategory(repository),
  getPublicBucketItems: getPublicBucketItems(repository),
  getBucketItem: getBucketItem(repository),
  getBucketItemById: getBucketItemById(repository),
  createBucketItem: createBucketItem(repository),
  updateBucketItem: updateBucketItem(repository),
  completeBucketItem: completeBucketItem(repository),
  deleteBucketItem: deleteBucketItem(repository),
  getCategories: getCategories(repository),
  getCategory: getCategory(repository),
  getUserStats: getUserStats(repository),
  getBucketItemsByCategory: getBucketItemsByCategory(repository),
  getDashboardData: getDashboardData(repository),
});