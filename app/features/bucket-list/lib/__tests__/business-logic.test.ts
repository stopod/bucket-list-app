/**
 * ビジネスロジック純粋関数群のテスト
 * 副作用のない純粋関数の動作検証
 */

import { describe, it, expect } from "vitest";
import {
  calculateAchievementRate,
  calculateCategoryStats,
  calculateUserStats,
  groupItemsByCategory,
  validateBucketItemInsert,
  validateBucketItemUpdate,
  canEditCompletedItem,
  getRecentlyCompletedItems,
  getUpcomingItems,
} from "../business-logic";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
} from "~/features/bucket-list/types";
import { isSuccess, isFailure } from "~/shared/types/result";

// テスト用のモックデータ
const mockCategories: Category[] = [
  {
    id: 1,
    name: "旅行・観光",
    color: "bg-blue-100",
    created_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "スキル習得",
    color: "bg-green-100",
    created_at: "2024-01-01T00:00:00.000Z",
  },
];

const mockBucketItems: BucketItem[] = [
  {
    id: "item-1",
    title: "東京タワー観光",
    description: "東京タワーに登る",
    category_id: 1,
    priority: "high",
    status: "completed",
    due_date: "2024-12-31",
    due_type: "specific_date",
    is_public: false,
    profile_id: "profile-1",
    completed_at: "2024-01-15T10:00:00.000Z",
    completion_comment: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "item-2",
    title: "TypeScript習得",
    description: "TypeScriptを学ぶ",
    category_id: 2,
    priority: "medium",
    status: "in_progress",
    due_date: "2024-06-30",
    due_type: "specific_date",
    is_public: true,
    profile_id: "profile-1",
    completed_at: null,
    completion_comment: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "item-3",
    title: "京都旅行",
    description: "京都を旅行する",
    category_id: 1,
    priority: "low",
    status: "not_started",
    due_date: "2024-05-15",
    due_type: "specific_date",
    is_public: false,
    profile_id: "profile-1",
    completed_at: null,
    completion_comment: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "item-4",
    title: "React習得",
    description: "Reactを学ぶ",
    category_id: 2,
    priority: "high",
    status: "completed",
    due_date: "2024-03-31",
    due_type: "specific_date",
    is_public: true,
    profile_id: "profile-1",
    completed_at: "2024-01-10T15:30:00.000Z",
    completion_comment: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-10T15:30:00.000Z",
  },
];

