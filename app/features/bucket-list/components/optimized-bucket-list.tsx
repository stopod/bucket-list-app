/**
 * 最適化されたBucketListコンポーネント
 * React.memo、useMemo、useCallback を活用した高性能版
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { BucketItemCard } from './bucket-item-card';
import { QuickItemCreator } from './quick-item-creator';
import { BucketListFilters } from './bucket-list-filters';
import { BucketListSort } from './bucket-list-sort';
import { LoadingOverlay } from '~/components/ui/loading-overlay';
import type { BucketItem } from '~/features/bucket-list/types';
import { 
  useOptimizedResult, 
  useOptimizedCallback,
  createMemoizedSelector,
  optimizedArrayProcessor,
} from '~/shared/utils/performance-optimized-helpers';

interface OptimizedBucketListProps {
  items: BucketItem[];
  loading?: boolean;
  error?: string | null;
  onItemEdit?: (item: BucketItem) => void;
  onItemDelete?: (id: number) => void;
  onItemStatusChange?: (item: BucketItem) => void;
  onItemCreate?: (item: Omit<BucketItem, 'id' | 'created_at' | 'updated_at'>) => void;
  categories?: Array<{ id: number; name: string; color: string }>;
  searchQuery?: string;
  selectedCategory?: number | null;
  selectedStatus?: string | null;
  selectedPriority?: string | null;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'priority';
  sortOrder?: 'asc' | 'desc';
  onSearchChange?: (query: string) => void;
  onCategoryChange?: (categoryId: number | null) => void;
  onStatusChange?: (status: string | null) => void;
  onPriorityChange?: (priority: string | null) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

// メモ化されたセレクター
const selectFilteredItems = createMemoizedSelector(
  (data: {
    items: BucketItem[];
    searchQuery: string;
    selectedCategory: number | null;
    selectedStatus: string | null;
    selectedPriority: string | null;
  }) => {
    const { items, searchQuery, selectedCategory, selectedStatus, selectedPriority } = data;
    
    return optimizedArrayProcessor(items, [
      // 検索フィルター
      (item: BucketItem) => {
        if (!searchQuery) return item;
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query))
        ) ? item : null;
      },
      // カテゴリフィルター
      (item: BucketItem) => {
        if (selectedCategory === null) return item;
        return item.category_id === selectedCategory ? item : null;
      },
      // ステータスフィルター
      (item: BucketItem) => {
        if (!selectedStatus) return item;
        return item.status === selectedStatus ? item : null;
      },
      // 優先度フィルター
      (item: BucketItem) => {
        if (!selectedPriority) return item;
        return item.priority === selectedPriority ? item : null;
      },
    ]);
  },
  (a, b) => a.length === b.length && a.every((item, index) => item.id === b[index].id)
);

const selectSortedItems = createMemoizedSelector(
  (data: {
    items: BucketItem[];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) => {
    const { items, sortBy, sortOrder } = data;
    
    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'updated_at':
        default:
          aValue = new Date(a.updated_at || a.created_at || 0).getTime();
          bValue = new Date(b.updated_at || b.created_at || 0).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  },
  (a, b) => a.length === b.length && a.every((item, index) => item.id === b[index].id)
);

// メモ化されたアイテムカード
const MemoizedBucketItemCard = memo(BucketItemCard, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.item.updated_at === nextProps.item.updated_at &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onStatusChange === nextProps.onStatusChange
  );
});

// メモ化されたクイック作成
const MemoizedQuickItemCreator = memo(QuickItemCreator, (prevProps, nextProps) => {
  return (
    prevProps.onSuccess === nextProps.onSuccess &&
    prevProps.onError === nextProps.onError &&
    prevProps.createFunction === nextProps.createFunction
  );
});

// メモ化されたフィルター
const MemoizedBucketListFilters = memo(BucketListFilters, (prevProps, nextProps) => {
  return (
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.selectedStatus === nextProps.selectedStatus &&
    prevProps.selectedPriority === nextProps.selectedPriority &&
    prevProps.categories === nextProps.categories &&
    prevProps.onSearchChange === nextProps.onSearchChange &&
    prevProps.onCategoryChange === nextProps.onCategoryChange &&
    prevProps.onStatusChange === nextProps.onStatusChange &&
    prevProps.onPriorityChange === nextProps.onPriorityChange
  );
});

// メモ化されたソート
const MemoizedBucketListSort = memo(BucketListSort, (prevProps, nextProps) => {
  return (
    prevProps.sortBy === nextProps.sortBy &&
    prevProps.sortOrder === nextProps.sortOrder &&
    prevProps.onSortChange === nextProps.onSortChange
  );
});

export const OptimizedBucketList: React.FC<OptimizedBucketListProps> = memo(({
  items,
  loading = false,
  error = null,
  onItemEdit,
  onItemDelete,
  onItemStatusChange,
  onItemCreate,
  categories = [],
  searchQuery = '',
  selectedCategory = null,
  selectedStatus = null,
  selectedPriority = null,
  sortBy = 'updated_at',
  sortOrder = 'desc',
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onPriorityChange,
  onSortChange,
}) => {
  // 最適化されたコールバック
  const optimizedOnItemEdit = useOptimizedCallback(onItemEdit || (() => {}), [onItemEdit]);
  const optimizedOnItemDelete = useOptimizedCallback(onItemDelete || (() => {}), [onItemDelete]);
  const optimizedOnItemStatusChange = useOptimizedCallback(onItemStatusChange || (() => {}), [onItemStatusChange]);
  const optimizedOnItemCreate = useOptimizedCallback(onItemCreate || (() => {}), [onItemCreate]);
  
  // フィルタリング処理（メモ化）
  const filteredItems = useMemo(() => {
    return selectFilteredItems({
      items,
      searchQuery,
      selectedCategory,
      selectedStatus,
      selectedPriority,
    });
  }, [items, searchQuery, selectedCategory, selectedStatus, selectedPriority]);
  
  // ソート処理（メモ化）
  const sortedItems = useMemo(() => {
    return selectSortedItems({
      items: filteredItems,
      sortBy,
      sortOrder,
    });
  }, [filteredItems, sortBy, sortOrder]);
  
  // 仮想化のためのチャンク分割
  const [visibleItems, setVisibleItems] = useState<BucketItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;
  
  useEffect(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setVisibleItems(sortedItems.slice(0, endIndex));
  }, [sortedItems, currentPage]);
  
  // 無限スクロール処理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    const threshold = 100;
    
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      const nextPage = currentPage + 1;
      const maxPages = Math.ceil(sortedItems.length / itemsPerPage);
      
      if (nextPage < maxPages) {
        setCurrentPage(nextPage);
      }
    }
  }, [currentPage, sortedItems.length]);
  
  // アイテムカードのレンダリング（メモ化）
  const renderItemCard = useCallback((item: BucketItem) => (
    <MemoizedBucketItemCard
      key={item.id}
      item={item}
      onEdit={optimizedOnItemEdit}
      onDelete={optimizedOnItemDelete}
      onStatusChange={optimizedOnItemStatusChange}
    />
  ), [optimizedOnItemEdit, optimizedOnItemDelete, optimizedOnItemStatusChange]);
  
  // クイック作成の関数
  const createFunction = useCallback(async (data: any) => {
    await optimizedOnItemCreate(data);
    return { success: true, data };
  }, [optimizedOnItemCreate]);
  
  // エラー表示
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">エラー: {error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* クイック作成 */}
      <MemoizedQuickItemCreator
        onSuccess={(item) => console.log('Created:', item)}
        onError={(error) => console.error('Error:', error)}
        createFunction={createFunction}
      />
      
      {/* フィルターとソート */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <MemoizedBucketListFilters
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            selectedPriority={selectedPriority}
            categories={categories}
            onSearchChange={onSearchChange}
            onCategoryChange={onCategoryChange}
            onStatusChange={onStatusChange}
            onPriorityChange={onPriorityChange}
          />
        </div>
        <div className="flex-shrink-0">
          <MemoizedBucketListSort
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
          />
        </div>
      </div>
      
      {/* 結果の統計 */}
      <div className="text-sm text-gray-600">
        {filteredItems.length} 件中 {Math.min(visibleItems.length, filteredItems.length)} 件を表示
      </div>
      
      {/* アイテムリスト */}
      <div 
        className="space-y-4 max-h-[600px] overflow-y-auto"
        onScroll={handleScroll}
      >
        {loading && <LoadingOverlay />}
        
        {visibleItems.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-500">
            <p>該当するアイテムがありません。</p>
          </div>
        ) : (
          visibleItems.map(renderItemCard)
        )}
        
        {/* 無限スクロール用のローディング */}
        {visibleItems.length < filteredItems.length && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 最適化されたpropsの比較
  return (
    prevProps.items.length === nextProps.items.length &&
    prevProps.items.every((item, index) => 
      item.id === nextProps.items[index]?.id &&
      item.updated_at === nextProps.items[index]?.updated_at
    ) &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.selectedStatus === nextProps.selectedStatus &&
    prevProps.selectedPriority === nextProps.selectedPriority &&
    prevProps.sortBy === nextProps.sortBy &&
    prevProps.sortOrder === nextProps.sortOrder
  );
});

OptimizedBucketList.displayName = 'OptimizedBucketList';