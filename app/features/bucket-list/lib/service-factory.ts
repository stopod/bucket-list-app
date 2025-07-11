/**
 * 関数型Service Factory - 関数合成による依存性注入
 * Repository と Service の作成を関数型アプローチで統一
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type { FunctionalBucketListRepository } from "../repositories/bucket-list.repository";
import { createFunctionalBucketListRepository } from "../repositories/bucket-list.repository";
import { createFunctionalBucketListService } from "../services/bucket-list.service";

// 認証済みクライアント用のRepository作成関数
export function createAuthenticatedBucketListRepository(
  supabase: SupabaseClient<Database>
): FunctionalBucketListRepository {
  return createFunctionalBucketListRepository(supabase);
}

// 認証済みクライアント用のサービス作成関数
export function createAuthenticatedBucketListService(
  supabase: SupabaseClient<Database>
) {
  const repository = createFunctionalBucketListRepository(supabase);
  return createFunctionalBucketListService(repository);
}
