/**
 * 関数型BucketListRepository - Result型を活用した安全なデータアクセス層
 * 従来のクラスベースRepositoryを関数型アプローチに変換
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
  BucketListFilters,
  BucketListSort,
} from "~/features/bucket-list/types";
import type { Result } from "~/shared/types/result";
import type { BucketListError } from "~/shared/types/errors";
import { success, failure } from "~/shared/types/result";
import { createDatabaseError } from "~/shared/types/errors";

/**
 * 関数型Repository型定義
 * すべての操作がResult型を返し、型安全なエラーハンドリングを提供
 */
export interface FunctionalBucketListRepository {
  // バケットリスト項目の操作
  readonly findAll: (
    filters?: BucketListFilters,
    sort?: BucketListSort
  ) => Promise<Result<BucketItem[], BucketListError>>;
  
  readonly findAllWithCategory: (
    filters?: BucketListFilters,
    sort?: BucketListSort
  ) => Promise<Result<(BucketItem & { category: Category })[], BucketListError>>;
  
  readonly findById: (id: string) => Promise<Result<BucketItem | null, BucketListError>>;
  
  readonly findByProfileId: (
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort
  ) => Promise<Result<BucketItem[], BucketListError>>;
  
  readonly findPublic: (
    filters?: BucketListFilters,
    sort?: BucketListSort
  ) => Promise<Result<BucketItem[], BucketListError>>;
  
  readonly create: (data: BucketItemInsert) => Promise<Result<BucketItem, BucketListError>>;
  
  readonly update: (
    id: string,
    data: BucketItemUpdate
  ) => Promise<Result<BucketItem, BucketListError>>;
  
  readonly delete: (id: string) => Promise<Result<void, BucketListError>>;

  // カテゴリの操作
  readonly findAllCategories: () => Promise<Result<Category[], BucketListError>>;
  
  readonly findCategoryById: (id: number) => Promise<Result<Category | null, BucketListError>>;

  // 統計の操作
  readonly getUserStats: (profileId: string) => Promise<Result<UserBucketStats | null, BucketListError>>;
}

/**
 * Supabaseエラーを適切なBucketListErrorに変換
 */
const handleSupabaseError = (error: any, operation: string): BucketListError => {
  const message = error?.message || "Unknown database error";
  const code = error?.code || "UNKNOWN_ERROR";
  
  return createDatabaseError(
    `${operation} failed: ${message}`,
    code,
    { originalError: error }
  );
};

/**
 * フィルターを適用するヘルパー関数
 */
