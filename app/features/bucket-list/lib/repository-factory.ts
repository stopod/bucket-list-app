import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type { BucketListRepository } from "../repositories";
import type { FunctionalBucketListRepository } from "../repositories/functional-bucket-list-repository";
import { SupabaseBucketListRepository } from "../repositories/supabase-bucket-list-repository";
import { createFunctionalBucketListRepository } from "../repositories/functional-bucket-list-repository";
import { BucketListService } from "../services";
import { createFunctionalBucketListService } from "../services/functional-bucket-list-service";

// Repository Factory
export class RepositoryFactory {
  private static bucketListRepository: BucketListRepository | null = null;
  private static functionalBucketListRepository: FunctionalBucketListRepository | null =
    null;
  private static bucketListService: BucketListService | null = null;

  static createBucketListRepository(
    supabase: SupabaseClient<Database>
  ): BucketListRepository {
    if (!this.bucketListRepository) {
      this.bucketListRepository = new SupabaseBucketListRepository(supabase);
    }
    return this.bucketListRepository;
  }

  static createFunctionalBucketListRepository(
    supabase: SupabaseClient<Database>
  ): FunctionalBucketListRepository {
    if (!this.functionalBucketListRepository) {
      this.functionalBucketListRepository =
        createFunctionalBucketListRepository(supabase);
    }
    return this.functionalBucketListRepository;
  }

  static createBucketListService(
    supabase: SupabaseClient<Database>
  ): BucketListService {
    if (!this.bucketListService) {
      const repository = this.createBucketListRepository(supabase);
      this.bucketListService = new BucketListService(repository);
    }
    return this.bucketListService;
  }

  // テスト用：モックリポジトリを注入可能
  static setBucketListRepository(repository: BucketListRepository): void {
    this.bucketListRepository = repository;
    this.bucketListService = null; // サービスも再作成が必要
  }

  static setFunctionalBucketListRepository(
    repository: FunctionalBucketListRepository
  ): void {
    this.functionalBucketListRepository = repository;
  }

  // インスタンスをリセット（テスト用）
  static reset(): void {
    this.bucketListRepository = null;
    this.functionalBucketListRepository = null;
    this.bucketListService = null;
  }
}

// DEPRECATED: 従来型アプローチ - 後方互換性のために保持
// 新規実装では createAuthenticatedFunctionalBucketListRepository を使用してください
export async function createBucketListService(): Promise<BucketListService> {
  const { supabase } = await import("~/lib/supabase");
  return RepositoryFactory.createBucketListService(supabase);
}

// DEPRECATED: 従来型アプローチ - 後方互換性のために保持
// 新規実装では createAuthenticatedFunctionalBucketListRepository を使用してください
export function createAuthenticatedBucketListService(
  supabase: SupabaseClient<Database>,
  userId?: string
): BucketListService {
  // Create a new repository instance with user context for security
  const repository = new SupabaseBucketListRepository(supabase, userId);
  return new BucketListService(repository);
}

// 認証済みクライアント用の関数型Repository作成関数
export function createAuthenticatedFunctionalBucketListRepository(
  supabase: SupabaseClient<Database>,
  _userId?: string
): FunctionalBucketListRepository {
  // Create a new repository instance for each user context
  return createFunctionalBucketListRepository(supabase);
}

// 認証済みクライアント用の関数型サービス作成関数
export function createAuthenticatedFunctionalBucketListService(
  supabase: SupabaseClient<Database>,
  userId?: string
) {
  // Create a new repository instance with user context for security
  const repository = new SupabaseBucketListRepository(supabase, userId);
  return createFunctionalBucketListService(repository);
}

// 関数型Repository作成用の便利関数
export async function createFunctionalBucketListRepositoryAsync(): Promise<FunctionalBucketListRepository> {
  const { supabase } = await import("~/lib/supabase");
  return RepositoryFactory.createFunctionalBucketListRepository(supabase);
}

// DEPRECATED: 関数型サービス作成用の便利関数
// 新規実装では createAuthenticatedFunctionalBucketListService を使用してください
export async function createFunctionalBucketListServiceAsync() {
  const { supabase } = await import("~/lib/supabase");
  const repository = RepositoryFactory.createBucketListRepository(supabase);
  return createFunctionalBucketListService(repository);
}
