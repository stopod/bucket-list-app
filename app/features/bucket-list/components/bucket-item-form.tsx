import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, LoadingOverlay, Card, CardContent, CardHeader, CardTitle } from "~/components/ui";
import type { BucketItemFormData, Category, Priority, DueType, Status } from "../types";

interface BucketItemFormProps {
  categories: Category[];
  onSubmit: (data: BucketItemFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<BucketItemFormData>;
  defaultValues?: Partial<BucketItemFormData>;
  mode?: "create" | "edit";
}

export function BucketItemForm({
  categories,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
  defaultValues,
  mode = "create"
}: BucketItemFormProps) {
  const defaultData = defaultValues || initialData || {};
  const [formData, setFormData] = useState<BucketItemFormData>({
    title: defaultData?.title || "",
    description: defaultData?.description || "",
    category_id: defaultData?.category_id || (categories.length > 0 ? categories[0].id : 1),
    priority: defaultData?.priority || "medium",
    status: defaultData?.status || "not_started",
    due_date: defaultData?.due_date || "",
    due_type: defaultData?.due_type || "unspecified",
    is_public: defaultData?.is_public ?? true,
  });

  // カテゴリが読み込まれていない場合の表示
  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500 mb-4">カテゴリが見つかりません</p>
          <p className="text-sm text-gray-400">
            データベースにカテゴリが登録されていない可能性があります。<br/>
            管理者にお問い合わせください。
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  const handleDueDateChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      due_date: value,
      due_type: value ? "specific_date" : "unspecified"
    }));
  };

  const handleDueTypeChange = (type: DueType) => {
    setFormData(prev => {
      const newData = { ...prev, due_type: type };
      
      // 期限タイプに応じて自動的に日付を設定
      if (type === "this_year") {
        // 今年の12月31日を設定
        newData.due_date = `${new Date().getFullYear()}-12-31`;
      } else if (type === "next_year") {
        // 来年の12月31日を設定
        newData.due_date = `${new Date().getFullYear() + 1}-12-31`;
      } else if (type === "unspecified") {
        // 未定の場合は日付をクリア
        newData.due_date = "";
      } else if (type === "specific_date") {
        // 具体的な日付の場合は既存の日付を保持（空の場合はそのまま）
        newData.due_date = prev.due_date || "";
      }
      
      return newData;
    });
  };

  return (
    <>
      <LoadingOverlay 
        isVisible={isSubmitting} 
        message={mode === "create" ? "追加中..." : "更新中..."}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {mode === "create" ? "新しいやりたいことを追加" : "やりたいことを編集"}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {mode === "create" ? "あなたが人生でやりたいことを追加しましょう" : "項目の内容を編集できます"}
          </p>
        </CardHeader>
        <CardContent>

        <form onSubmit={handleSubmit} className="space-y-6">
        {/* タイトル */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            タイトル <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="例: 富士山に登る"
            required
            className="w-full"
          />
        </div>

        {/* 説明 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            説明・詳細
          </label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="詳細な説明やメモを記入してください..."
            rows={3}
            className="w-full"
          />
        </div>

        {/* カテゴリ、優先度、ステータス */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.category_id.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: Number(value) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Priority }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Status }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">未着手</SelectItem>
                <SelectItem value="in_progress">進行中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 期限設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">期限</label>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="due_type"
                  value="unspecified"
                  checked={formData.due_type === "unspecified"}
                  onChange={(e) => handleDueTypeChange(e.target.value as DueType)}
                  className="mr-2"
                />
                未定
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="due_type"
                  value="this_year"
                  checked={formData.due_type === "this_year"}
                  onChange={(e) => handleDueTypeChange(e.target.value as DueType)}
                  className="mr-2"
                />
                今年中
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="due_type"
                  value="next_year"
                  checked={formData.due_type === "next_year"}
                  onChange={(e) => handleDueTypeChange(e.target.value as DueType)}
                  className="mr-2"
                />
                来年中
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="due_type"
                  value="specific_date"
                  checked={formData.due_type === "specific_date"}
                  onChange={(e) => handleDueTypeChange(e.target.value as DueType)}
                  className="mr-2"
                />
                具体的な日付
              </label>
            </div>
            
            {formData.due_type === "specific_date" && (
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full md:w-auto"
              />
            )}
          </div>
        </div>

        {/* 公開設定 */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              他のユーザーに公開する
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            公開すると、他のユーザーがあなたのやりたいことを参考として閲覧できます
          </p>
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.title.trim()}
          >
            {isSubmitting ? "保存中..." : mode === "create" ? "追加" : "更新"}
          </Button>
        </div>
        </form>
        </CardContent>
      </Card>
    </>
  );
}