describe("統計計算関数", () => {
  describe("calculateAchievementRate", () => {
    it("項目が空の場合、0%が返されること", () => {
      const result = calculateAchievementRate([]);
      expect(result).toBe(0);
    });

    it("全て完了の場合、100%が返されること", () => {
      const completedItems = mockBucketItems.filter(
        (item) => item.status === "completed"
      );
      const result = calculateAchievementRate(completedItems);
      expect(result).toBe(100);
    });

    it("一部完了の場合、適切な達成率が返されること", () => {
      const result = calculateAchievementRate(mockBucketItems);
      // 4項目中2項目完了 = 50%
      expect(result).toBe(50);
    });

    it("完了項目がない場合、0%が返されること", () => {
      const notCompletedItems = mockBucketItems.filter(
        (item) => item.status !== "completed"
      );
      const result = calculateAchievementRate(notCompletedItems);
      expect(result).toBe(0);
    });
  });

  describe("calculateCategoryStats", () => {
    it("カテゴリ別の統計が正しく計算されること", () => {
      const result = calculateCategoryStats(mockBucketItems, mockCategories);

      expect(result).toHaveLength(2);

      // 旅行・観光カテゴリの統計
      const travelStats = result.find((stat) => stat.category.id === 1);
      expect(travelStats).toBeDefined();
      if (travelStats) {
        expect(travelStats.total).toBe(2);
        expect(travelStats.completed).toBe(1);
        expect(travelStats.rate).toBe(50);
      }

      // スキル習得カテゴリの統計
      const skillStats = result.find((stat) => stat.category.id === 2);
      expect(skillStats).toBeDefined();
      if (skillStats) {
        expect(skillStats.total).toBe(2);
        expect(skillStats.completed).toBe(1);
        expect(skillStats.rate).toBe(50);
      }
    });

    it("項目のないカテゴリは除外されること", () => {
      const emptyCategory: Category = {
        id: 3,
        name: "空カテゴリ",
        color: "bg-gray-100",
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const categoriesWithEmpty = [...mockCategories, emptyCategory];

      const result = calculateCategoryStats(
        mockBucketItems,
        categoriesWithEmpty
      );

      expect(result).toHaveLength(2);
      expect(result.every((stat) => stat.category.id !== 3)).toBe(true);
    });
  });

  describe("calculateUserStats", () => {
    it("ユーザー統計が正しく計算されること", () => {
      const result = calculateUserStats(mockBucketItems);

      expect(result.total_items).toBe(4);
      expect(result.completed_items).toBe(2);
      expect(result.in_progress_items).toBe(1);
      expect(result.not_started_items).toBe(1);
      expect(result.completion_rate).toBe(50);
      expect(result.profile_id).toBeNull();
      expect(result.display_name).toBeNull();
    });

    it("空の項目配列の場合、0で統計が計算されること", () => {
      const result = calculateUserStats([]);

      expect(result.total_items).toBe(0);
      expect(result.completed_items).toBe(0);
      expect(result.in_progress_items).toBe(0);
      expect(result.not_started_items).toBe(0);
      expect(result.completion_rate).toBe(0);
    });
  });
});

describe("データ変換関数", () => {
  describe("groupItemsByCategory", () => {
    it("カテゴリ別にアイテムがグループ化されること", () => {
      const result = groupItemsByCategory(mockBucketItems, mockCategories);

      expect(result).toHaveLength(2);

      // 旅行・観光カテゴリのグループ
      const travelGroup = result.find((group) => group.category.id === 1);
      expect(travelGroup).toBeDefined();
      if (travelGroup) {
        expect(travelGroup.items).toHaveLength(2);
        expect(travelGroup.items.every((item) => item.category_id === 1)).toBe(
          true
        );
      }

      // スキル習得カテゴリのグループ
      const skillGroup = result.find((group) => group.category.id === 2);
      expect(skillGroup).toBeDefined();
      if (skillGroup) {
        expect(skillGroup.items).toHaveLength(2);
        expect(skillGroup.items.every((item) => item.category_id === 2)).toBe(
          true
        );
      }
    });

    it("項目のないカテゴリは除外されること", () => {
      const emptyCategory: Category = {
        id: 3,
        name: "空カテゴリ",
        color: "bg-gray-100",
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const categoriesWithEmpty = [...mockCategories, emptyCategory];

      const result = groupItemsByCategory(mockBucketItems, categoriesWithEmpty);

      expect(result).toHaveLength(2);
      expect(result.every((group) => group.category.id !== 3)).toBe(true);
    });
  });

  describe("getRecentlyCompletedItems", () => {
    it("最近完了したアイテムが新しい順で取得されること", () => {
      const result = getRecentlyCompletedItems(mockBucketItems, 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("item-1"); // 2024-01-15完了
      expect(result[1].id).toBe("item-4"); // 2024-01-10完了
    });

    it("完了日がないアイテムは除外されること", () => {
      const itemWithoutCompletedAt = {
        ...mockBucketItems[0],
        completed_at: null,
      };
      const itemsWithoutCompletedAt = [
        itemWithoutCompletedAt,
        ...mockBucketItems.slice(1),
      ];

      const result = getRecentlyCompletedItems(itemsWithoutCompletedAt, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("item-4");
    });

    it("完了していないアイテムは除外されること", () => {
      const result = getRecentlyCompletedItems(mockBucketItems, 5);

      expect(result).toHaveLength(2);
      expect(result.every((item) => item.status === "completed")).toBe(true);
    });

    it("制限数を超えた場合、指定された数まで取得されること", () => {
      const result = getRecentlyCompletedItems(mockBucketItems, 1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("item-1");
    });
  });

  describe("getUpcomingItems", () => {
    it("期限が近いアイテムが期限順で取得されること", () => {
      // 現在日時を固定して比較的近い未来の日付を設定
      const now = new Date("2024-05-01T00:00:00.000Z");
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(now.getTime());
          } else {
            super(...(args as ConstructorParameters<typeof Date>));
          }
        }
      } as any;

      const result = getUpcomingItems(mockBucketItems, 30, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("item-3"); // 2024-05-15期限

      global.Date = originalDate;
    });

    it("期限がないアイテムは除外されること", () => {
      const itemWithoutDueDate = {
        ...mockBucketItems[0],
        due_date: null,
      };
      const itemsWithoutDueDate = [
        itemWithoutDueDate,
        ...mockBucketItems.slice(1),
      ];

      const now = new Date("2024-05-01T00:00:00.000Z");
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(now.getTime());
          } else {
            super(...(args as ConstructorParameters<typeof Date>));
          }
        }
      } as any;

      const result = getUpcomingItems(itemsWithoutDueDate, 30, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("item-3");

      global.Date = originalDate;
    });

    it("完了済みアイテムは除外されること", () => {
      const now = new Date("2024-05-01T00:00:00.000Z");
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(now.getTime());
          } else {
            super(...(args as ConstructorParameters<typeof Date>));
          }
        }
      } as any;

      const result = getUpcomingItems(mockBucketItems, 30, 5);

      expect(result.every((item) => item.status !== "completed")).toBe(true);

      global.Date = originalDate;
    });
  });
});

