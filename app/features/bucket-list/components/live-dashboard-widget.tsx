/**
 * ライブダッシュボードウィジェット
 * Result型対応のhookを使用したリアルタイムデータ表示
 */

import { useEffect, useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import type { BucketListRepository } from "~/features/bucket-list/repositories";
import { useDashboardData } from "~/features/bucket-list/hooks/use-bucket-list-operations";
import { isSuccess, isFailure } from "~/shared/types/result";
import { createFunctionalBucketListService } from "~/features/bucket-list/services/functional-bucket-list-service";

interface LiveDashboardWidgetProps {
  repository: BucketListRepository;
  profileId: string;
  refreshInterval?: number; // ミリ秒
  showRefreshButton?: boolean;
}

export function LiveDashboardWidget({
  repository,
  profileId,
  refreshInterval = 30000, // 30秒
  showRefreshButton = true,
}: LiveDashboardWidgetProps) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const dashboardData = useDashboardData(repository);

  // 関数型サービスから取得
  const functionalService = useMemo(() => {
    return createFunctionalBucketListService(repository);
  }, [repository]);

  // データ読み込み関数
  const loadDashboardData = async () => {
    const result = await dashboardData.execute(
      functionalService.getDashboardData,
      profileId,
    );

    if (isSuccess(result)) {
      setLastUpdated(new Date());
    }
  };

  // 初回読み込み
  useEffect(() => {
    loadDashboardData();
  }, [profileId]);

  // 自動更新
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, profileId]);

  const handleManualRefresh = () => {
    loadDashboardData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (dashboardData.isLoading && !dashboardData.data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center py-8">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">
            ダッシュボードデータを読み込み中...
          </span>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            ⚠️ ダッシュボードデータの読み込みに失敗しました
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {dashboardData.error.message || "エラーが発生しました"}
          </p>
          <Button onClick={handleManualRefresh} variant="outline">
            再読み込み
          </Button>
        </div>
      </div>
    );
  }

  const data = dashboardData.data;
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-500">データがありません</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* ヘッダー */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          📊 ライブダッシュボード
        </h3>
        <div className="flex items-center space-x-2">
          {/* 最終更新時刻 */}
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              最終更新: {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          {/* 自動更新トグル */}
          <Button
            size="sm"
            variant="outline"
            onClick={toggleAutoRefresh}
            className={`text-xs ${
              autoRefresh
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-600"
            }`}
          >
            {autoRefresh ? "⏰ 自動更新ON" : "⏸️ 自動更新OFF"}
          </Button>

          {/* 手動更新ボタン */}
          {showRefreshButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualRefresh}
              disabled={dashboardData.isLoading}
              className="text-xs"
            >
              {dashboardData.isLoading ? (
                <span className="flex items-center">
                  <Spinner size="sm" className="mr-1" />
                  更新中
                </span>
              ) : (
                "🔄 更新"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4">
        {/* 統計サマリー */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {data.stats.total_items || 0}
            </div>
            <div className="text-sm text-gray-600">総項目数</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {data.stats.completed_items || 0}
            </div>
            <div className="text-sm text-gray-600">完了済み</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {data.stats.in_progress_items || 0}
            </div>
            <div className="text-sm text-gray-600">進行中</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {data.stats.completion_rate || 0}%
            </div>
            <div className="text-sm text-gray-600">達成率</div>
          </div>
        </div>

        {/* 最近の完了項目 */}
        {data.recentCompletedItems.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              🎉 最近の達成 (直近5件)
            </h4>
            <div className="space-y-2">
              {data.recentCompletedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {item.title}
                  </span>
                  <span className="text-xs text-green-600">
                    {item.completed_at &&
                      new Date(item.completed_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 期限が近い項目 */}
        {data.upcomingItems.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              ⏰ 期限が近い項目 (30日以内)
            </h4>
            <div className="space-y-2">
              {data.upcomingItems.map((item) => {
                const daysUntilDue = item.due_date
                  ? Math.ceil(
                      (new Date(item.due_date).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;
                const isUrgent = daysUntilDue !== null && daysUntilDue <= 7;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 border rounded ${
                      isUrgent
                        ? "bg-red-50 border-red-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {item.title}
                    </span>
                    <span
                      className={`text-xs ${
                        isUrgent ? "text-red-600" : "text-yellow-600"
                      }`}
                    >
                      {daysUntilDue !== null
                        ? `あと${daysUntilDue}日`
                        : "期限未設定"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* カテゴリ別進捗 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            📂 カテゴリ別進捗
          </h4>
          <div className="space-y-2">
            {data.itemsByCategory.map(({ category, items }) => {
              const completed = items.filter(
                (item) => item.status === "completed",
              ).length;
              const total = items.length;
              const rate =
                total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-2 border border-gray-200 rounded"
                >
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {completed}/{total} ({rate}%)
                    </div>
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 空の状態 */}
        {data.items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">まだ項目が登録されていません</p>
            <p className="text-sm">新しい目標を追加してみましょう！</p>
          </div>
        )}
      </div>
    </div>
  );
}
