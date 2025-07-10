import React from "react";
import type { Route } from "./+types/dashboard";
import { Link, useNavigation } from "react-router";
import { AuthenticatedLayout } from "~/shared/layouts";
import { getServerAuth } from "~/lib/auth-server";
import { createAuthenticatedBucketListService } from "~/features/bucket-list/lib/repository-factory";
import { isFailure } from "~/shared/types/result";
import { createAuthenticatedSupabaseClient } from "~/lib/auth-server";
import { Button } from "~/components/ui/button";
import { AchievementStats } from "~/features/bucket-list/components/achievement-stats";
import { CategoryProgress } from "~/features/bucket-list/components/category-progress";
import { StatCardSkeleton, ProgressCardSkeleton } from "~/components/ui";

export function meta() {
  return [{ title: "ダッシュボード - やりたいこと一覧" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // TDD: SSR-compatible authentication check
    const authResult = await getServerAuth(request);

    // 認証されていない場合はリダイレクト
    if (!authResult.isAuthenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // TDD: 関数型Repository＋Serviceでデータ取得
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(authResult);
    const functionalService = createAuthenticatedBucketListService(
      authenticatedSupabase
    );

    // TDD: 関数型サービスでダッシュボードデータを取得
    const dashboardDataResult = await functionalService.getDashboardData(
      authResult.user!.id
    );

    // TDD: Result型による安全なエラーハンドリング
    if (isFailure(dashboardDataResult)) {
      console.error("Dashboard data fetch error:", dashboardDataResult.error);
      console.error(
        "Full error details:",
        JSON.stringify(dashboardDataResult.error, null, 2)
      );
      throw new Response("Failed to load dashboard data", { status: 500 });
    }

    const dashboardData = dashboardDataResult.data;

    // TDD: 最近完了した項目（直近5件）を関数型アプローチで取得
    const recentCompletedItems = dashboardData.items
      .filter((item) => item.status === "completed" && item.completed_at)
      .sort(
        (a, b) =>
          new Date(b.completed_at!).getTime() -
          new Date(a.completed_at!).getTime()
      )
      .slice(0, 5);

    // TDD: 期限が近い項目（今後30日以内）を関数型アプローチで取得
    const upcomingItems = dashboardData.items
      .filter((item) => {
        if (!item.due_date || item.status === "completed") {
          return false;
        }
        const dueDate = new Date(item.due_date);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return dueDate <= thirtyDaysFromNow && dueDate >= new Date();
      })
      .sort(
        (a, b) =>
          new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      )
      .slice(0, 5);

    // TDD: 関数型アプローチで成功時のデータ返却
    return {
      bucketItems: dashboardData.items,
      categories: dashboardData.categories,
      stats: dashboardData.stats,
      itemsByCategory: dashboardData.itemsByCategory,
      recentCompletedItems,
      upcomingItems,
      user: authResult.user,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    // TDD: 関数型アプローチでもエラーログは維持
    console.error("Loader error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error("Error type:", typeof error);
    throw new Response("Server error", { status: 500 });
  }
}

// ローディング時のスケルトンコンポーネント
function DashboardSkeleton() {
  return (
    <AuthenticatedLayout title="ダッシュボード">
      <div className="container mx-auto px-4 py-8 pb-12">
        <div className="mb-8">
          <div className="flex flex-col space-y-4 mb-6 md:flex-row md:justify-between md:items-center md:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                ダッシュボード
              </h1>
              <p className="text-gray-600 mt-2">
                あなたのやりたいことの達成状況を一覧で確認できます
              </p>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Link to="/bucket-list/add">
                <Button className="w-full sm:w-auto">+ 新しく追加</Button>
              </Link>
              <Link to="/bucket-list">
                <Button variant="outline" className="w-full sm:w-auto">
                  やりたいこと一覧
                </Button>
              </Link>
            </div>
          </div>

          {/* スケルトンローディング */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <StatCardSkeleton />
            <ProgressCardSkeleton />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                🎉 最近の達成
              </h2>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-3 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2 bg-gray-300"></div>
                        <div className="h-4 bg-gray-300 rounded w-32"></div>
                      </div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                ⏰ 期限が近い項目
              </h2>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-3 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2 bg-gray-300"></div>
                        <div className="h-4 bg-gray-300 rounded w-32"></div>
                      </div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                    <div className="mt-2 ml-5">
                      <div className="h-8 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 クイックアクション
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="text-center p-4 sm:p-6 border border-gray-200 rounded-lg min-h-[80px] sm:min-h-[100px] flex flex-col justify-center items-center animate-pulse"
                >
                  <div className="w-8 h-8 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const {
    bucketItems,
    categories,
    stats,
    recentCompletedItems,
    upcomingItems,
  } = loaderData;

  // ナビゲーション中はスケルトンを表示
  if (navigation.state === "loading") {
    return <DashboardSkeleton />;
  }

  return (
    <AuthenticatedLayout title="ダッシュボード">
      <div className="container mx-auto px-4 py-8 pb-12">
        <div className="mb-8">
          <div className="flex flex-col space-y-4 mb-6 md:flex-row md:justify-between md:items-center md:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                ダッシュボード
              </h1>
              <p className="text-gray-600 mt-2">
                あなたのやりたいことの達成状況を一覧で確認できます
              </p>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Link to="/bucket-list/add">
                <Button className="w-full sm:w-auto">+ 新しく追加</Button>
              </Link>
              <Link to="/bucket-list">
                <Button variant="outline" className="w-full sm:w-auto">
                  やりたいこと一覧
                </Button>
              </Link>
            </div>
          </div>

          {/* 達成率とカテゴリ別進捗 */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AchievementStats stats={stats} />
              <CategoryProgress categories={categories} items={bucketItems} />
            </div>
          )}

          {/* 最近の達成とこれからの予定 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 最近完了した項目 */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                🎉 最近の達成
              </h2>
              {recentCompletedItems.length > 0 ? (
                <div className="space-y-3">
                  {recentCompletedItems.map((item) => {
                    const category = categories.find(
                      (cat) => cat.id === item.category_id
                    );
                    return (
                      <div
                        key={item.id}
                        className="border border-green-200 rounded-lg p-3 bg-green-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{
                                backgroundColor: category?.color || "#666",
                              }}
                            ></div>
                            <h3 className="font-medium text-gray-900">
                              {item.title}
                            </h3>
                          </div>
                          <span className="text-xs text-green-600">
                            {new Date(item.completed_at!).toLocaleDateString(
                              "ja-JP"
                            )}
                          </span>
                        </div>
                        {item.completion_comment && (
                          <p className="text-sm text-gray-600 mt-1 ml-5">
                            {item.completion_comment}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  まだ完了した項目がありません。
                  <br />
                  最初の目標を達成してみましょう！
                </p>
              )}
            </div>

            {/* 期限が近い項目 */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                ⏰ 期限が近い項目
              </h2>
              {upcomingItems.length > 0 ? (
                <div className="space-y-3">
                  {upcomingItems.map((item) => {
                    const category = categories.find(
                      (cat) => cat.id === item.category_id
                    );
                    const daysUntilDue = Math.ceil(
                      (new Date(item.due_date!).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysUntilDue <= 7;

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-3 ${
                          isUrgent
                            ? "border-red-200 bg-red-50"
                            : "border-yellow-200 bg-yellow-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{
                                backgroundColor: category?.color || "#666",
                              }}
                            ></div>
                            <h3 className="font-medium text-gray-900">
                              {item.title}
                            </h3>
                          </div>
                          <span
                            className={`text-xs ${
                              isUrgent ? "text-red-600" : "text-yellow-600"
                            }`}
                          >
                            あと{daysUntilDue}日
                          </span>
                        </div>
                        <div className="mt-2 ml-5">
                          <Link to={`/bucket-list/edit/${item.id}`}>
                            <Button size="sm" variant="outline">
                              編集
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  期限が近い項目はありません。
                  <br />
                  新しい目標に期限を設定してみませんか？
                </p>
              )}
            </div>
          </div>

          {/* クイックアクション */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 クイックアクション
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Link to="/bucket-list/add">
                <div className="text-center p-4 sm:p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-h-[80px] sm:min-h-[100px] flex flex-col justify-center items-center">
                  <div className="text-2xl mb-2">➕</div>
                  <div className="text-xs sm:text-sm font-medium">新規追加</div>
                </div>
              </Link>
              <Link to="/bucket-list?status=in_progress">
                <div className="text-center p-4 sm:p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-h-[80px] sm:min-h-[100px] flex flex-col justify-center items-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="text-xs sm:text-sm font-medium">
                    進行中を確認
                  </div>
                </div>
              </Link>
              <Link to="/public">
                <div className="text-center p-4 sm:p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-h-[80px] sm:min-h-[100px] flex flex-col justify-center items-center">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-xs sm:text-sm font-medium">
                    みんなのリスト
                  </div>
                </div>
              </Link>
              <Link to="/bucket-list?status=completed">
                <div className="text-center p-4 sm:p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-h-[80px] sm:min-h-[100px] flex flex-col justify-center items-center">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-xs sm:text-sm font-medium">
                    達成済みを見る
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
