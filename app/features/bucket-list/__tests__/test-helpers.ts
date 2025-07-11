/**
 * テストヘルパー関数群
 * テストコードの可読性と保守性を向上させるためのユーティリティ
 */

import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
} from "~/features/bucket-list/types";

/**
 * テスト用のBucketItemを生成するファクトリ関数
 */
export const createMockBucketItem = (
  overrides: Partial<BucketItem> = {}
): BucketItem => ({
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
  ...overrides,
});

/**
 * テスト用のBucketItemInsertを生成するファクトリ関数
 */
export const createMockBucketItemInsert = (
  overrides: Partial<BucketItemInsert> = {}
): BucketItemInsert => ({
  title: "新しいアイテム",
  description: "新しい説明",
  category_id: 1,
  priority: "high",
  status: "not_started",
  due_date: "2024-12-31",
  due_type: "specific_date",
  is_public: false,
  profile_id: "test-profile-id",
  ...overrides,
});

/**
 * テスト用のBucketItemUpdateを生成するファクトリ関数
 */
export const createMockBucketItemUpdate = (
  overrides: Partial<BucketItemUpdate> = {}
): BucketItemUpdate => ({
  title: "更新されたタイトル",
  description: "更新された説明",
  priority: "medium",
  status: "in_progress",
  ...overrides,
});

/**
 * テスト用のCategoryを生成するファクトリ関数
 */
export const createMockCategory = (
  overrides: Partial<Category> = {}
): Category => ({
  id: 1,
  name: "テストカテゴリ",
  color: "bg-blue-100",
  created_at: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

/**
 * テスト用のUserBucketStatsを生成するファクトリ関数
 */
export const createMockUserStats = (
  overrides: Partial<UserBucketStats> = {}
): UserBucketStats => ({
  profile_id: "test-profile-id",
  display_name: "テストユーザー",
  total_items: 10,
  completed_items: 5,
  in_progress_items: 3,
  not_started_items: 2,
  completion_rate: 50.0,
  ...overrides,
});

/**
 * テスト用のBucketItemWithCategoryを生成するファクトリ関数
 */
export const createMockBucketItemWithCategory = (
  itemOverrides: Partial<BucketItem> = {},
  categoryOverrides: Partial<Category> = {}
) => ({
  ...createMockBucketItem(itemOverrides),
  category: createMockCategory(categoryOverrides),
});

/**
 * 複数のBucketItemを生成するヘルパー関数
 */
export const createMockBucketItems = (
  count: number,
  overrideFn?: (index: number) => Partial<BucketItem>
): BucketItem[] => {
  return Array.from({ length: count }, (_, index) => {
    const baseOverrides = overrideFn ? overrideFn(index) : {};
    return createMockBucketItem({
      id: `item-${index + 1}`,
      title: `テストアイテム${index + 1}`,
      ...baseOverrides,
    });
  });
};

/**
 * 複数のCategoryを生成するヘルパー関数
 */
export const createMockCategories = (
  count: number,
  overrideFn?: (index: number) => Partial<Category>
): Category[] => {
  return Array.from({ length: count }, (_, index) => {
    const baseOverrides = overrideFn ? overrideFn(index) : {};
    return createMockCategory({
      id: index + 1,
      name: `テストカテゴリ${index + 1}`,
      ...baseOverrides,
    });
  });
};

/**
 * 各ステータスのBucketItemを生成するヘルパー関数
 */
export const createMockBucketItemsByStatus = () => ({
  notStarted: createMockBucketItem({
    id: "not-started-item",
    title: "未着手アイテム",
    status: "not_started",
  }),
  inProgress: createMockBucketItem({
    id: "in-progress-item",
    title: "進行中アイテム",
    status: "in_progress",
  }),
  completed: createMockBucketItem({
    id: "completed-item",
    title: "完了済みアイテム",
    status: "completed",
    completed_at: "2024-01-15T10:00:00.000Z",
  }),
});

/**
 * 各優先度のBucketItemを生成するヘルパー関数
 */
export const createMockBucketItemsByPriority = () => ({
  high: createMockBucketItem({
    id: "high-priority-item",
    title: "高優先度アイテム",
    priority: "high",
  }),
  medium: createMockBucketItem({
    id: "medium-priority-item",
    title: "中優先度アイテム",
    priority: "medium",
  }),
  low: createMockBucketItem({
    id: "low-priority-item",
    title: "低優先度アイテム",
    priority: "low",
  }),
});

/**
 * 日付範囲内のBucketItemを生成するヘルパー関数
 */
export const createMockBucketItemsWithDates = (
  startDate: string,
  endDate: string,
  count: number
): BucketItem[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Array.from({ length: count }, (_, index) => {
    const randomDays = Math.floor(Math.random() * daysDiff);
    const randomDate = new Date(
      start.getTime() + randomDays * 24 * 60 * 60 * 1000
    );

    return createMockBucketItem({
      id: `date-item-${index + 1}`,
      title: `日付アイテム${index + 1}`,
      due_date: randomDate.toISOString().split("T")[0],
    });
  });
};

/**
 * バリデーションエラーを引き起こすデータを生成するヘルパー関数
 */
export const createInvalidBucketItemData = () => ({
  emptyTitle: createMockBucketItemInsert({ title: "" }),
  longTitle: createMockBucketItemInsert({ title: "a".repeat(201) }),
  longDescription: createMockBucketItemInsert({
    description: "a".repeat(1001),
  }),
  invalidPriority: {
    ...createMockBucketItemInsert(),
    priority: "invalid",
  } as BucketItemInsert,
  invalidStatus: {
    ...createMockBucketItemInsert(),
    status: "invalid",
  } as BucketItemInsert,
  invalidDate: createMockBucketItemInsert({ due_date: "invalid-date" }),
});

/**
 * 完了済みアイテムを完了日付順でソートして生成するヘルパー関数
 */
export const createMockCompletedItemsWithDates = (
  count: number
): BucketItem[] => {
  const baseDate = new Date("2024-01-01T00:00:00.000Z");

  return Array.from({ length: count }, (_, index) => {
    const completedDate = new Date(
      baseDate.getTime() + index * 24 * 60 * 60 * 1000
    );

    return createMockBucketItem({
      id: `completed-item-${index + 1}`,
      title: `完了済みアイテム${index + 1}`,
      status: "completed",
      completed_at: completedDate.toISOString(),
    });
  });
};

/**
 * 期限が設定されたアイテムを生成するヘルパー関数
 */
export const createMockItemsWithUpcomingDates = (
  baseDays: number,
  count: number
): BucketItem[] => {
  const today = new Date();

  return Array.from({ length: count }, (_, index) => {
    const dueDate = new Date(
      today.getTime() + (baseDays + index) * 24 * 60 * 60 * 1000
    );

    return createMockBucketItem({
      id: `upcoming-item-${index + 1}`,
      title: `期限アイテム${index + 1}`,
      status: "not_started",
      due_date: dueDate.toISOString().split("T")[0],
    });
  });
};

/**
 * カテゴリ別の統計データを生成するヘルパー関数
 */
export const createMockCategoryStats = (
  categories: Category[],
  itemsPerCategory: number,
  completionRate: number
) => {
  return categories.map((category) => {
    const totalItems = itemsPerCategory;
    const completedItems = Math.floor(totalItems * completionRate);

    return {
      category,
      total: totalItems,
      completed: completedItems,
      rate: Math.round((completedItems / totalItems) * 100),
    };
  });
};

/**
 * テスト実行時の日付を固定するヘルパー関数
 */
export const mockDateToFixed = (fixedDate: string) => {
  const fixed = new Date(fixedDate);
  const originalDate = global.Date;

  global.Date = class extends originalDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(fixed.getTime());
      } else {
        super(...(args as ConstructorParameters<typeof Date>));
      }
    }
  } as typeof Date;

  return () => {
    global.Date = originalDate;
  };
};

