import { useState, useCallback } from "react";

/**
 * カテゴリ別展開状態管理を提供するカスタムHook
 */
export function useExpandableList() {
  // カテゴリ別に表示する項目数を管理 (categoryId -> showCount)
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, number>
  >({});

  /**
   * カテゴリの表示項目数を取得
   */
  const getCategoryShowCount = useCallback(
    (categoryId: string, totalCount: number, defaultShowCount = 5) => {
      return Math.min(
        expandedCategories[categoryId] || defaultShowCount,
        totalCount,
      );
    },
    [expandedCategories],
  );

  /**
   * カテゴリの表示項目数を増やす
   */
  const expandCategory = useCallback((categoryId: string, increment = 5) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] || 5) + increment,
    }));
  }, []);

  /**
   * カテゴリを初期状態に折りたたむ
   */
  const collapseCategory = useCallback(
    (categoryId: string, defaultShowCount = 5) => {
      setExpandedCategories((prev) => ({
        ...prev,
        [categoryId]: defaultShowCount,
      }));
    },
    [],
  );

  /**
   * カテゴリが完全に展開されているかチェック
   */
  const isCategoryFullyExpanded = useCallback(
    (categoryId: string, totalCount: number) => {
      const showCount = expandedCategories[categoryId] || 5;
      return showCount >= totalCount;
    },
    [expandedCategories],
  );

  /**
   * カテゴリに「もっと見る」ボタンが必要かチェック
   */
  const needsShowMoreButton = useCallback(
    (categoryId: string, totalCount: number, defaultShowCount = 5) => {
      const showCount = expandedCategories[categoryId] || defaultShowCount;
      return showCount < totalCount;
    },
    [expandedCategories],
  );

  /**
   * 残り項目数を取得
   */
  const getRemainingCount = useCallback(
    (categoryId: string, totalCount: number, defaultShowCount = 5) => {
      const showCount = expandedCategories[categoryId] || defaultShowCount;
      return Math.max(0, totalCount - showCount);
    },
    [expandedCategories],
  );

  return {
    // State getters
    getCategoryShowCount,
    isCategoryFullyExpanded,
    needsShowMoreButton,
    getRemainingCount,

    // State setters
    expandCategory,
    collapseCategory,
  };
}