describe("バリデーション関数", () => {
  describe("validateBucketItemInsert", () => {
    it("有効なデータの場合、Result<Success>で返されること", () => {
      const validData: BucketItemInsert = {
        title: "有効なタイトル",
        description: "有効な説明",
        category_id: 1,
        priority: "high",
        status: "not_started",
        due_date: "2024-12-31",
        due_type: "specific_date",
        is_public: false,
        profile_id: "profile-1",
      };

      const result = validateBucketItemInsert(validData);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(validData);
      }
    });

    it("タイトルが空の場合、バリデーションエラーが返されること", () => {
      const invalidData: BucketItemInsert = {
        title: "",
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        profile_id: "profile-1",
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
        expect(result.error.message).toContain("タイトルは必須です");
      }
    });

    it("タイトルが200文字を超える場合、バリデーションエラーが返されること", () => {
      const longTitle = "a".repeat(201);
      const invalidData: BucketItemInsert = {
        title: longTitle,
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        profile_id: "profile-1",
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
        expect(result.error.message).toContain("200文字以内");
      }
    });

    it("説明が1000文字を超える場合、バリデーションエラーが返されること", () => {
      const longDescription = "a".repeat(1001);
      const invalidData: BucketItemInsert = {
        title: "有効なタイトル",
        description: longDescription,
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
        profile_id: "profile-1",
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
        expect(result.error.message).toContain("1000文字以内");
      }
    });

    it("無効な優先度の場合、バリデーションエラーが返されること", () => {
      const invalidData: BucketItemInsert = {
        title: "有効なタイトル",
        category_id: 1,
        priority: "invalid" as any,
        status: "not_started",
        is_public: false,
        profile_id: "profile-1",
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
        expect(result.error.message).toContain("無効な優先度");
      }
    });

    it("無効な日付形式の場合、バリデーションエラーが返されること", () => {
      const invalidData: BucketItemInsert = {
        title: "有効なタイトル",
        category_id: 1,
        priority: "high",
        status: "not_started",
        due_date: "invalid-date",
        is_public: false,
        profile_id: "profile-1",
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
        expect(result.error.message).toContain("無効な日付形式");
      }
    });
  });

  describe("validateBucketItemUpdate", () => {
    it("有効なデータの場合、Result<Success>で返されること", () => {
      const validData: BucketItemUpdate = {
        title: "更新されたタイトル",
        description: "更新された説明",
        priority: "medium",
        status: "in_progress",
      };

      const result = validateBucketItemUpdate(validData);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(validData);
      }
    });

    it("タイトルが空文字の場合、バリデーションエラーが返されること", () => {
      const invalidData: BucketItemUpdate = {
        title: "",
      };

      const result = validateBucketItemUpdate(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
        expect(result.error.message).toContain("タイトルは空にできません");
      }
    });

    it("説明がnullの場合、バリデーションエラーが発生しないこと", () => {
      const validData: BucketItemUpdate = {
        title: "有効なタイトル",
        description: null,
      };

      const result = validateBucketItemUpdate(validData);

      expect(isSuccess(result)).toBe(true);
    });

    it("説明がundefinedの場合、バリデーションエラーが発生しないこと", () => {
      const validData: BucketItemUpdate = {
        title: "有効なタイトル",
        description: undefined,
      };

      const result = validateBucketItemUpdate(validData);

      expect(isSuccess(result)).toBe(true);
    });
  });
});

describe("ビジネスルール関数", () => {
  describe("canEditCompletedItem", () => {
    it("完了していないアイテムの場合、編集可能でResult<Success>が返されること", () => {
      const notCompletedItem = {
        ...mockBucketItems[0],
        status: "not_started" as const,
      };

      const result = canEditCompletedItem(notCompletedItem);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(true);
      }
    });

    it("完了済みアイテムの場合、編集不可でResult<Failure>が返されること", () => {
      const completedItem = {
        ...mockBucketItems[0],
        status: "completed" as const,
      };

      const result = canEditCompletedItem(completedItem);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("BusinessRuleError");
        expect(result.error.message).toContain(
          "完了済みのアイテムは編集できません"
        );
      }
    });

    it("進行中アイテムの場合、編集可能でResult<Success>が返されること", () => {
      const inProgressItem = {
        ...mockBucketItems[0],
        status: "in_progress" as const,
      };

      const result = canEditCompletedItem(inProgressItem);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(true);
      }
    });
  });
});
