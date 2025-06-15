import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateAchievementRate,
  calculateCategoryStats,
  calculateUserStats,
  groupItemsByCategory,
  groupItemsByPriority,
  groupItemsByStatus,
  filterItemsBySearch,
  filterItemsByDueDate,
  sortItems,
  validateBucketItemInsert,
  validateBucketItemUpdate,
  canEditCompletedItem,
  normalizeFilters,
  getRecentlyCompletedItems,
  getUpcomingItems,
} from "../business-logic";
import type {
  BucketItem,
  Category,
  BucketItemInsert,
  BucketItemUpdate,
} from "~/features/bucket-list/types";
import { isSuccess, isFailure } from "~/shared/types/result";

const mockCategory1: Category = {
  id: 1,
  name: "Travel",
  color: "#blue",
  created_at: "2024-01-01T00:00:00Z",
};

const mockCategory2: Category = {
  id: 2,
  name: "Learning",
  color: "#green",
  created_at: "2024-01-01T00:00:00Z",
};

const createMockItem = (overrides: Partial<BucketItem> = {}): BucketItem => ({
  id: "item-1",
  title: "Test Item",
  description: null,
  profile_id: "user-1",
  category_id: 1,
  priority: "medium",
  status: "not_started",
  due_date: null,
  due_type: null,
  is_public: false,
  completed_at: null,
  completion_comment: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("Business Logic Functions", () => {
  describe("calculateAchievementRate", () => {
    it("空のリストの場合、0%を返すこと", () => {
      const result = calculateAchievementRate([]);
      expect(result).toBe(0);
    });

    it("全て未完了の場合、0%を返すこと", () => {
      const items = [
        createMockItem({ status: "not_started" }),
        createMockItem({ status: "in_progress" }),
      ];
      const result = calculateAchievementRate(items);
      expect(result).toBe(0);
    });

    it("一部完了の場合、正しい達成率を返すこと", () => {
      const items = [
        createMockItem({ status: "completed" }),
        createMockItem({ status: "not_started" }),
        createMockItem({ status: "completed" }),
        createMockItem({ status: "in_progress" }),
      ];
      const result = calculateAchievementRate(items);
      expect(result).toBe(50); // 4項目中2項目完了 = 50%
    });

    it("全て完了の場合、100%を返すこと", () => {
      const items = [
        createMockItem({ status: "completed" }),
        createMockItem({ status: "completed" }),
      ];
      const result = calculateAchievementRate(items);
      expect(result).toBe(100);
    });
  });

  describe("calculateCategoryStats", () => {
    it("カテゴリ別の統計を正しく計算すること", () => {
      const items = [
        createMockItem({ category_id: 1, status: "completed" }),
        createMockItem({ category_id: 1, status: "not_started" }),
        createMockItem({ category_id: 2, status: "completed" }),
        createMockItem({ category_id: 2, status: "completed" }),
      ];
      const categories = [mockCategory1, mockCategory2];

      const result = calculateCategoryStats(items, categories);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        category: mockCategory1,
        total: 2,
        completed: 1,
        rate: 50,
      });
      expect(result[1]).toMatchObject({
        category: mockCategory2,
        total: 2,
        completed: 2,
        rate: 100,
      });
    });

    it("項目がないカテゴリは結果に含まれないこと", () => {
      const items = [createMockItem({ category_id: 1, status: "completed" })];
      const categories = [mockCategory1, mockCategory2];

      const result = calculateCategoryStats(items, categories);

      expect(result).toHaveLength(1);
      expect(result[0].category).toEqual(mockCategory1);
    });
  });

  describe("calculateUserStats", () => {
    it("ユーザー統計を正しく計算すること", () => {
      const items = [
        createMockItem({ status: "completed" }),
        createMockItem({ status: "completed" }),
        createMockItem({ status: "in_progress" }),
        createMockItem({ status: "not_started" }),
        createMockItem({ status: "not_started" }),
      ];

      const result = calculateUserStats(items);

      expect(result).toMatchObject({
        profile_id: null,
        display_name: null,
        total_items: 5,
        completed_items: 2,
        in_progress_items: 1,
        not_started_items: 2,
        completion_rate: 40,
      });
    });

    it("空のリストの場合、すべて0を返すこと", () => {
      const result = calculateUserStats([]);

      expect(result).toMatchObject({
        total_items: 0,
        completed_items: 0,
        in_progress_items: 0,
        not_started_items: 0,
        completion_rate: 0,
      });
    });
  });

  describe("groupItemsByCategory", () => {
    it("カテゴリ別にアイテムをグループ化すること", () => {
      const items = [
        createMockItem({ id: "1", category_id: 1 }),
        createMockItem({ id: "2", category_id: 2 }),
        createMockItem({ id: "3", category_id: 1 }),
      ];
      const categories = [mockCategory1, mockCategory2];

      const result = groupItemsByCategory(items, categories);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        category: mockCategory1,
        items: expect.arrayContaining([
          expect.objectContaining({ id: "1" }),
          expect.objectContaining({ id: "3" }),
        ]),
      });
      expect(result[1]).toMatchObject({
        category: mockCategory2,
        items: [expect.objectContaining({ id: "2" })],
      });
    });

    it("項目がないカテゴリは結果に含まれないこと", () => {
      const items = [createMockItem({ category_id: 1 })];
      const categories = [mockCategory1, mockCategory2];

      const result = groupItemsByCategory(items, categories);

      expect(result).toHaveLength(1);
      expect(result[0].category).toEqual(mockCategory1);
    });
  });

  describe("groupItemsByPriority", () => {
    it("優先度別にアイテムをグループ化すること", () => {
      const items = [
        createMockItem({ id: "1", priority: "high" }),
        createMockItem({ id: "2", priority: "medium" }),
        createMockItem({ id: "3", priority: "high" }),
      ];

      const result = groupItemsByPriority(items);

      expect(result).toHaveLength(2); // low は項目がないため除外される
      expect(result[0]).toMatchObject({
        priority: "high",
        items: expect.arrayContaining([
          expect.objectContaining({ id: "1" }),
          expect.objectContaining({ id: "3" }),
        ]),
      });
      expect(result[1]).toMatchObject({
        priority: "medium",
        items: [expect.objectContaining({ id: "2" })],
      });
    });
  });

  describe("groupItemsByStatus", () => {
    it("ステータス別にアイテムをグループ化すること", () => {
      const items = [
        createMockItem({ id: "1", status: "completed" }),
        createMockItem({ id: "2", status: "not_started" }),
        createMockItem({ id: "3", status: "completed" }),
      ];

      const result = groupItemsByStatus(items);

      expect(result).toHaveLength(2); // in_progress は項目がないため除外される
      expect(result[0]).toMatchObject({
        status: "not_started",
        items: [expect.objectContaining({ id: "2" })],
      });
      expect(result[1]).toMatchObject({
        status: "completed",
        items: expect.arrayContaining([
          expect.objectContaining({ id: "1" }),
          expect.objectContaining({ id: "3" }),
        ]),
      });
    });
  });

  describe("filterItemsBySearch", () => {
    it("タイトルで検索できること", () => {
      const items = [
        createMockItem({ id: "1", title: "Travel to Japan" }),
        createMockItem({ id: "2", title: "Learn Programming" }),
        createMockItem({ id: "3", title: "Read Books" }),
      ];

      const result = filterItemsBySearch(items, "Japan");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("説明で検索できること", () => {
      const items = [
        createMockItem({
          id: "1",
          title: "Travel",
          description: "Visit Tokyo",
        }),
        createMockItem({ id: "2", title: "Learn", description: "Study React" }),
      ];

      const result = filterItemsBySearch(items, "Tokyo");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("空の検索語の場合、全項目を返すこと", () => {
      const items = [createMockItem(), createMockItem()];

      const result = filterItemsBySearch(items, "");

      expect(result).toHaveLength(2);
    });

    it("大文字小文字を区別しないこと", () => {
      const items = [createMockItem({ title: "Travel to Japan" })];

      const result = filterItemsBySearch(items, "JAPAN");

      expect(result).toHaveLength(1);
    });
  });

  describe("filterItemsByDueDate", () => {
    const now = new Date("2024-01-15T00:00:00Z");
    const overdue = "2024-01-10"; // 5日前
    const dueSoon = "2024-01-20"; // 5日後
    const future = "2024-02-15"; // 1ヶ月後

    // Mockとして固定日付を使用するため、実際のDateオブジェクトをモック
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("期限切れ項目をフィルタリングできること", () => {
      const items = [
        createMockItem({ id: "1", due_date: overdue, status: "not_started" }),
        createMockItem({ id: "2", due_date: dueSoon, status: "not_started" }),
        createMockItem({ id: "3", due_date: overdue, status: "completed" }), // 完了済みは除外
      ];

      const result = filterItemsByDueDate(items, "overdue");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("期限が近い項目をフィルタリングできること", () => {
      const items = [
        createMockItem({ id: "1", due_date: dueSoon, status: "not_started" }),
        createMockItem({ id: "2", due_date: future, status: "not_started" }),
        createMockItem({ id: "3", due_date: dueSoon, status: "completed" }), // 完了済みは除外
      ];

      const result = filterItemsByDueDate(items, "due_soon");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("期限なし項目をフィルタリングできること", () => {
      const items = [
        createMockItem({ id: "1", due_date: null }),
        createMockItem({ id: "2", due_date: dueSoon }),
      ];

      const result = filterItemsByDueDate(items, "no_due_date");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("期限あり項目をフィルタリングできること", () => {
      const items = [
        createMockItem({ id: "1", due_date: dueSoon }),
        createMockItem({ id: "2", due_date: null }),
      ];

      const result = filterItemsByDueDate(items, "has_due_date");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  describe("sortItems", () => {
    it("タイトルでソートできること", () => {
      const items = [
        createMockItem({ id: "1", title: "Zebra" }),
        createMockItem({ id: "2", title: "Apple" }),
        createMockItem({ id: "3", title: "Banana" }),
      ];

      const result = sortItems(items, { field: "title", direction: "asc" });

      expect(result.map((item) => item.title)).toEqual([
        "Apple",
        "Banana",
        "Zebra",
      ]);
    });

    it("優先度でソートできること", () => {
      const items = [
        createMockItem({ id: "1", priority: "low" }),
        createMockItem({ id: "2", priority: "high" }),
        createMockItem({ id: "3", priority: "medium" }),
      ];

      const result = sortItems(items, { field: "priority", direction: "desc" });

      expect(result.map((item) => item.priority)).toEqual([
        "high",
        "medium",
        "low",
      ]);
    });

    it("作成日でソートできること", () => {
      const items = [
        createMockItem({ id: "1", created_at: "2024-01-03T00:00:00Z" }),
        createMockItem({ id: "2", created_at: "2024-01-01T00:00:00Z" }),
        createMockItem({ id: "3", created_at: "2024-01-02T00:00:00Z" }),
      ];

      const result = sortItems(items, {
        field: "created_at",
        direction: "asc",
      });

      expect(result.map((item) => item.id)).toEqual(["2", "3", "1"]);
    });

    it("期限日でソートできること（null値を適切に処理）", () => {
      const items = [
        createMockItem({ id: "1", due_date: "2024-01-15" }),
        createMockItem({ id: "2", due_date: null }),
        createMockItem({ id: "3", due_date: "2024-01-10" }),
      ];

      const result = sortItems(items, { field: "due_date", direction: "asc" });

      // null値は最後に来る
      expect(result.map((item) => item.id)).toEqual(["3", "1", "2"]);
    });

    it("元の配列を変更しないこと", () => {
      const items = [
        createMockItem({ title: "B" }),
        createMockItem({ title: "A" }),
      ];
      const originalOrder = items.map((item) => item.title);

      sortItems(items, { field: "title", direction: "asc" });

      expect(items.map((item) => item.title)).toEqual(originalOrder);
    });
  });

  describe("validateBucketItemInsert", () => {
    it("有効なデータの場合、成功を返すこと", () => {
      const validData: BucketItemInsert = {
        title: "Valid Title",
        profile_id: "user-1",
        category_id: 1,
        priority: "medium",
        status: "not_started",
        is_public: false,
      };

      const result = validateBucketItemInsert(validData);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(validData);
      }
    });

    it("空のタイトルの場合、失敗を返すこと", () => {
      const invalidData: BucketItemInsert = {
        title: "",
        profile_id: "user-1",
        category_id: 1,
        priority: "medium",
        status: "not_started",
        is_public: false,
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("ValidationError");
        expect(result.error.message).toContain("タイトルは必須です");
      }
    });

    it("長すぎるタイトルの場合、失敗を返すこと", () => {
      const invalidData: BucketItemInsert = {
        title: "a".repeat(201),
        profile_id: "user-1",
        category_id: 1,
        priority: "medium",
        status: "not_started",
        is_public: false,
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("200文字以内");
      }
    });

    it("長すぎる説明の場合、失敗を返すこと", () => {
      const invalidData: BucketItemInsert = {
        title: "Valid Title",
        description: "a".repeat(1001),
        profile_id: "user-1",
        category_id: 1,
        priority: "medium",
        status: "not_started",
        is_public: false,
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("1000文字以内");
      }
    });

    it("無効な優先度の場合、失敗を返すこと", () => {
      const invalidData: BucketItemInsert = {
        title: "Valid Title",
        profile_id: "user-1",
        category_id: 1,
        priority: "invalid" as any,
        status: "not_started",
        is_public: false,
      };

      const result = validateBucketItemInsert(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("無効な優先度");
      }
    });
  });

  describe("validateBucketItemUpdate", () => {
    it("有効な更新データの場合、成功を返すこと", () => {
      const validData: BucketItemUpdate = {
        title: "Updated Title",
        description: "Updated Description",
      };

      const result = validateBucketItemUpdate(validData);

      expect(isSuccess(result)).toBe(true);
    });

    it("空のタイトル更新の場合、失敗を返すこと", () => {
      const invalidData: BucketItemUpdate = {
        title: "",
      };

      const result = validateBucketItemUpdate(invalidData);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain("タイトルは空にできません");
      }
    });
  });

  describe("canEditCompletedItem", () => {
    it("未完了項目の場合、編集可能を返すこと", () => {
      const item = createMockItem({ status: "not_started" });

      const result = canEditCompletedItem(item);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe(true);
      }
    });

    it("完了済み項目の場合、編集不可を返すこと", () => {
      const item = createMockItem({ status: "completed" });

      const result = canEditCompletedItem(item);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe("BusinessRuleError");
        expect(result.error.message).toContain(
          "完了済みのアイテムは編集できません",
        );
      }
    });
  });

  describe("normalizeFilters", () => {
    it("検索語をトリムすること", () => {
      const filters = { search: "  test  " };

      const result = normalizeFilters(filters);

      expect(result.search).toBe("test");
    });

    it("空の検索語をundefinedにすること", () => {
      const filters = { search: "   " };

      const result = normalizeFilters(filters);

      expect(result.search).toBeUndefined();
    });
  });

  describe("getRecentlyCompletedItems", () => {
    it("最近完了した項目を取得できること", () => {
      const items = [
        createMockItem({
          id: "1",
          status: "completed",
          completed_at: "2024-01-10T00:00:00Z",
        }),
        createMockItem({
          id: "2",
          status: "completed",
          completed_at: "2024-01-15T00:00:00Z",
        }),
        createMockItem({ id: "3", status: "not_started" }),
        createMockItem({
          id: "4",
          status: "completed",
          completed_at: "2024-01-05T00:00:00Z",
        }),
      ];

      const result = getRecentlyCompletedItems(items, 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("2"); // 最新
      expect(result[1].id).toBe("1");
    });

    it("完了日がない項目は除外されること", () => {
      const items = [
        createMockItem({ id: "1", status: "completed", completed_at: null }),
        createMockItem({
          id: "2",
          status: "completed",
          completed_at: "2024-01-15T00:00:00Z",
        }),
      ];

      const result = getRecentlyCompletedItems(items);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });

  describe("getUpcomingItems", () => {
    const fixedDate = new Date("2024-01-15T00:00:00Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("期限が近い項目を取得できること", () => {
      const items = [
        createMockItem({
          id: "1",
          due_date: "2024-01-20",
          status: "not_started",
        }), // 5日後
        createMockItem({
          id: "2",
          due_date: "2024-01-25",
          status: "in_progress",
        }), // 10日後
        createMockItem({
          id: "3",
          due_date: "2024-02-20",
          status: "not_started",
        }), // 範囲外
        createMockItem({
          id: "4",
          due_date: "2024-01-18",
          status: "completed",
        }), // 完了済み（除外）
      ];

      const result = getUpcomingItems(items, 30, 5);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1"); // 期限が近い順
      expect(result[1].id).toBe("2");
    });

    it("期限がない項目は除外されること", () => {
      const items = [
        createMockItem({ id: "1", due_date: null }),
        createMockItem({ id: "2", due_date: "2024-01-20" }),
      ];

      const result = getUpcomingItems(items);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });
});
