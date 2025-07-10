import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type { FunctionalBucketListRepository } from "../repositories/bucket-list.repository";
import { createFunctionalBucketListRepository } from "../repositories/bucket-list.repository";
import { createFunctionalBucketListService } from "../services/bucket-list.service";

// Repository Factory
export class RepositoryFactory {
  private static bucketListRepository: FunctionalBucketListRepository | null =
    null;

  static createBucketListRepository(
    supabase: SupabaseClient<Database>
  ): FunctionalBucketListRepository {
    if (!this.bucketListRepository) {
      this.bucketListRepository =
        createFunctionalBucketListRepository(supabase);
    }
    return this.bucketListRepository;
  }

  // テスト用：モックリポジトリを注入可能
  static setBucketListRepository(
    repository: FunctionalBucketListRepository
  ): void {
    this.bucketListRepository = repository;
  }

  // インスタンスをリセット（テスト用）
  static reset(): void {
    this.bucketListRepository = null;
  }
}

// 認証済みクライアント用のRepository作成関数
export function createAuthenticatedBucketListRepository(
  supabase: SupabaseClient<Database>
): FunctionalBucketListRepository {
  // Create a new repository instance for authenticated context
  return createFunctionalBucketListRepository(supabase);
}

// 認証済みクライアント用のサービス作成関数
export function createAuthenticatedBucketListService(
  supabase: SupabaseClient<Database>
) {
  // Create a new functional repository instance
  const repository = createFunctionalBucketListRepository(supabase);
  return createFunctionalBucketListService(repository);
}

// Repository作成用の便利関数
export async function createBucketListRepositoryAsync(): Promise<FunctionalBucketListRepository> {
  const { supabase } = await import("~/lib/supabase");
  return RepositoryFactory.createBucketListRepository(supabase);
}
