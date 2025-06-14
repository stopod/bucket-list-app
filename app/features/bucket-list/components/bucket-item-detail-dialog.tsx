import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui";
import type { BucketItemWithCategory, Category, Status, Priority } from "../types";
import { 
  PRIORITY_LABELS, 
  STATUS_LABELS, 
  DUE_TYPE_LABELS,
  PRIORITY_COLORS, 
  STATUS_COLORS,
  assertPriority,
  assertStatus
} from "../types";

interface BucketItemDetailDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** 表示する項目データ */
  item: BucketItemWithCategory | null;
  /** カテゴリ一覧 */
  categories: Category[];
  /** 削除ダイアログを開く関数 */
  onDelete: (item: { id: string; title: string }) => void;
  /** ステータス変更関数 */
  onStatusChange: (itemId: string, newStatus: string) => void;
  /** 送信中フラグ */
  isSubmitting?: boolean;
  /** 読み取り専用モード（公開リスト等で使用） */
  readOnly?: boolean;
  /** ステータス変更中のアイテムIDのSet */
  statusChangingIds?: Set<string>;
}

/**
 * バケットリスト項目の詳細表示ダイアログ
 * 項目の全ての詳細情報を表示し、編集・削除・ステータス変更が可能
 */
export function BucketItemDetailDialog({
  isOpen,
  onClose,
  item,
  categories,
  onDelete,
  onStatusChange,
  isSubmitting = false,
  readOnly = false,
  statusChangingIds = new Set()
}: BucketItemDetailDialogProps) {
  if (!isOpen || !item) return null;

  // 型安全性を確保したラベル取得
  const priorityDisplay = (() => {
    try {
      assertPriority(item.priority);
      return PRIORITY_LABELS[item.priority as Priority];
    } catch {
      return item.priority;
    }
  })();

  const statusDisplay = (() => {
    try {
      assertStatus(item.status);
      return STATUS_LABELS[item.status as Status];
    } catch {
      return item.status;
    }
  })();

  const priorityColor = (() => {
    try {
      assertPriority(item.priority);
      return PRIORITY_COLORS[item.priority as Priority];
    } catch {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  })();

  const statusColor = (() => {
    try {
      assertStatus(item.status);
      return STATUS_COLORS[item.status as Status];
    } catch {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  })();

  // 期限表示のフォーマット
  const dueDateDisplay = (() => {
    if (item.due_date) {
      return `期限: ${item.due_date}`;
    } else if (item.due_type) {
      const label = DUE_TYPE_LABELS[item.due_type as keyof typeof DUE_TYPE_LABELS];
      return `期限: ${label || item.due_type}`;
    }
    return '期限: 未定';
  })();

  // ESCキーでダイアログを閉じる
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // 背景クリックでダイアログを閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {item.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* 優先度バッジ */}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priorityColor}`}>
                {priorityDisplay}
              </span>
              {/* ステータスバッジ */}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                {statusDisplay}
              </span>
              {/* 公開状態 */}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                item.is_public ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {item.is_public ? '公開' : '非公開'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0"
            disabled={isSubmitting}
          >
            ✕
          </Button>
        </div>

        {/* メインコンテンツ */}
        <div className="px-6 py-4 space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">カテゴリ</h3>
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.category.color }}
                ></div>
                <span className="text-gray-900">{item.category.name}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">期限</h3>
              <p className="text-gray-900">{dueDateDisplay}</p>
            </div>
          </div>

          {/* 説明文 */}
          {item.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">説明</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{item.description}</p>
              </div>
            </div>
          )}

          {/* 達成情報（完了時のみ） */}
          {item.completed_at && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">達成情報</h3>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  達成日: {new Date(item.completed_at).toLocaleDateString('ja-JP')}
                </p>
                {item.completion_comment && (
                  <p className="text-green-700 mt-2">{item.completion_comment}</p>
                )}
              </div>
            </div>
          )}

          {/* メタ情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">作成日: </span>
              {item.created_at ? new Date(item.created_at).toLocaleDateString('ja-JP') : '不明'}
            </div>
            <div>
              <span className="font-medium">更新日: </span>
              {item.updated_at ? new Date(item.updated_at).toLocaleDateString('ja-JP') : '不明'}
            </div>
          </div>

          {/* ステータス変更（編集可能モードのみ） */}
          {!readOnly && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                ステータス変更
                {statusChangingIds.has(item.id) && (
                  <Spinner size="sm" className="ml-2" />
                )}
              </h3>
              <div className="relative">
                <select
                  value={item.status}
                  onChange={(e) => onStatusChange(item.id, e.target.value)}
                  disabled={isSubmitting || statusChangingIds.has(item.id)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="not_started">未着手</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了</option>
                </select>
                {statusChangingIds.has(item.id) && (
                  <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                    <div className="text-xs text-blue-600">変更中...</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* フッター（アクションボタン） */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          {!readOnly && (
            <div className="flex space-x-3">
              <Link to={`/bucket-list/edit/${item.id}`}>
                <Button variant="outline" disabled={isSubmitting}>
                  編集
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => onDelete({ id: item.id, title: item.title })}
                disabled={isSubmitting}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                削除
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className={readOnly ? 'mx-auto' : ''}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}