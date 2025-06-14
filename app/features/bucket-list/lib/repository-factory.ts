import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type { BucketListRepository } from "../repositories";
import { SupabaseBucketListRepository } from "../repositories/supabase-bucket-list-repository";
import { BucketListService } from "../services";
import { createFunctionalBucketListService } from "../services/functional-bucket-list-service";

// Repository Factory
export class RepositoryFactory {
  private static bucketListRepository: BucketListRepository | null = null;
  private static bucketListService: BucketListService | null = null;

  static createBucketListRepository(supabase: SupabaseClient<Database>): BucketListRepository {
    if (!this.bucketListRepository) {
      this.bucketListRepository = new SupabaseBucketListRepository(supabase);
    }
    return this.bucketListRepository;
  }

  static createBucketListService(supabase: SupabaseClient<Database>): BucketListService {
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

  // インスタンスをリセット（テスト用）
  static reset(): void {
    this.bucketListRepository = null;
    this.bucketListService = null;
  }
}

// 便利関数：Supabaseクライアントから直接サービスを取得
export async function createBucketListService(): Promise<BucketListService> {
  const { supabase } = await import("~/lib/supabase");
  return RepositoryFactory.createBucketListService(supabase);
}

// 認証済みクライアント用のサービス作成関数（クラスベース）
export function createAuthenticatedBucketListService(supabase: SupabaseClient<Database>, userId?: string): BucketListService {
  // Create a new repository instance with user context for security
  const repository = new SupabaseBucketListRepository(supabase, userId);
  return new BucketListService(repository);
}

// 認証済みクライアント用の関数型サービス作成関数
export function createAuthenticatedFunctionalBucketListService(supabase: SupabaseClient<Database>, userId?: string) {
  // Create a new repository instance with user context for security
  const repository = new SupabaseBucketListRepository(supabase, userId);
  return createFunctionalBucketListService(repository);
}

// 関数型サービス作成用の便利関数
export async function createFunctionalBucketListServiceAsync() {
  const { supabase } = await import("~/lib/supabase");
  const repository = RepositoryFactory.createBucketListRepository(supabase);
  return createFunctionalBucketListService(repository);
}