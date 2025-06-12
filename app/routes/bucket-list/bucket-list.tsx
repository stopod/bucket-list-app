import type { Route } from "./+types/bucket-list";
import { Link, useSearchParams } from "react-router";
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

export default function BucketListPage({ loaderData }: Route.ComponentProps) {
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
    try {
      // フォームを作成してステータス更新を実行
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/bucket-list/edit/${itemId}`;
      form.style.display = "none";

      // 現在の項目データを取得
      const item = bucketItems.find(item => item.id === itemId);
      if (!item) return;

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
    }
  };

  return (
    <AuthenticatedLayout title="やりたいこと一覧">
      <div className="container mx-auto px-4 py-8 pb-12">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              やりたいこと一覧
            </h1>
            <Link to="/bucket-list/add">
              <Button size="lg">
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
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">フィルター・検索</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                  <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
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
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 flex-1">
                            {item.title}
                          </h4>
                          <div className="flex gap-2 ml-2">
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
                        
                        {item.description && (
                          <div className="mb-3">
                            <ControlledExpandableText
                              text={item.description}
                              isExpanded={isTextExpanded(item.id)}
                              onToggle={() => toggleTextExpansion(item.id)}
                              maxLength={100}
                              className="text-sm text-gray-600"
                            />
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-xs text-gray-500">
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
                        
                        {/* ステータス変更・編集・削除 */}
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          {/* ステータス変更 */}
                          <div className="mb-2">
                            <label className="block text-xs text-gray-600 mb-1">ステータスを変更</label>
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="not_started">未着手</option>
                              <option value="in_progress">進行中</option>
                              <option value="completed">完了</option>
                            </select>
                          </div>
                          
                          {/* 編集・削除ボタン */}
                          <div className="flex justify-end space-x-2">
                            <Link to={`/bucket-list/edit/${item.id}`}>
                              <Button variant="outline" size="sm">
                                編集
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog({ id: item.id, title: item.title })}
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                        
                        {item.completed_at && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-green-600">
                              達成日: {new Date(item.completed_at).toLocaleDateString('ja-JP')}
                            </p>
                            {item.completion_comment && (
                              <p className="text-xs text-gray-600 mt-1">
                                {item.completion_comment}
                              </p>
                            )}
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