/**
 * テスト用のダッシュボードデータを生成するヘルパー関数
 */
export const createMockDashboardData = (
  itemCount: number = 10,
  categoryCount: number = 3,
  completionRate: number = 0.5
) => {
  const categories = createMockCategories(categoryCount);
  const items = createMockBucketItems(itemCount, (index) => ({
    category_id: (index % categoryCount) + 1,
    status:
      index < Math.floor(itemCount * completionRate)
        ? "completed"
        : "not_started",
    completed_at:
      index < Math.floor(itemCount * completionRate)
        ? new Date(
            Date.now() - (itemCount - index) * 24 * 60 * 60 * 1000
          ).toISOString()
        : undefined,
  }));

  const itemsWithCategory = items.map((item) => ({
    ...item,
    category: categories.find((c) => c.id === item.category_id)!,
  }));

  const stats = createMockUserStats({
    total_items: itemCount,
    completed_items: Math.floor(itemCount * completionRate),
    completion_rate: completionRate * 100,
  });

  return {
    items: itemsWithCategory,
    categories,
    stats,
    itemsByCategory: categories.map((category) => ({
      category,
      items: itemsWithCategory.filter(
        (item) => item.category_id === category.id
      ),
    })),
    recentCompletedItems: itemsWithCategory
      .filter((item) => item.status === "completed")
      .slice(0, 5),
    upcomingItems: itemsWithCategory
      .filter((item) => item.status !== "completed" && item.due_date)
      .slice(0, 5),
  };
};
