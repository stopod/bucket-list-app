import type {
  BucketItem,
  Category,
  UserBucketStats,
} from "~/features/bucket-list/types";
import type { BucketListRepository } from "~/features/bucket-list/repositories";
import type { BucketListError } from "~/shared/types/errors";
import { useResultOperation } from "~/shared/hooks/use-result-operation";

/**
 * バケットリスト項目作成Hook
 */
export function useCreateBucketItem(
  repository: BucketListRepository,
  options: {
    onSuccess?: (item: BucketItem) => void;
    onError?: (error: BucketListError) => void;
  } = {}
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
  } = {}
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
  } = {}
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
export function useCategories(_repository: BucketListRepository) {
  return useResultOperation<Category[], BucketListError>({
    initialData: [],
  });
}

/**
 * ダッシュボードデータ取得Hook（複合データ）
 */
export function useDashboardData(_repository: BucketListRepository) {
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
