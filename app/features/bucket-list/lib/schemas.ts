import { z } from "zod";

// やりたいこと項目のバリデーションスキーマ
export const bucketItemSchema = z.object({
  title: z
    .string({ required_error: "タイトルは必須です" })
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  
  category_id: z
    .number({ required_error: "カテゴリを選択してください" })
    .int("無効なカテゴリです")
    .positive("有効なカテゴリを選択してください"),
  
  priority: z.enum(["high", "medium", "low"], {
    required_error: "優先度を選択してください"
  }),
  
  due_date: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, "有効な日付を入力してください"),
  
  due_type: z.enum(["specific_date", "this_year", "next_year", "unspecified"], {
    required_error: "期限タイプを選択してください"
  }),
  
  is_public: z.boolean().default(true),
});

// フォーム送信用の型
export type BucketItemFormSchema = z.infer<typeof bucketItemSchema>;

// バリデーション用のヘルパー関数
export function validateBucketItemForm(formData: FormData) {
  return bucketItemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    category_id: Number(formData.get("category_id")),
    priority: formData.get("priority"),
    due_date: formData.get("due_date") || "",
    due_type: formData.get("due_type"),
    is_public: formData.get("is_public") === "true",
  });
}