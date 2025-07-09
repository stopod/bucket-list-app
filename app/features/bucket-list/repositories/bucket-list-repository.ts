import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
  BucketListFilters,
  BucketListSort,
} from "~/features/bucket-list/types";

// Repository インターフェース
export interface BucketListRepository {
  // バケットリスト項目の操作
  findAll(
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ): Promise<BucketItem[]>;
  findAllWithCategory(
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ): Promise<(BucketItem & { category: Category })[]>;
  findById(id: string): Promise<BucketItem | null>;
  findByProfileId(
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ): Promise<BucketItem[]>;
  findPublic(
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ): Promise<BucketItem[]>;
  create(data: BucketItemInsert): Promise<BucketItem>;
  update(id: string, data: BucketItemUpdate): Promise<BucketItem>;
  delete(id: string): Promise<void>;

  // カテゴリの操作
  findAllCategories(): Promise<Category[]>;
  findCategoryById(id: number): Promise<Category | null>;

  // 統計の操作
  getUserStats(profileId: string): Promise<UserBucketStats | null>;
}

// エラー型定義（既存コードとの互換性のため）
export class BucketListRepositoryError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "BucketListRepositoryError";
  }
}

// 結果型定義
export type RepositoryResult<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: BucketListRepositoryError;
    };

// 安全な結果返却用のヘルパー関数
export function createSuccess<T>(data: T): RepositoryResult<T> {
  return { data, error: null };
}

export function createError<T>(
  message: string,
  code?: string,
): RepositoryResult<T> {
  return { data: null, error: new BucketListRepositoryError(message, code) };
}

