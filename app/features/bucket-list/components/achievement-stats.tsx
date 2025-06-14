import type { UserBucketStats } from "../types";
import { StatCardSkeleton } from "~/components/ui";

interface AchievementStatsProps {
  stats?: UserBucketStats;
  className?: string;
  loading?: boolean;
}

export function AchievementStats({ stats, className = "", loading = false }: AchievementStatsProps) {
  // ローディング中の場合はスケルトンを表示
  if (loading || !stats) {
    return <StatCardSkeleton />;
  }
  
  const completionRate = stats.completion_rate || 0;

  // プログレスバーの色を達成率に応じて変更
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 60) return "bg-blue-500";
    if (rate >= 40) return "bg-yellow-500";
    if (rate >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  // 達成レベルのメッセージ
  const getAchievementMessage = (rate: number) => {
    if (rate >= 90) return "素晴らしい達成率です！🏆";
    if (rate >= 70) return "とても良いペースです！🌟";
    if (rate >= 50) return "順調に進んでいます！✨";
    if (rate >= 30) return "少しずつ前進中！💪";
    if (rate >= 10) return "スタートを切りました！🚀";
    return "これから始めましょう！📝";
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 sm:p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">達成状況</h2>
      
      {/* メイン達成率表示 */}
      <div className="text-center mb-6">
        <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          {completionRate}%
        </div>
        <div className="text-sm text-gray-600 mb-4">
          全体達成率
        </div>
        
        {/* プログレスバー */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ease-out ${getProgressColor(completionRate)}`}
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600">
          {getAchievementMessage(completionRate)}
        </p>
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {stats.total_items}
          </div>
          <div className="text-sm text-gray-600">総項目数</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {stats.completed_items}
          </div>
          <div className="text-sm text-gray-600">完了</div>
        </div>
        
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.in_progress_items}
          </div>
          <div className="text-sm text-gray-600">進行中</div>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {stats.not_started_items}
          </div>
          <div className="text-sm text-gray-600">未着手</div>
        </div>
      </div>

      {/* 進捗の詳細メッセージ */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">進捗の内訳</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <div>• {stats.completed_items}個のやりたいことを達成しました</div>
          <div>• {stats.in_progress_items}個のやりたいことに取り組み中です</div>
          <div>• {stats.not_started_items}個のやりたいことが未着手です</div>
        </div>
      </div>

      {/* 次のステップの提案 */}
      {(stats.not_started_items ?? 0) > 0 && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg">
          <h3 className="text-sm font-medium text-purple-900 mb-2">💡 次のステップ</h3>
          <p className="text-sm text-purple-800">
            未着手の項目から1つ選んで、今日から始めてみませんか？
          </p>
        </div>
      )}

      {/* 達成を祝福するメッセージ */}
      {(stats.completed_items ?? 0) > 0 && completionRate >= 50 && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 mb-2">🎉 おめでとうございます！</h3>
          <p className="text-sm text-green-800">
            半分以上のやりたいことを達成されています。素晴らしい成果です！
          </p>
        </div>
      )}
    </div>
  );
}