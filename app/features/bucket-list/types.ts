import type { Tables, TablesInsert, TablesUpdate } from "~/shared/types/database";

// データベース型のエイリアス
export type BucketItem = Tables<"bucket_items">;
export type BucketItemInsert = TablesInsert<"bucket_items">;
export type BucketItemUpdate = TablesUpdate<"bucket_items">;
export type Category = Tables<"categories">;
export type UserBucketStats = Tables<"user_bucket_stats">;

// アプリケーション固有の型定義（データベースの制約と一致）
export type Priority = "high" | "medium" | "low";
export type Status = "not_started" | "in_progress" | "completed";
export type DueType = "specific_date" | "this_year" | "next_year" | "unspecified";

// データベース型との整合性を保つためのアサーション関数
export function assertPriority(priority: string): Priority {
  if (!["high", "medium", "low"].includes(priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }
  return priority as Priority;
}

export function assertStatus(status: string): Status {
  if (!["not_started", "in_progress", "completed"].includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  return status as Status;
}

export function assertDueType(dueType: string): DueType {
  if (!["specific_date", "this_year", "next_year", "unspecified"].includes(dueType)) {
    throw new Error(`Invalid due type: ${dueType}`);
  }
  return dueType as DueType;
}

// UIで使用するための拡張型
export interface BucketItemWithCategory extends BucketItem {
  category: Category;
}

// フォーム用の型
export interface BucketItemFormData {
  title: string;
  description?: string;
  category_id: number;
  priority: Priority;
  status?: Status;
  due_date?: string;
  due_type?: DueType;
  is_public: boolean;
}

// 更新用の型（完了時のコメント追加など）
export interface BucketItemCompletionData {
  completion_comment?: string;
  completed_at: string;
  status: "completed";
}

// フィルター・ソート用の型
export interface BucketListFilters {
  profile_id?: string;
  category_id?: number;
  priority?: Priority;
  status?: Status;
  is_public?: boolean;
  search?: string;
}

export interface BucketListSort {
  field: "created_at" | "updated_at" | "due_date" | "title" | "priority";
  direction: "asc" | "desc";
}

// 優先度のラベルマップ
export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
} as const;

// ステータスのラベルマップ
export const STATUS_LABELS: Record<Status, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  completed: "完了",
} as const;

// 期限タイプのラベルマップ
export const DUE_TYPE_LABELS: Record<DueType, string> = {
  specific_date: "具体的な日付",
  this_year: "今年中",
  next_year: "来年中",
  unspecified: "未定",
} as const;

// 優先度の色分け
export const PRIORITY_COLORS: Record<Priority, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
} as const;

// ステータスの色分け
export const STATUS_COLORS: Record<Status, string> = {
  not_started: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
} as const;