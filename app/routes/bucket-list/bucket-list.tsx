import type { Route } from "./+types/bucket-list";
import { Link } from "react-router";
import { AuthenticatedLayout } from "~/shared/layouts";
import { getServerAuth } from "~/lib/auth-server";
import { assertPriority, assertStatus, assertDueType } from "~/features/bucket-list/types";
import { createBucketListService } from "~/features/bucket-list/lib/repository-factory";
import { Button } from "~/components/ui/button";

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

    // Repository経由でデータ取得
    const bucketListService = await createBucketListService();

    // ダッシュボードデータを取得（並列実行）
    const dashboardData = await bucketListService.getDashboardData(authResult.user!.id);

    return {
      bucketItems: dashboardData.items,
      categories: dashboardData.categories,
      stats: dashboardData.stats,
      itemsByCategory: dashboardData.itemsByCategory,
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
  const { bucketItems, categories, stats, itemsByCategory } = loaderData;

  return (
    <AuthenticatedLayout title="やりたいこと一覧">
      <div className="container mx-auto px-4 py-8">
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
          
          {/* 統計表示 */}
          {stats && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">達成状況</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total_items}
                  </div>
                  <div className="text-sm text-gray-600">総項目数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.completed_items}
                  </div>
                  <div className="text-sm text-gray-600">完了</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.in_progress_items}
                  </div>
                  <div className="text-sm text-gray-600">進行中</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.completion_rate}%
                  </div>
                  <div className="text-sm text-gray-600">達成率</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* バケットリスト項目表示 */}
        {bucketItems.length > 0 ? (
          <div className="space-y-6">
            {/* カテゴリ別にグループ化（サービスレイヤーで処理済み） */}
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
                          <span className={item.is_public ? 'text-blue-600' : 'text-gray-400'}>
                            {item.is_public ? '公開' : '非公開'}
                          </span>
                        </div>
                        
                        {/* 編集ボタン */}
                        <div className="mt-3 pt-2 border-t border-gray-200 flex justify-end">
                          <Link to={`/bucket-list/edit/${item.id}`}>
                            <Button variant="outline" size="sm">
                              編集
                            </Button>
                          </Link>
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
      </div>
    </AuthenticatedLayout>
  );
}