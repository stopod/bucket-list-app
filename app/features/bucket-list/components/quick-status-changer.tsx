/**
 * クイックステータス変更コンポーネント
 * Result型対応のhookを使用したリアルタイム更新
 */

import React, { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { LoadingOverlay } from "~/components/ui/loading-overlay";
import type { BucketItem, Status } from "~/features/bucket-list/types";
import type { BucketListRepository } from "~/features/bucket-list/repositories";
import { useUpdateBucketItem } from "~/features/bucket-list/hooks/use-bucket-list-operations";
import { isSuccess } from "~/shared/types/result";
import { createFunctionalBucketListService } from "~/features/bucket-list/services/functional-bucket-list-service";

interface QuickStatusChangerProps {
  item: BucketItem;
  repository: BucketListRepository;
  onStatusChanged?: (item: BucketItem) => void;
  onError?: (error: string) => void;
}

export function QuickStatusChanger({
  item,
  repository,
  onStatusChanged,
  onError,
}: QuickStatusChangerProps) {
  const [isChanging, setIsChanging] = useState(false);

  // 関数型サービスから取得
  const functionalService = useMemo(() => {
    return createFunctionalBucketListService(repository);
  }, [repository]);

  const updateBucketItem = useUpdateBucketItem(repository, {
    onSuccess: (updatedItem) => {
      setIsChanging(false);
      onStatusChanged?.(updatedItem);
    },
    onError: (error) => {
      setIsChanging(false);
      onError?.(error.message || "ステータスの変更に失敗しました");
    },
  });

  const handleStatusChange = async (newStatus: Status) => {
    if (item.status === newStatus || updateBucketItem.isLoading) {
      return;
    }

    setIsChanging(true);

    // Result型対応のサービスを使用して更新
    const result = await updateBucketItem.execute(
      functionalService.updateBucketItem,
      item.id,
      {
        status: newStatus,
        // 完了時は現在時刻を設定
        ...(newStatus === "completed" && {
          completed_at: new Date().toISOString(),
        }),
      }
    );

    if (!isSuccess(result)) {
      // エラーは既にonErrorで処理される
      console.error("Status change failed:", result.error);
    }
  };

  const getStatusLabel = (status: Status) => {
    switch (status) {
      case "not_started":
        return "未着手";
      case "in_progress":
        return "進行中";
      case "completed":
        return "完了";
      default:
        return status;
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "not_started":
        return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
    }
  };

  const statuses: Status[] = ["not_started", "in_progress", "completed"];

  return (
    <div className="relative">
      <LoadingOverlay isVisible={isChanging} message="ステータスを変更中..." />

      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">ステータス:</span>
        {statuses.map((status) => {
          const isCurrentStatus = item.status === status;
          const isDisabled = isChanging || updateBucketItem.isLoading;

          return (
            <Button
              key={status}
              size="sm"
              variant={isCurrentStatus ? "default" : "outline"}
              disabled={isDisabled}
              onClick={() => handleStatusChange(status)}
              className={`text-xs px-3 py-1 border ${
                isCurrentStatus ? "ring-2 ring-blue-500 ring-offset-1" : ""
              } ${getStatusColor(status)}`}
            >
              {getStatusLabel(status)}
              {isCurrentStatus && <span className="ml-1">✓</span>}
            </Button>
          );
        })}
      </div>

      {/* エラー表示 */}
      {updateBucketItem.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {updateBucketItem.error.message || "エラーが発生しました"}
        </div>
      )}

      {/* 成功表示 */}
      {updateBucketItem.isSuccess && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ステータスを変更しました
        </div>
      )}
    </div>
  );
}

/**
 * 単一ボタンでのステータス切り替えコンポーネント
 * 次のステータスに進むためのシンプルなボタン
 */
interface QuickStatusButtonProps {
  item: BucketItem;
  repository: BucketListRepository;
  onStatusChanged?: (item: BucketItem) => void;
  onError?: (error: string) => void;
}

export function QuickStatusButton({
  item,
  repository,
  onStatusChanged,
  onError,
}: QuickStatusButtonProps) {
  // 関数型サービスから取得
  const functionalService = useMemo(() => {
    return createFunctionalBucketListService(repository);
  }, [repository]);

  const updateBucketItem = useUpdateBucketItem(repository, {
    onSuccess: onStatusChanged,
    onError: (error) =>
      onError?.(error.message || "ステータスの変更に失敗しました"),
  });

  const getNextStatus = (currentStatus: string): Status | null => {
    switch (currentStatus) {
      case "not_started":
        return "in_progress";
      case "in_progress":
        return "completed";
      case "completed":
        return null; // 完了済みは変更不可
      default:
        return null;
    }
  };

  const getNextStatusLabel = (currentStatus: string): string => {
    const nextStatus = getNextStatus(currentStatus);
    switch (nextStatus) {
      case "in_progress":
        return "開始する";
      case "completed":
        return "完了する";
      default:
        return "";
    }
  };

  const getButtonColor = (currentStatus: string): string => {
    const nextStatus = getNextStatus(currentStatus);
    switch (nextStatus) {
      case "in_progress":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "completed":
        return "bg-green-600 hover:bg-green-700 text-white";
      default:
        return "bg-gray-300 text-gray-500 cursor-not-allowed";
    }
  };

  const handleNextStatus = async () => {
    const nextStatus = getNextStatus(item.status);
    if (!nextStatus || updateBucketItem.isLoading) {
      return;
    }

    const result = await updateBucketItem.execute(
      functionalService.updateBucketItem,
      item.id,
      {
        status: nextStatus,
        ...(nextStatus === "completed" && {
          completed_at: new Date().toISOString(),
        }),
      }
    );

    if (!isSuccess(result)) {
      console.error("Status change failed:", result.error);
    }
  };

  const nextStatus = getNextStatus(item.status);

  if (!nextStatus) {
    return (
      <div className="flex items-center text-sm text-green-600">
        <span className="mr-2">🎉</span>
        完了済み
      </div>
    );
  }

  return (
    <Button
      size="sm"
      disabled={updateBucketItem.isLoading}
      onClick={handleNextStatus}
      className={getButtonColor(item.status)}
    >
      {updateBucketItem.isLoading ? (
        <span className="flex items-center">
          <span className="animate-spin mr-2">⏳</span>
          変更中...
        </span>
      ) : (
        getNextStatusLabel(item.status)
      )}
    </Button>
  );
}
