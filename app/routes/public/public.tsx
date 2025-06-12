import type { Route } from "./+types/public";
import { useSearchParams } from "react-router";
import { useState } from "react";
import { AuthenticatedLayout } from "~/shared/layouts";
import { getServerAuth, createAuthenticatedSupabaseClient } from "~/lib/auth-server";
import { assertPriority, assertStatus } from "~/features/bucket-list/types";
import { createBucketListService, createAuthenticatedBucketListService } from "~/features/bucket-list/lib/repository-factory";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function meta({}: Route.MetaArgs) {
  return [{ title: "みんなのやりたいこと" }];
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
    

    // 公開されたやりたいことと全カテゴリを取得
    const [publicBucketItems, categories] = await Promise.all([
      bucketListService.getPublicBucketItems(filters),
      bucketListService.getCategories()
    ]);

    // カテゴリ情報を含むアイテムに変換
    const itemsWithCategory = publicBucketItems.map(item => ({
      ...item,
      category: categories.find(cat => cat.id === item.category_id)!
    }));

    // カテゴリ別にグループ化
    const itemsByCategory = categories.map(category => ({
      category,
      items: itemsWithCategory.filter(item => item.category_id === category.id)
    })).filter(group => group.items.length > 0);

    return {
      publicBucketItems: itemsWithCategory,
      categories,
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

export default function PublicBucketListPage({ loaderData }: Route.ComponentProps) {
  const { publicBucketItems, categories, itemsByCategory, filters } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

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

  return (
    <AuthenticatedLayout title="みんなのやりたいこと">
      <div className="container mx-auto px-4 py-8 pb-12">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                みんなのやりたいこと
              </h1>
              <p className="text-gray-600 mt-2">
                他のユーザーが公開しているやりたいことを見て、インスピレーションを得ましょう
              </p>
            </div>
          </div>
          
          {/* 統計表示 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">公開状況</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {publicBucketItems.length}
                </div>
                <div className="text-sm text-gray-600">公開項目数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {publicBucketItems.filter(item => item.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">達成済み</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {itemsByCategory.length}
                </div>
                <div className="text-sm text-gray-600">活動中カテゴリ</div>
              </div>
            </div>
          </div>

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

        {/* 公開バケットリスト項目表示 */}
        {publicBucketItems.length > 0 ? (
          <div className="space-y-6">
            {/* カテゴリ別にグループ化 */}
            {itemsByCategory.map(({ category, items: categoryItems }) => (
                <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div 
                    className="px-6 py-4 border-l-4"
                    style={{ borderLeftColor: category.color }}
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name} ({categoryItems.length})
                    </h3>
                  </div>
                  <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryItems.map((item) => {
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
                          <p className="text-sm text-gray-600 mb-3">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>
                            {item.due_date ? `期限: ${item.due_date}` : 
                             item.due_type === 'this_year' ? '期限: 今年中' :
                             item.due_type === 'next_year' ? '期限: 来年中' : 
                             item.due_type === 'unspecified' ? '期限: 未定' :
                             item.due_type ? `期限: ${item.due_type}` : '期限: 未定'}
                          </span>
                          <span className="text-blue-600">
                            公開
                          </span>
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
                </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">
              公開されているやりたいことが見つかりません。
            </p>
            <p className="text-gray-400">
              {filters.search || filters.category_id || filters.priority || filters.status 
                ? "検索条件を変更してお試しください。" 
                : "まだ誰も公開設定にしていないようです。"}
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}