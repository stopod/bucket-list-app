/**
 * バケットリスト ビジネスロジック - 純粋関数群
 * 副作用のないビジネスロジックをここに集約
 */

import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
} from "~/features/bucket-list/types";

import type { Result } from "~/shared/types/result";
import type { BucketListError, ValidationError } from "~/shared/types/errors";
import { success, failure } from "~/shared/types/result";
import {
  createValidationError,
  createBusinessRuleError,
} from "~/shared/types/errors";

/**
 * 統計計算 - 達成率の計算
 */
export const calculateAchievementRate = (items: BucketItem[]): number => {
  if (items.length === 0) {
    return 0;
  }
  const completedCount = items.filter(
    (item) => item.status === "completed"
  ).length;
  return Math.round((completedCount / items.length) * 100);
};

/**
 * 統計計算 - カテゴリ別統計の計算
 */
export const calculateCategoryStats = (
  items: BucketItem[],
  categories: Category[]
): Array<{
  category: Category;
  total: number;
  completed: number;
  rate: number;
}> => {
  return categories
    .map((category) => {
      const categoryItems = items.filter(
        (item) => item.category_id === category.id
      );
      const completedItems = categoryItems.filter(
        (item) => item.status === "completed"
      );
      const rate =
        categoryItems.length > 0
          ? Math.round((completedItems.length / categoryItems.length) * 100)
          : 0;

      return {
        category,
        total: categoryItems.length,
        completed: completedItems.length,
        rate,
      };
    })
    .filter((stats) => stats.total > 0); // アイテムがあるカテゴリのみ
};

/**
 * 統計計算 - ユーザー全体統計の計算
 */
export const calculateUserStats = (items: BucketItem[]): UserBucketStats => {
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const inProgress = items.filter(
    (item) => item.status === "in_progress"
  ).length;
  const notStarted = items.filter(
    (item) => item.status === "not_started"
  ).length;

  return {
    profile_id: null, // 計算時点では不明
    display_name: null, // 計算時点では不明
    total_items: total,
    completed_items: completed,
    in_progress_items: inProgress,
    not_started_items: notStarted,
    completion_rate: calculateAchievementRate(items),
  };
};

/**
 * データ変換 - カテゴリ別グループ化
 */
export const groupItemsByCategory = (
  items: BucketItem[],
  categories: Category[]
): Array<{ category: Category; items: BucketItem[] }> => {
  return categories
    .map((category) => ({
      category,
      items: items.filter((item) => item.category_id === category.id),
    }))
    .filter((group) => group.items.length > 0);
};

/**
 * バリデーション - バケットリスト項目作成データの検証
 */
export const validateBucketItemInsert = (
  data: BucketItemInsert
): Result<BucketItemInsert, BucketListError> => {
  const errors: ValidationError[] = [];

  // タイトルの検証
  if (!data.title || data.title.trim().length === 0) {
    errors.push(createValidationError("title", "タイトルは必須です"));
  } else if (data.title.length > 200) {
    errors.push(
      createValidationError("title", "タイトルは200文字以内で入力してください")
    );
  }

  // 説明の検証
  if (data.description && data.description.length > 1000) {
    errors.push(
      createValidationError(
        "description",
        "説明は1000文字以内で入力してください"
      )
    );
  }

  // 優先度の検証
  if (data.priority && !["high", "medium", "low"].includes(data.priority)) {
    errors.push(createValidationError("priority", "無効な優先度です"));
  }

  // ステータスの検証
  if (
    data.status &&
    !["not_started", "in_progress", "completed"].includes(data.status)
  ) {
    errors.push(createValidationError("status", "無効なステータスです"));
  }

  // 期限の検証
  if (data.due_date) {
    const dueDate = new Date(data.due_date);
    if (isNaN(dueDate.getTime())) {
      errors.push(createValidationError("due_date", "無効な日付形式です"));
    }
  }

  if (errors.length > 0) {
    return failure(errors[0]); // 最初のエラーを返す
  }

  return success(data);
};

/**
 * バリデーション - バケットリスト項目更新データの検証
 */
export const validateBucketItemUpdate = (
  data: BucketItemUpdate
): Result<BucketItemUpdate, BucketListError> => {
  const errors: ValidationError[] = [];

  // タイトルの検証（更新時は任意）
  if (data.title !== undefined) {
    if (data.title.trim().length === 0) {
      errors.push(createValidationError("title", "タイトルは空にできません"));
    } else if (data.title.length > 200) {
      errors.push(
        createValidationError(
          "title",
          "タイトルは200文字以内で入力してください"
        )
      );
    }
  }

  // 説明の検証
  if (
    data.description !== undefined &&
    data.description !== null &&
    data.description.length > 1000
  ) {
    errors.push(
      createValidationError(
        "description",
        "説明は1000文字以内で入力してください"
      )
    );
  }

  // 優先度の検証
  if (data.priority && !["high", "medium", "low"].includes(data.priority)) {
    errors.push(createValidationError("priority", "無効な優先度です"));
  }

  // ステータスの検証
  if (
    data.status &&
    !["not_started", "in_progress", "completed"].includes(data.status)
  ) {
    errors.push(createValidationError("status", "無効なステータスです"));
  }

  // 期限の検証
  if (data.due_date) {
    const dueDate = new Date(data.due_date);
    if (isNaN(dueDate.getTime())) {
      errors.push(createValidationError("due_date", "無効な日付形式です"));
    }
  }

  if (errors.length > 0) {
    return failure(errors[0]);
  }

  return success(data);
};

/**
 * ビジネスルール - 完了済みアイテムの編集可否チェック
 */
export const canEditCompletedItem = (
  item: BucketItem
): Result<boolean, BucketListError> => {
  if (item.status === "completed") {
    return failure(
      createBusinessRuleError(
        "completed_item_edit",
        "完了済みのアイテムは編集できません",
        { itemId: item.id, status: item.status }
      )
    );
  }
  return success(true);
};

/**
 * データ変換 - 最近完了したアイテムの抽出
 */
export const getRecentlyCompletedItems = (
  items: BucketItem[],
  limit: number = 5
): BucketItem[] => {
  return items
    .filter((item) => item.status === "completed" && item.completed_at)
    .sort(
      (a, b) =>
        new Date(b.completed_at!).getTime() -
        new Date(a.completed_at!).getTime()
    )
    .slice(0, limit);
};

/**
 * データ変換 - 期限が近いアイテムの抽出
 */
export const getUpcomingItems = (
  items: BucketItem[],
  days: number = 30,
  limit: number = 5
): BucketItem[] => {
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);

  return items
    .filter((item) => {
      if (!item.due_date || item.status === "completed") {
        return false;
      }
      const dueDate = new Date(item.due_date);
      return dueDate >= now && dueDate <= future;
    })
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    )
    .slice(0, limit);
};
