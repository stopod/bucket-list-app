/**
 * クイック項目作成コンポーネント
 * Result型対応のhookを使用したインライン項目作成
 */

import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LoadingOverlay } from "~/components/ui/loading-overlay";
import type {
  BucketItem,
  Category,
  Priority,
  BucketItemFormData,
} from "~/features/bucket-list/types";
import type { BucketListRepository } from "~/features/bucket-list/repositories";
import {
  useCreateBucketItem,
  useCategories,
} from "~/features/bucket-list/hooks/use-bucket-list-operations";
import { isSuccess } from "~/shared/types/result";
import { createFunctionalBucketListService } from "~/features/bucket-list/services/functional-bucket-list-service";

interface QuickItemCreatorProps {
  repository: BucketListRepository;
  profileId: string;
  onItemCreated?: (item: BucketItem) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  defaultCategoryId?: number;
  defaultPriority?: Priority;
  compact?: boolean;
}

export function QuickItemCreator({
  repository,
  profileId,
  onItemCreated,
  onError,
  onCancel,
  defaultCategoryId,
  defaultPriority = "medium",
  compact = false,
}: QuickItemCreatorProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [formData, setFormData] = useState<Partial<BucketItemFormData>>({
    title: "",
    description: "",
    category_id: defaultCategoryId,
    priority: defaultPriority,
    is_public: true,
  });

  // 関数型サービスから取得
  const functionalService = useMemo(() => {
    return createFunctionalBucketListService(repository);
  }, [repository]);

  // カテゴリ一覧取得
  const categoriesHook = useCategories(repository);

  // 項目作成Hook
  const createItem = useCreateBucketItem(repository, {
    onSuccess: (item) => {
      setFormData({
        title: "",
        description: "",
        category_id: defaultCategoryId,
        priority: defaultPriority,
        is_public: true,
      });
      if (compact) setIsExpanded(false);
      onItemCreated?.(item);
    },
    onError: (error) => {
      onError?.(error.message || "項目の作成に失敗しました");
    },
  });

  // 初回カテゴリ読み込み
  const loadCategories = async () => {
    if (categoriesHook.data && categoriesHook.data.length > 0) return;

    const result = await categoriesHook.execute(
      functionalService.getCategories,
    );
    if (isSuccess(result) && result.data.length > 0 && !formData.category_id) {
      setFormData((prev) => ({
        ...prev,
        category_id: result.data[0].id,
      }));
    }
  };

  // 展開時にカテゴリを読み込み
  const handleExpand = () => {
    setIsExpanded(true);
    loadCategories();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim() || !formData.category_id) {
      onError?.("タイトルとカテゴリは必須です");
      return;
    }

    const result = await createItem.execute(
      functionalService.createBucketItem,
      {
        profile_id: profileId,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        category_id: formData.category_id,
        priority: formData.priority || "medium",
        status: "not_started",
        is_public: formData.is_public ?? true,
      },
    );

    if (!isSuccess(result)) {
      console.error("Item creation failed:", result.error);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: "",
      description: "",
      category_id: defaultCategoryId,
      priority: defaultPriority,
      is_public: true,
    });
    if (compact) setIsExpanded(false);
    onCancel?.();
  };

  // コンパクトモードで未展開の場合
  if (compact && !isExpanded) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
        <Button
          variant="ghost"
          onClick={handleExpand}
          className="w-full text-gray-600 hover:text-gray-900"
        >
          <span className="text-lg mr-2">➕</span>
          新しい項目を追加
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay
        isVisible={createItem.isLoading}
        message="項目を作成中..."
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          ➕ 新しい項目を追加
        </h4>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div>
            <label
              htmlFor="quick-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              タイトル <span className="text-red-500">*</span>
            </label>
            <Input
              id="quick-title"
              type="text"
              value={formData.title || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="やりたいことを入力..."
              required
              className="w-full"
            />
          </div>

          {/* 説明（オプション） */}
          <div>
            <label
              htmlFor="quick-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              説明（オプション）
            </label>
            <textarea
              id="quick-description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="詳細な説明..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* カテゴリと優先度 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="quick-category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                カテゴリ <span className="text-red-500">*</span>
              </label>
              {categoriesHook.isLoading ? (
                <div className="flex items-center text-sm text-gray-500">
                  <span className="animate-spin mr-2">⏳</span>
                  カテゴリを読み込み中...
                </div>
              ) : categoriesHook.error ? (
                <div className="text-sm text-red-600">
                  カテゴリの読み込みに失敗しました
                </div>
              ) : (
                <select
                  id="quick-category"
                  value={formData.category_id || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: Number(e.target.value),
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">カテゴリを選択</option>
                  {categoriesHook.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label
                htmlFor="quick-priority"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                優先度
              </label>
              <select
                id="quick-priority"
                value={formData.priority || "medium"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: e.target.value as Priority,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {/* 公開設定 */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_public ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_public: e.target.checked,
                  }))
                }
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                他のユーザーに公開する
              </span>
            </label>
          </div>

          {/* エラー表示 */}
          {createItem.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {createItem.error.message || "エラーが発生しました"}
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createItem.isLoading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={
                createItem.isLoading ||
                !formData.title?.trim() ||
                !formData.category_id
              }
            >
              {createItem.isLoading ? "作成中..." : "追加"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 最小限のクイック追加フォーム
 * タイトルのみで素早く項目を追加
 */
interface MinimalQuickCreatorProps {
  repository: BucketListRepository;
  profileId: string;
  defaultCategoryId: number;
  onItemCreated?: (item: BucketItem) => void;
  onError?: (error: string) => void;
  placeholder?: string;
}

export function MinimalQuickCreator({
  repository,
  profileId,
  defaultCategoryId,
  onItemCreated,
  onError,
  placeholder = "新しいやりたいことを入力...",
}: MinimalQuickCreatorProps) {
  const [title, setTitle] = useState("");

  // 関数型サービスから取得
  const functionalService = useMemo(() => {
    return createFunctionalBucketListService(repository);
  }, [repository]);

  const createItem = useCreateBucketItem(repository, {
    onSuccess: (item) => {
      setTitle("");
      onItemCreated?.(item);
    },
    onError: (error) => {
      onError?.(error.message || "項目の作成に失敗しました");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const result = await createItem.execute(
      functionalService.createBucketItem,
      {
        profile_id: profileId,
        title: title.trim(),
        category_id: defaultCategoryId,
        priority: "medium",
        status: "not_started",
        is_public: true,
      },
    );

    if (!isSuccess(result)) {
      console.error("Item creation failed:", result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        disabled={createItem.isLoading}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={createItem.isLoading || !title.trim()}
        size="sm"
      >
        {createItem.isLoading ? "追加中..." : "追加"}
      </Button>
    </form>
  );
}
