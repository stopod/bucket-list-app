import { useState, useCallback, useMemo } from 'react';

/**
 * カテゴリ別展開状態管理とテキスト展開状態管理を提供するカスタムHook
 */
export function useExpandableList() {
  // カテゴリ別に表示する項目数を管理 (categoryId -> showCount)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, number>>({});
  
  // テキスト展開状態を管理 (itemId -> expanded)
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());

  /**
   * カテゴリの表示項目数を取得
   */
  const getCategoryShowCount = useCallback((categoryId: string, totalCount: number, defaultShowCount = 5) => {
    return Math.min(expandedCategories[categoryId] || defaultShowCount, totalCount);
  }, [expandedCategories]);

  /**
   * カテゴリの表示項目数を増やす
   */
  const expandCategory = useCallback((categoryId: string, increment = 5) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: (prev[categoryId] || 5) + increment
    }));
  }, []);

  /**
   * カテゴリを完全に展開（全件表示）
   */
  const expandCategoryFully = useCallback((categoryId: string, totalCount: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: totalCount
    }));
  }, []);

  /**
   * カテゴリを初期状態に折りたたむ
   */
  const collapseCategory = useCallback((categoryId: string, defaultShowCount = 5) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: defaultShowCount
    }));
  }, []);

  /**
   * テキストの展開状態を取得
   */
  const isTextExpanded = useCallback((itemId: string) => {
    return expandedTexts.has(itemId);
  }, [expandedTexts]);

  /**
   * テキストの展開状態を切り替え
   */
  const toggleTextExpansion = useCallback((itemId: string) => {
    setExpandedTexts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  /**
   * カテゴリが完全に展開されているかチェック
   */
  const isCategoryFullyExpanded = useCallback((categoryId: string, totalCount: number) => {
    const showCount = expandedCategories[categoryId] || 5;
    return showCount >= totalCount;
  }, [expandedCategories]);

  /**
   * カテゴリに「もっと見る」ボタンが必要かチェック
   */
  const needsShowMoreButton = useCallback((categoryId: string, totalCount: number, defaultShowCount = 5) => {
    const showCount = expandedCategories[categoryId] || defaultShowCount;
    return showCount < totalCount;
  }, [expandedCategories]);

  /**
   * 残り項目数を取得
   */
  const getRemainingCount = useCallback((categoryId: string, totalCount: number, defaultShowCount = 5) => {
    const showCount = expandedCategories[categoryId] || defaultShowCount;
    return Math.max(0, totalCount - showCount);
  }, [expandedCategories]);

  return {
    // State getters
    getCategoryShowCount,
    isTextExpanded,
    isCategoryFullyExpanded,
    needsShowMoreButton,
    getRemainingCount,
    
    // State setters
    expandCategory,
    expandCategoryFully,
    collapseCategory,
    toggleTextExpansion,
  };
}

/**
 * 展開可能リストで使用する型定義
 */
export interface ExpandableListItem {
  id: string;
  [key: string]: any;
}

export interface ExpandableCategory {
  id: string | number;
  items: ExpandableListItem[];
  [key: string]: any;
}