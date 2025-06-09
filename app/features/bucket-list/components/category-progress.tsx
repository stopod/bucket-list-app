import type { Category } from "../types";

interface CategoryItem {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "completed";
  category_id: number;
}

interface CategoryProgressProps {
  categories: Category[];
  items: CategoryItem[];
  className?: string;
}

export function CategoryProgress({ categories, items, className = "" }: CategoryProgressProps) {
  // カテゴリ別の統計を計算
  const categoryStats = categories.map(category => {
    const categoryItems = items.filter(item => item.category_id === category.id);
    const totalItems = categoryItems.length;
    const completedItems = categoryItems.filter(item => item.status === 'completed').length;
    const inProgressItems = categoryItems.filter(item => item.status === 'in_progress').length;
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      category,
      totalItems,
      completedItems,
      inProgressItems,
      completionRate
    };
  }).filter(stat => stat.totalItems > 0); // 項目がないカテゴリは除外

  if (categoryStats.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">カテゴリ別達成状況</h2>
      
      <div className="space-y-4">
        {categoryStats.map(({ category, totalItems, completedItems, inProgressItems, completionRate }) => (
          <div key={category.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: category.color }}
                ></div>
                <h3 className="font-medium text-gray-900">{category.name}</h3>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{completionRate}%</div>
                <div className="text-xs text-gray-500">
                  {completedItems}/{totalItems}
                </div>
              </div>
            </div>
            
            {/* プログレスバー */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="h-2 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${completionRate}%`,
                  backgroundColor: category.color 
                }}
              ></div>
            </div>
            
            {/* 詳細統計 */}
            <div className="flex justify-between text-sm text-gray-600">
              <span>完了: {completedItems}</span>
              <span>進行中: {inProgressItems}</span>
              <span>未着手: {totalItems - completedItems - inProgressItems}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 最も進んでいるカテゴリの表示 */}
      {categoryStats.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">📈 進捗ハイライト</h3>
          {(() => {
            const topCategory = categoryStats.reduce((prev, current) => 
              current.completionRate > prev.completionRate ? current : prev
            );
            const leastProgressCategory = categoryStats.reduce((prev, current) => 
              current.completionRate < prev.completionRate ? current : prev
            );

            return (
              <div className="space-y-1 text-sm text-blue-800">
                <div>
                  🏆 最も進んでいるカテゴリ: 
                  <span className="font-medium"> {topCategory.category.name}</span>
                  <span className="text-blue-600"> ({topCategory.completionRate}%)</span>
                </div>
                {leastProgressCategory.completionRate < topCategory.completionRate && (
                  <div>
                    💪 頑張りどころ: 
                    <span className="font-medium"> {leastProgressCategory.category.name}</span>
                    <span className="text-blue-600"> ({leastProgressCategory.completionRate}%)</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}