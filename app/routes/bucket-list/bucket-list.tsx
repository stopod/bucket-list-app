import type { Route } from "./+types/bucket-list";
import { Link, useSearchParams, useNavigation } from "react-router";
import { useState } from "react";
import { AuthenticatedLayout } from "~/shared/layouts";
import { getServerAuth, createAuthenticatedSupabaseClient } from "~/lib/auth-server";
import { assertPriority, assertStatus, assertDueType } from "~/features/bucket-list/types";
import { createBucketListService, createAuthenticatedBucketListService } from "~/features/bucket-list/lib/repository-factory";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DeleteConfirmationDialog } from "~/features/bucket-list/components/delete-confirmation-dialog";
import { AchievementStats } from "~/features/bucket-list/components/achievement-stats";
import { CategoryProgress } from "~/features/bucket-list/components/category-progress";
import { ControlledExpandableText } from "~/features/bucket-list/components/expandable-text";
import { useExpandableList } from "~/features/bucket-list/hooks/use-expandable-list";
import { BucketItemDetailDialog } from "~/features/bucket-list/components/bucket-item-detail-dialog";
import { BucketItemSkeleton } from "~/components/ui";

export function meta({}: Route.MetaArgs) {
  return [{ title: "やりたいこと一覧" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // SSR-compatible authentication check
    const authResult = await getServerAuth(request);
    
    // 認証されていない場合はリダイレクト
    if (!authResult.isAuthenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // URLパラメータからフィルター条件を取得
    const url = new URL(request.url);
    const filters = {
      search: url.searchParams.get("search") || undefined,
      category_id: url.searchParams.get("category") ? Number(url.searchParams.get("category")) : undefined,
      priority: url.searchParams.get("priority") as "high" | "medium" | "low" | undefined,
      status: url.searchParams.get("status") as "not_started" | "in_progress" | "completed" | undefined,
    };

    // 認証済みクライアントでデータ取得
    const authenticatedSupabase = await createAuthenticatedSupabaseClient(authResult);
    const bucketListService = createAuthenticatedBucketListService(authenticatedSupabase);

    // フィルター条件付きでデータを取得
    const [bucketItems, categories, stats] = await Promise.all([
      bucketListService.getUserBucketItemsWithCategory(authResult.user!.id, filters),
      bucketListService.getCategories(),
      bucketListService.getUserStats(authResult.user!.id)
    ]);


    // カテゴリ別にグループ化
    const itemsByCategory = categories.map(category => ({
      category,
      items: bucketItems.filter(item => item.category_id === category.id)
    })).filter(group => group.items.length > 0);

    return {
      bucketItems,
      categories,
      stats,
      itemsByCategory,
      filters,
      user: authResult.user
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Loader error:", error);
    throw new Response("Server error", { status: 500 });
  }
}

// スケルトンローディング表示コンポーネント
function BucketListSkeleton() {
  return (
    <AuthenticatedLayout title="やりたいこと一覧">
      <div className="container mx-auto px-4 py-8 pb-12">
        <div className="mb-8">
          <div className="flex flex-col space-y-4 mb-6 md:flex-row md:justify-between md:items-center md:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                やりたいこと一覧
              </h1>
              <p className="text-gray-600 mt-2">
                あなたが人生でやりたいことを管理・達成していきましょう
              </p>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button className="w-full sm:w-auto">+ 新しく追加</Button>
              <Button variant="outline" className="w-full sm:w-auto">達成状況</Button>
            </div>
          </div>

          {/* フィルタースケルトン */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-16 mb-2"></div>
                  <div className="h-10 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* アイテムスケルトン */}
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-6 bg-gray-300 rounded w-32 mb-4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, j) => (
                    <BucketItemSkeleton key={j} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default function BucketListPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const { bucketItems, categories, stats, itemsByCategory, filters } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  // 展開状態管理
  const {
    getCategoryShowCount,
    isTextExpanded,
    needsShowMoreButton,
    getRemainingCount,
    isCategoryFullyExpanded,
    expandCategory,
    collapseCategory,
    toggleTextExpansion
  } = useExpandableList();
  
  // 詳細ダイアログの状態管理
  const [detailDialog, setDetailDialog] = useState<{
    isOpen: boolean;
    item: typeof bucketItems[0] | null;
  }>({
    isOpen: false,
    item: null
  });

  // 削除確認ダイアログの状態管理
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    item: { id: string; title: string } | null;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    item: null,
    isSubmitting: false
  });

  // ステータス変更のローディング状態管理
  const [statusChanging, setStatusChanging] = useState<Set<string>>(new Set());

  // フィルター更新関数
  const updateFilter = (key: string, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // フィルターリセット関数
  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // 詳細ダイアログを開く
  const openDetailDialog = (item: typeof bucketItems[0]) => {
    setDetailDialog({
      isOpen: true,
      item
    });
  };

  // 詳細ダイアログを閉じる
  const closeDetailDialog = () => {
    setDetailDialog({
      isOpen: false,
      item: null
    });
  };

  // 削除確認ダイアログを開く
  const openDeleteDialog = (item: { id: string; title: string }) => {
    setDeleteDialog({
      isOpen: true,
      item,
      isSubmitting: false
    });
  };

  // 削除確認ダイアログを閉じる
  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      item: null,
      isSubmitting: false
    });
  };

  // 削除実行
  const handleDelete = async () => {
    if (!deleteDialog.item) return;

    setDeleteDialog(prev => ({ ...prev, isSubmitting: true }));

    try {
      // フォームを作成して削除アクションを実行
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/bucket-list/delete/${deleteDialog.item.id}`;
      form.style.display = "none";
      
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Delete error:", error);
      setDeleteDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // ステータス変更
  const handleStatusChange = async (itemId: string, newStatus: string) => {
    // ローディング状態を開始
    setStatusChanging(prev => new Set(prev).add(itemId));
    
    try {
      // 短い遅延でローディング状態を表示
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // フォームを作成してステータス更新を実行
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/bucket-list/edit/${itemId}`;
      form.style.display = "none";

      // 現在の項目データを取得
      const item = bucketItems.find(item => item.id === itemId);
      if (!item) {
        setStatusChanging(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        return;
      }

      // 全てのフィールドを含める（ステータス以外は既存値を維持）
      const fields = {
        title: item.title,
        description: item.description || "",
        category_id: item.category_id.toString(),
        priority: item.priority,
        status: newStatus,
        due_date: item.due_date || "",
        due_type: item.due_type || "unspecified",
        is_public: item.is_public.toString()
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Status change error:", error);
      // エラーが発生した場合はローディング状態を解除
      setStatusChanging(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // ナビゲーション中はスケルトンを表示
  if (navigation.state === "loading") {
    return <BucketListSkeleton />;
  }

  return (
    <AuthenticatedLayout title="やりたいこと一覧">
      <div className="container mx-auto px-4 py-8 pb-12">
        <div className="mb-8">
          <div className="flex flex-col space-y-3 mb-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              やりたいこと一覧
            </h1>
            <Link to="/bucket-list/add">
              <Button size="lg" className="w-full sm:w-auto">
                + 新しく追加
              </Button>
            </Link>
          </div>
          
          {/* 達成率表示 */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AchievementStats stats={stats} />
              <CategoryProgress 
                categories={categories} 
                items={bucketItems} 
              />
            </div>
          )}

          {/* フィルター・検索 */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">フィルター・検索</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* 検索 */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  検索
                </label>
                <Input
                  id="search"
                  type="text"
                  placeholder="タイトルや説明を検索..."
                  defaultValue={filters.search || ""}
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
              </div>

              {/* カテゴリフィルター */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <select
                  id="category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={filters.category_id?.toString() || ""}
                  onChange={(e) => updateFilter("category", e.target.value)}
                >
                  <option value="">すべて</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id.toString()}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 優先度フィルター */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  優先度
                </label>
                <select
                  id="priority"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={filters.priority || ""}
                  onChange={(e) => updateFilter("priority", e.target.value)}
                >
                  <option value="">すべて</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              {/* ステータスフィルター */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue={filters.status || ""}
                  onChange={(e) => updateFilter("status", e.target.value)}
                >
                  <option value="">すべて</option>
                  <option value="not_started">未着手</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了</option>
                </select>
              </div>
            </div>

            {/* フィルターリセットボタン */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={resetFilters}>
                フィルターをリセット
              </Button>
            </div>
          </div>
        </div>

        {/* バケットリスト項目表示 */}
        {bucketItems.length > 0 ? (
          <div className="space-y-6">
            {/* カテゴリ別にグループ化（サービスレイヤーで処理済み） */}
            {itemsByCategory.map(({ category, items: categoryItems }) => {
              const categoryId = category.id.toString();
              const showCount = getCategoryShowCount(categoryId, categoryItems.length);
              const visibleItems = categoryItems.slice(0, showCount);
              const hasMore = needsShowMoreButton(categoryId, categoryItems.length);
              const remainingCount = getRemainingCount(categoryId, categoryItems.length);
              const isFullyExpanded = isCategoryFullyExpanded(categoryId, categoryItems.length);

              return (
                <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div 
                    className="px-6 py-4 border-l-4 flex justify-between items-center"
                    style={{ borderLeftColor: category.color }}
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name} ({categoryItems.length})
                    </h3>
                    {categoryItems.length > 5 && (
                      <span className="text-sm text-gray-500">
                        {showCount}件中{categoryItems.length}件を表示
                      </span>
                    )}
                  </div>
                  <div className="grid gap-4 p-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleItems.map((item) => {
                      // 型安全性を確保
                      const priorityDisplay = (() => {
                        try {
                          assertPriority(item.priority);
                          return item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低';
                        } catch {
                          return item.priority;
                        }
                      })();
                      
                      const statusDisplay = (() => {
                        try {
                          assertStatus(item.status);
                          return item.status === 'completed' ? '完了' : 
                                 item.status === 'in_progress' ? '進行中' : '未着手';
                        } catch {
                          return item.status;
                        }
                      })();

                      const priorityColor = (() => {
                        try {
                          assertPriority(item.priority);
                          return item.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                                 item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                 'bg-green-100 text-green-800 border-green-200';
                        } catch {
                          return 'bg-gray-100 text-gray-800 border-gray-200';
                        }
                      })();

                      const statusColor = (() => {
                        try {
                          assertStatus(item.status);
                          return item.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                 item.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                 'bg-gray-100 text-gray-800 border-gray-200';
                        } catch {
                          return 'bg-gray-100 text-gray-800 border-gray-200';
                        }
                      })();

                      return (
                      <div 
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4 sm:p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer min-h-[120px] sm:min-h-[140px] flex flex-col"
                        onClick={() => openDetailDialog(item)}
                      >
                        {/* タイトルとバッジ */}
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-gray-900 flex-1 line-clamp-2">
                            {item.title}
                          </h4>
                          <div className="flex gap-1 ml-2 shrink-0">
                            {/* 優先度バッジ */}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priorityColor}`}>
                              {priorityDisplay}
                            </span>
                            {/* ステータスバッジ */}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                              {statusDisplay}
                            </span>
                          </div>
                        </div>
                        
                        {/* カテゴリと期限情報 */}
                        <div className="mt-auto space-y-1 text-xs text-gray-500">
                          <div className="flex items-center">
                            <div 
                              className="w-2 h-2 rounded-full mr-2" 
                              style={{ backgroundColor: item.category.color }}
                            ></div>
                            <span>{item.category.name}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span>
                              {item.due_date ? `期限: ${item.due_date}` : 
                               item.due_type === 'this_year' ? '期限: 今年中' :
                               item.due_type === 'next_year' ? '期限: 来年中' : 
                               item.due_type === 'unspecified' ? '期限: 未定' :
                               item.due_type ? `期限: ${item.due_type}` : '期限: 未定'}
                            </span>
                            <span className={item.is_public ? 'text-blue-600' : 'text-gray-400'}>
                              {item.is_public ? '公開' : '非公開'}
                            </span>
                          </div>
                        </div>
                        
                        {/* 達成情報（完了時のみ） */}
                        {item.completed_at && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-green-600">
                              達成日: {new Date(item.completed_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  
                  {/* もっと見る / 折りたたむ ボタン */}
                  {categoryItems.length > 5 && (
                    <div className="px-6 pb-4 border-t border-gray-100">
                      <div className="flex justify-center pt-4">
                        {hasMore ? (
                          <Button
                            variant="outline"
                            onClick={() => expandCategory(categoryId, 5)}
                            className="text-sm"
                          >
                            もっと見る ({remainingCount}件)
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => collapseCategory(categoryId)}
                            className="text-sm"
                          >
                            折りたたむ
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">
              まだやりたいことが登録されていません。
            </p>
            <p className="text-gray-400 mb-6">
              新しい項目を追加して、人生でやりたいことを管理しましょう！
            </p>
            <Link to="/bucket-list/add">
              <Button size="lg">
                最初のやりたいことを追加
              </Button>
            </Link>
          </div>
        )}

        {/* 詳細ダイアログ */}
        <BucketItemDetailDialog
          isOpen={detailDialog.isOpen}
          onClose={closeDetailDialog}
          item={detailDialog.item}
          categories={categories}
          onDelete={openDeleteDialog}
          onStatusChange={handleStatusChange}
          isSubmitting={deleteDialog.isSubmitting}
          statusChangingIds={statusChanging}
        />

        {/* 削除確認ダイアログ */}
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDelete}
          itemTitle={deleteDialog.item?.title || ""}
          isSubmitting={deleteDialog.isSubmitting}
        />
      </div>
    </AuthenticatedLayout>
  );
}