const applyFilters = (query: any, filters?: BucketListFilters) => {
  if (!filters) return query;

  let filteredQuery = query;

  if (filters.profile_id) {
    filteredQuery = filteredQuery.eq("profile_id", filters.profile_id);
  }
  if (filters.category_id) {
    filteredQuery = filteredQuery.eq("category_id", filters.category_id);
  }
  if (filters.priority) {
    filteredQuery = filteredQuery.eq("priority", filters.priority);
  }
  if (filters.status) {
    filteredQuery = filteredQuery.eq("status", filters.status);
  }
  if (filters.is_public !== undefined) {
    filteredQuery = filteredQuery.eq("is_public", filters.is_public);
  }
  if (filters.search) {
    filteredQuery = filteredQuery.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  return filteredQuery;
};

/**
 * ソートを適用するヘルパー関数
 */
const applySort = (query: any, sort?: BucketListSort) => {
  if (!sort) {
    return query.order("created_at", { ascending: false });
  }

  return query.order(sort.field, { ascending: sort.direction === "asc" });
};

/**
 * 関数型BucketListRepositoryの実装を作成
 */
export const createFunctionalBucketListRepository = (
  supabase: SupabaseClient<Database>
): FunctionalBucketListRepository => {
  
  return {
    findAll: async (filters, sort) => {
      try {
        let query = supabase.from("bucket_items").select("*");
        query = applyFilters(query, filters);
        query = applySort(query, sort);

        const { data, error } = await query;

        if (error) {
          return failure(handleSupabaseError(error, "findAll"));
        }

        return success(data || []);
      } catch (error) {
        return failure(handleSupabaseError(error, "findAll"));
      }
    },

    findAllWithCategory: async (filters, sort) => {
      try {
        let query = supabase.from("bucket_items").select(`
          *,
          category:categories(*)
        `);
        query = applyFilters(query, filters);
        query = applySort(query, sort);

        const { data, error } = await query;

        if (error) {
          return failure(handleSupabaseError(error, "findAllWithCategory"));
        }

        return success((data as (BucketItem & { category: Category })[]) || []);
      } catch (error) {
        return failure(handleSupabaseError(error, "findAllWithCategory"));
      }
    },

    findById: async (id) => {
      try {
        const { data, error } = await supabase
          .from("bucket_items")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No rows found
            return success(null);
          }
          return failure(handleSupabaseError(error, "findById"));
        }

        return success(data);
      } catch (error) {
        return failure(handleSupabaseError(error, "findById"));
      }
    },

    findByProfileId: async (profileId, filters, sort) => {
      try {
        let query = supabase
          .from("bucket_items")
          .select("*")
          .eq("profile_id", profileId);

        query = applyFilters(query, filters);
        query = applySort(query, sort);

        const { data, error } = await query;

        if (error) {
          return failure(handleSupabaseError(error, "findByProfileId"));
        }

        return success(data || []);
      } catch (error) {
        return failure(handleSupabaseError(error, "findByProfileId"));
      }
    },

    findPublic: async (filters, sort) => {
      try {
        let query = supabase
          .from("bucket_items")
          .select("*")
          .eq("is_public", true);

        query = applyFilters(query, filters);
        query = applySort(query, sort);

        const { data, error } = await query;

        if (error) {
          return failure(handleSupabaseError(error, "findPublic"));
        }

        return success(data || []);
      } catch (error) {
        return failure(handleSupabaseError(error, "findPublic"));
      }
    },

    create: async (data) => {
      try {
        const now = new Date().toISOString();
        const insertData = {
          ...data,
          created_at: now,
          updated_at: now,
        };

        const { data: result, error } = await supabase
          .from("bucket_items")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          return failure(handleSupabaseError(error, "create"));
        }

        return success(result);
      } catch (error) {
        return failure(handleSupabaseError(error, "create"));
      }
    },

    update: async (id, data) => {
      try {
        const updateData = {
          ...data,
          updated_at: new Date().toISOString(),
        };

        const { data: result, error } = await supabase
          .from("bucket_items")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          return failure(handleSupabaseError(error, "update"));
        }

        return success(result);
      } catch (error) {
        return failure(handleSupabaseError(error, "update"));
      }
    },

    delete: async (id) => {
      try {
        const { error } = await supabase
          .from("bucket_items")
          .delete()
          .eq("id", id);

        if (error) {
          return failure(handleSupabaseError(error, "delete"));
        }

        return success(undefined);
      } catch (error) {
        return failure(handleSupabaseError(error, "delete"));
      }
    },

    findAllCategories: async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("id");

        if (error) {
          return failure(handleSupabaseError(error, "findAllCategories"));
        }

        return success(data || []);
      } catch (error) {
        return failure(handleSupabaseError(error, "findAllCategories"));
      }
    },

    findCategoryById: async (id) => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No rows found
            return success(null);
          }
          return failure(handleSupabaseError(error, "findCategoryById"));
        }

        return success(data);
      } catch (error) {
        return failure(handleSupabaseError(error, "findCategoryById"));
      }
    },

    getUserStats: async (profileId) => {
      try {
        const { data, error } = await supabase
          .from("user_bucket_stats")
          .select("*")
          .eq("profile_id", profileId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No rows found
            return success(null);
          }
          return failure(handleSupabaseError(error, "getUserStats"));
        }

        return success(data);
      } catch (error) {
        return failure(handleSupabaseError(error, "getUserStats"));
      }
    },
  };
};

/**
 * 関数型Repository操作のヘルパー関数群
 */

/**
 * Repository操作の結果を安全に処理するヘルパー
 */
export const handleRepositoryResult = async <T>(
  operation: () => Promise<Result<T, BucketListError>>
): Promise<Result<T, BucketListError>> => {
  try {
    return await operation();
  } catch (error) {
    return failure(
      createDatabaseError(
        "Unexpected repository error",
        "UNEXPECTED_ERROR",
        { originalError: error }
      )
    );
  }
};

/**
 * 複数のRepository操作を組み合わせるヘルパー
 */
export const combineRepositoryOperations = async <T1, T2>(
  op1: () => Promise<Result<T1, BucketListError>>,
  op2: () => Promise<Result<T2, BucketListError>>
): Promise<Result<[T1, T2], BucketListError>> => {
  const result1 = await handleRepositoryResult(op1);
  if (result1.success === false) {
    return failure(result1.error);
  }

  const result2 = await handleRepositoryResult(op2);
  if (result2.success === false) {
    return failure(result2.error);
  }

  return success([result1.data, result2.data]);
};

/**
 * Repository操作のバッチ処理ヘルパー
 */
export const batchRepositoryOperations = async <T>(
  operations: Array<() => Promise<Result<T, BucketListError>>>
): Promise<Result<T[], BucketListError>> => {
  const results: T[] = [];

  for (const operation of operations) {
    const result = await handleRepositoryResult(operation);
    if (result.success === false) {
      return failure(result.error);
    }
    results.push(result.data);
  }

  return success(results);
};