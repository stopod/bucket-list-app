import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Category } from "../types";
import { bucketItemSchema, type BucketItemFormSchema } from "../lib/schemas";

interface BucketItemFormConformProps {
  categories: Category[];
  onCancel: () => void;
  defaultValue?: Partial<BucketItemFormSchema>;
  mode?: "create" | "edit";
  errors?: Record<string, string[]>;
}

export function BucketItemFormConform({
  categories,
  onCancel,
  defaultValue,
  mode = "create",
  errors,
}: BucketItemFormConformProps) {
  const [form, fields] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: bucketItemSchema });
    },
    defaultValue: {
      title: defaultValue?.title || "",
      description: defaultValue?.description || "",
      category_id:
        defaultValue?.category_id ||
        (categories.length > 0 ? categories[0].id : 1),
      priority: defaultValue?.priority || "medium",
      due_date: defaultValue?.due_date || "",
      due_type: defaultValue?.due_type || "unspecified",
      is_public: defaultValue?.is_public ?? true,
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  // カテゴリが読み込まれていない場合の表示
  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">カテゴリを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === "create"
            ? "新しいやりたいことを追加"
            : "やりたいことを編集"}
        </h2>
        <p className="text-gray-600 mt-2">
          {mode === "create"
            ? "あなたが人生でやりたいことを追加しましょう"
            : "項目の内容を編集できます"}
        </p>
      </div>

      <form
        id={form.id}
        onSubmit={form.onSubmit}
        method="POST"
        className="space-y-6"
      >
        {/* タイトル */}
        <div>
          <label
            htmlFor={fields.title.id}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            タイトル <span className="text-red-500">*</span>
          </label>
          <Input
            key={fields.title.key}
            name={fields.title.name}
            defaultValue={fields.title.initialValue}
            placeholder="例: 富士山に登る"
            className="w-full"
          />
          {fields.title.errors && (
            <p className="mt-1 text-sm text-red-600">
              {fields.title.errors[0]}
            </p>
          )}
        </div>

        {/* 説明 */}
        <div>
          <label
            htmlFor={fields.description.id}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            説明・詳細
          </label>
          <textarea
            key={fields.description.key}
            name={fields.description.name}
            defaultValue={fields.description.initialValue}
            placeholder="詳細な説明やメモを記入してください..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {fields.description.errors && (
            <p className="mt-1 text-sm text-red-600">
              {fields.description.errors[0]}
            </p>
          )}
        </div>

        {/* カテゴリと優先度 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={fields.category_id.id}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              key={fields.category_id.key}
              name={fields.category_id.name}
              defaultValue={fields.category_id.initialValue}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fields.category_id.errors && (
              <p className="mt-1 text-sm text-red-600">
                {fields.category_id.errors[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={fields.priority.id}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              優先度
            </label>
            <select
              key={fields.priority.key}
              name={fields.priority.name}
              defaultValue={fields.priority.initialValue}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            {fields.priority.errors && (
              <p className="mt-1 text-sm text-red-600">
                {fields.priority.errors[0]}
              </p>
            )}
          </div>
        </div>

        {/* 期限設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            期限
          </label>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name={fields.due_type.name}
                  value="unspecified"
                  defaultChecked={
                    fields.due_type.initialValue === "unspecified"
                  }
                  className="mr-2"
                />
                未定
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={fields.due_type.name}
                  value="this_year"
                  defaultChecked={fields.due_type.initialValue === "this_year"}
                  className="mr-2"
                />
                今年中
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={fields.due_type.name}
                  value="next_year"
                  defaultChecked={fields.due_type.initialValue === "next_year"}
                  className="mr-2"
                />
                来年中
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={fields.due_type.name}
                  value="specific_date"
                  defaultChecked={
                    fields.due_type.initialValue === "specific_date"
                  }
                  className="mr-2"
                />
                具体的な日付
              </label>
            </div>

            <Input
              key={fields.due_date.key}
              name={fields.due_date.name}
              defaultValue={fields.due_date.initialValue}
              type="date"
              className="w-full md:w-auto"
              style={{
                display:
                  fields.due_type.initialValue === "specific_date"
                    ? "block"
                    : "none",
              }}
            />
            {fields.due_type.errors && (
              <p className="mt-1 text-sm text-red-600">
                {fields.due_type.errors[0]}
              </p>
            )}
            {fields.due_date.errors && (
              <p className="mt-1 text-sm text-red-600">
                {fields.due_date.errors[0]}
              </p>
            )}
          </div>
        </div>

        {/* 公開設定 */}
        <div>
          <label className="flex items-center">
            <input
              key={fields.is_public.key}
              name={fields.is_public.name}
              defaultChecked={Boolean(fields.is_public.initialValue)}
              type="checkbox"
              value="true"
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              他のユーザーに公開する
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            公開すると、他のユーザーがあなたのやりたいことを参考として閲覧できます
          </p>
          {fields.is_public.errors && (
            <p className="mt-1 text-sm text-red-600 ml-7">
              {fields.is_public.errors[0]}
            </p>
          )}
        </div>

        {/* サーバーエラー表示 */}
        {errors && Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              エラーが発生しました
            </h3>
            <ul className="text-sm text-red-600 space-y-1">
              {Object.entries(errors).map(([field, fieldErrors]) =>
                fieldErrors.map((error, index) => (
                  <li key={`${field}-${index}`}>• {error}</li>
                )),
              )}
            </ul>
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit">{mode === "create" ? "追加" : "更新"}</Button>
        </div>
      </form>
    </div>
  );
}
