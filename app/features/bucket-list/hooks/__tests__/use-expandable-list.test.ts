import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExpandableList } from "../use-expandable-list";

describe("useExpandableList", () => {
  describe("初期化", () => {
    it("初期状態が正しく設定されること", () => {
      const { result } = renderHook(() => useExpandableList());

      expect(result.current.getCategoryShowCount("category-1", 10)).toBe(5); // デフォルト値
      expect(result.current.isTextExpanded("item-1")).toBe(false);
      expect(result.current.isCategoryFullyExpanded("category-1", 10)).toBe(false);
      expect(result.current.needsShowMoreButton("category-1", 10)).toBe(true);
      expect(result.current.getRemainingCount("category-1", 10)).toBe(5);
    });

    it("すべてのメソッドが関数として定義されていること", () => {
      const { result } = renderHook(() => useExpandableList());

      expect(typeof result.current.getCategoryShowCount).toBe("function");
      expect(typeof result.current.isTextExpanded).toBe("function");
      expect(typeof result.current.isCategoryFullyExpanded).toBe("function");
      expect(typeof result.current.needsShowMoreButton).toBe("function");
      expect(typeof result.current.getRemainingCount).toBe("function");
      expect(typeof result.current.expandCategory).toBe("function");
      expect(typeof result.current.expandCategoryFully).toBe("function");
      expect(typeof result.current.collapseCategory).toBe("function");
      expect(typeof result.current.toggleTextExpansion).toBe("function");
    });
  });

  describe("カテゴリ展開機能", () => {
    it("getCategoryShowCountが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      // デフォルトは5件表示
      expect(result.current.getCategoryShowCount("category-1", 10)).toBe(5);
      expect(result.current.getCategoryShowCount("category-1", 10, 3)).toBe(3); // カスタムデフォルト

      // 総数が少ない場合は総数を返す
      expect(result.current.getCategoryShowCount("category-1", 3)).toBe(3);
      expect(result.current.getCategoryShowCount("category-1", 3, 10)).toBe(3);
    });

    it("expandCategoryが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      act(() => {
        result.current.expandCategory("category-1");
      });

      // デフォルト5 + インクリメント5 = 10
      expect(result.current.getCategoryShowCount("category-1", 20)).toBe(10);

      act(() => {
        result.current.expandCategory("category-1", 3);
      });

      // 10 + インクリメント3 = 13
      expect(result.current.getCategoryShowCount("category-1", 20)).toBe(13);
    });

    it("expandCategoryFullyが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      act(() => {
        result.current.expandCategoryFully("category-1", 20);
      });

      expect(result.current.getCategoryShowCount("category-1", 20)).toBe(20);
      expect(result.current.isCategoryFullyExpanded("category-1", 20)).toBe(true);
      expect(result.current.needsShowMoreButton("category-1", 20)).toBe(false);
      expect(result.current.getRemainingCount("category-1", 20)).toBe(0);
    });

    it("collapseCategoryが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      // まず展開
      act(() => {
        result.current.expandCategoryFully("category-1", 20);
      });

      expect(result.current.getCategoryShowCount("category-1", 20)).toBe(20);

      // 折りたたみ
      act(() => {
        result.current.collapseCategory("category-1");
      });

      expect(result.current.getCategoryShowCount("category-1", 20)).toBe(5); // デフォルトに戻る

      // カスタムデフォルト値で折りたたみ
      act(() => {
        result.current.collapseCategory("category-1", 3);
      });

      expect(result.current.getCategoryShowCount("category-1", 20)).toBe(3);
    });

    it("isCategoryFullyExpandedが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      // 初期状態では完全展開されていない
      expect(result.current.isCategoryFullyExpanded("category-1", 10)).toBe(false);

      // 完全展開
      act(() => {
        result.current.expandCategoryFully("category-1", 10);
      });

      expect(result.current.isCategoryFullyExpanded("category-1", 10)).toBe(true);

      // 部分展開
      act(() => {
        result.current.collapseCategory("category-1", 8);
      });

      expect(result.current.isCategoryFullyExpanded("category-1", 10)).toBe(false);
    });

    it("needsShowMoreButtonが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      // 初期状態では「もっと見る」ボタンが必要
      expect(result.current.needsShowMoreButton("category-1", 10)).toBe(true);
      expect(result.current.needsShowMoreButton("category-1", 10, 3)).toBe(true);

      // 完全展開時は「もっと見る」ボタンが不要
      act(() => {
        result.current.expandCategoryFully("category-1", 10);
      });

      expect(result.current.needsShowMoreButton("category-1", 10)).toBe(false);

      // 総数が表示数以下の場合は「もっと見る」ボタンが不要
      expect(result.current.needsShowMoreButton("category-2", 3)).toBe(false); // デフォルト5 > 総数3
    });

    it("getRemainingCountが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      // 初期状態での残り項目数
      expect(result.current.getRemainingCount("category-1", 10)).toBe(5); // 10 - 5(デフォルト)
      expect(result.current.getRemainingCount("category-1", 10, 3)).toBe(7); // 10 - 3(カスタムデフォルト)

      // 展開後の残り項目数
      act(() => {
        result.current.expandCategory("category-1", 3);
      });

      expect(result.current.getRemainingCount("category-1", 10)).toBe(2); // 10 - 8(5+3)

      // 完全展開時は残り項目数0
      act(() => {
        result.current.expandCategoryFully("category-1", 10);
      });

      expect(result.current.getRemainingCount("category-1", 10)).toBe(0);

      // 負の値にはならない
      expect(result.current.getRemainingCount("category-2", 3)).toBe(0); // 3 - 5(デフォルト) = -2 → 0
    });
  });

  describe("テキスト展開機能", () => {
    it("isTextExpandedが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      // 初期状態では展開されていない
      expect(result.current.isTextExpanded("item-1")).toBe(false);
      expect(result.current.isTextExpanded("item-2")).toBe(false);
    });

    it("toggleTextExpansionが正しく動作すること", () => {
      const { result } = renderHook(() => useExpandableList());

      // 展開
      act(() => {
        result.current.toggleTextExpansion("item-1");
      });

      expect(result.current.isTextExpanded("item-1")).toBe(true);
      expect(result.current.isTextExpanded("item-2")).toBe(false); // 他の項目は影響されない

      // 再度トグルで折りたたみ
      act(() => {
        result.current.toggleTextExpansion("item-1");
      });

      expect(result.current.isTextExpanded("item-1")).toBe(false);

      // 複数項目の展開
      act(() => {
        result.current.toggleTextExpansion("item-1");
        result.current.toggleTextExpansion("item-2");
      });

      expect(result.current.isTextExpanded("item-1")).toBe(true);
      expect(result.current.isTextExpanded("item-2")).toBe(true);

      // 一つだけ折りたたみ
      act(() => {
        result.current.toggleTextExpansion("item-1");
      });

      expect(result.current.isTextExpanded("item-1")).toBe(false);
      expect(result.current.isTextExpanded("item-2")).toBe(true); // item-2は展開のまま
    });
  });

  describe("複数カテゴリの管理", () => {
    it("複数のカテゴリが独立して管理されること", () => {
      const { result } = renderHook(() => useExpandableList());

      // category-1を展開
      act(() => {
        result.current.expandCategory("category-1", 5);
      });

      // category-2を完全展開
      act(() => {
        result.current.expandCategoryFully("category-2", 15);
      });

      // 各カテゴリが独立して管理されている
      expect(result.current.getCategoryShowCount("category-1", 20)).toBe(10); // 5 + 5
      expect(result.current.getCategoryShowCount("category-2", 15)).toBe(15);
      expect(result.current.getCategoryShowCount("category-3", 8)).toBe(5); // 未操作のカテゴリはデフォルト

      expect(result.current.isCategoryFullyExpanded("category-1", 20)).toBe(false);
      expect(result.current.isCategoryFullyExpanded("category-2", 15)).toBe(true);
      expect(result.current.isCategoryFullyExpanded("category-3", 8)).toBe(false);
    });

    it("テキスト展開も項目ごとに独立して管理されること", () => {
      const { result } = renderHook(() => useExpandableList());

      // 複数項目のテキストを展開
      act(() => {
        result.current.toggleTextExpansion("item-1");
        result.current.toggleTextExpansion("item-3");
        result.current.toggleTextExpansion("item-5");
      });

      expect(result.current.isTextExpanded("item-1")).toBe(true);
      expect(result.current.isTextExpanded("item-2")).toBe(false);
      expect(result.current.isTextExpanded("item-3")).toBe(true);
      expect(result.current.isTextExpanded("item-4")).toBe(false);
      expect(result.current.isTextExpanded("item-5")).toBe(true);
    });
  });

  describe("境界値テスト", () => {
    it("総数が0の場合に適切に処理されること", () => {
      const { result } = renderHook(() => useExpandableList());

      expect(result.current.getCategoryShowCount("category-1", 0)).toBe(0);
      expect(result.current.isCategoryFullyExpanded("category-1", 0)).toBe(true); // 0件は常に完全展開
      expect(result.current.needsShowMoreButton("category-1", 0)).toBe(false);
      expect(result.current.getRemainingCount("category-1", 0)).toBe(0);
    });

    it("総数が1の場合に適切に処理されること", () => {
      const { result } = renderHook(() => useExpandableList());

      expect(result.current.getCategoryShowCount("category-1", 1)).toBe(1);
      expect(result.current.isCategoryFullyExpanded("category-1", 1)).toBe(true);
      expect(result.current.needsShowMoreButton("category-1", 1)).toBe(false);
      expect(result.current.getRemainingCount("category-1", 1)).toBe(0);
    });

    it("非常に大きな数値でも適切に処理されること", () => {
      const { result } = renderHook(() => useExpandableList());
      const largeNumber = 1000000;

      expect(result.current.getCategoryShowCount("category-1", largeNumber)).toBe(5);
      expect(result.current.isCategoryFullyExpanded("category-1", largeNumber)).toBe(false);
      expect(result.current.needsShowMoreButton("category-1", largeNumber)).toBe(true);
      expect(result.current.getRemainingCount("category-1", largeNumber)).toBe(largeNumber - 5);

      act(() => {
        result.current.expandCategoryFully("category-1", largeNumber);
      });

      expect(result.current.getCategoryShowCount("category-1", largeNumber)).toBe(largeNumber);
      expect(result.current.isCategoryFullyExpanded("category-1", largeNumber)).toBe(true);
    });

    it("空文字列のIDでも適切に処理されること", () => {
      const { result } = renderHook(() => useExpandableList());

      expect(result.current.getCategoryShowCount("", 10)).toBe(5);
      expect(result.current.isTextExpanded("")).toBe(false);

      act(() => {
        result.current.expandCategory("");
        result.current.toggleTextExpansion("");
      });

      expect(result.current.getCategoryShowCount("", 10)).toBe(10);
      expect(result.current.isTextExpanded("")).toBe(true);
    });
  });
});