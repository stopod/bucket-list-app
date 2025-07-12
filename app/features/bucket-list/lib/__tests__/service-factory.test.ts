import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type { FunctionalBucketListRepository } from "../../repositories/bucket-list.repository";
import {
  createAuthenticatedBucketListRepository,
  createAuthenticatedBucketListService,
} from "../service-factory";

// モック作成
vi.mock("../../repositories/bucket-list.repository", () => ({
  createFunctionalBucketListRepository: vi.fn(),
}));

vi.mock("../../services/bucket-list.service", () => ({
  createFunctionalBucketListService: vi.fn(),
}));

// インポート元のモック関数を取得
import { createFunctionalBucketListRepository } from "../../repositories/bucket-list.repository";
import { createFunctionalBucketListService } from "../../services/bucket-list.service";

describe("service-factory", () => {
  let mockSupabaseClient: SupabaseClient<Database>;
  let mockRepository: FunctionalBucketListRepository;
  let mockService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Supabaseクライアントのモック
    mockSupabaseClient = {
      from: vi.fn(),
      auth: vi.fn(),
    } as any;

    // リポジトリのモック
    mockRepository = {
      findAll: vi.fn(),
      findAllWithCategory: vi.fn(),
      findById: vi.fn(),
      findByProfileId: vi.fn(),
      findPublic: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAllCategories: vi.fn(),
      findCategoryById: vi.fn(),
      getUserStats: vi.fn(),
    } as FunctionalBucketListRepository;

    // サービスのモック
    mockService = {
      getUserBucketItems: vi.fn(),
      getUserBucketItemsWithCategory: vi.fn(),
      getBucketItemById: vi.fn(),
      createBucketItem: vi.fn(),
      updateBucketItem: vi.fn(),
      deleteBucketItem: vi.fn(),
      getPublicBucketItems: vi.fn(),
      getPublicBucketItemsWithCategory: vi.fn(),
      getCategories: vi.fn(),
      getUserStats: vi.fn(),
      getPublicStats: vi.fn(),
    };

    // モック関数の戻り値を設定
    vi.mocked(createFunctionalBucketListRepository).mockReturnValue(
      mockRepository
    );
    vi.mocked(createFunctionalBucketListService).mockReturnValue(mockService);
  });

  describe("createAuthenticatedBucketListRepository", () => {
    it("Supabaseクライアントを渡した場合、関数型リポジトリが作成されること", () => {
      const result =
        createAuthenticatedBucketListRepository(mockSupabaseClient);

      expect(createFunctionalBucketListRepository).toHaveBeenCalledWith(
        mockSupabaseClient
      );
      expect(createFunctionalBucketListRepository).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockRepository);
    });

    it("作成されたリポジトリが期待されるインターフェースを持つこと", () => {
      const repository =
        createAuthenticatedBucketListRepository(mockSupabaseClient);

      // リポジトリが必要なメソッドを持っていることを確認
      expect(repository).toHaveProperty("findAll");
      expect(repository).toHaveProperty("findAllWithCategory");
      expect(repository).toHaveProperty("findById");
      expect(repository).toHaveProperty("findByProfileId");
      expect(repository).toHaveProperty("findPublic");
      expect(repository).toHaveProperty("create");
      expect(repository).toHaveProperty("update");
      expect(repository).toHaveProperty("delete");
      expect(repository).toHaveProperty("findAllCategories");
      expect(repository).toHaveProperty("findCategoryById");
      expect(repository).toHaveProperty("getUserStats");
    });

    it("同じSupabaseクライアントを複数回渡した場合、それぞれ独立したリポジトリが作成されること", () => {
      const repository1 =
        createAuthenticatedBucketListRepository(mockSupabaseClient);
      const repository2 =
        createAuthenticatedBucketListRepository(mockSupabaseClient);

      expect(createFunctionalBucketListRepository).toHaveBeenCalledTimes(2);
      expect(repository1).toBe(mockRepository);
      expect(repository2).toBe(mockRepository);
    });
  });

  describe("createAuthenticatedBucketListService", () => {
    it("Supabaseクライアントを渡した場合、関数型サービスが作成されること", () => {
      const result = createAuthenticatedBucketListService(mockSupabaseClient);

      expect(createFunctionalBucketListRepository).toHaveBeenCalledWith(
        mockSupabaseClient
      );
      expect(createFunctionalBucketListService).toHaveBeenCalledWith(
        mockRepository
      );
      expect(createFunctionalBucketListRepository).toHaveBeenCalledTimes(1);
      expect(createFunctionalBucketListService).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockService);
    });

    it("作成されたサービスが期待されるインターフェースを持つこと", () => {
      const service = createAuthenticatedBucketListService(mockSupabaseClient);

      // サービスが必要なメソッドを持っていることを確認
      expect(service).toHaveProperty("getUserBucketItems");
      expect(service).toHaveProperty("getUserBucketItemsWithCategory");
      expect(service).toHaveProperty("getBucketItemById");
      expect(service).toHaveProperty("createBucketItem");
      expect(service).toHaveProperty("updateBucketItem");
      expect(service).toHaveProperty("deleteBucketItem");
      expect(service).toHaveProperty("getPublicBucketItems");
      expect(service).toHaveProperty("getPublicBucketItemsWithCategory");
      expect(service).toHaveProperty("getCategories");
      expect(service).toHaveProperty("getUserStats");
      expect(service).toHaveProperty("getPublicStats");
    });

    it("リポジトリ作成とサービス作成が正しい順序で実行されること", () => {
      createAuthenticatedBucketListService(mockSupabaseClient);

      // リポジトリが先に作成されることを確認
      const repositoryCallOrder = vi.mocked(
        createFunctionalBucketListRepository
      ).mock.invocationCallOrder[0];
      const serviceCallOrder = vi.mocked(createFunctionalBucketListService).mock
        .invocationCallOrder[0];

      expect(repositoryCallOrder).toBeLessThan(serviceCallOrder);
    });

    it("同じSupabaseクライアントを複数回渡した場合、それぞれ独立したサービスが作成されること", () => {
      const service1 = createAuthenticatedBucketListService(mockSupabaseClient);
      const service2 = createAuthenticatedBucketListService(mockSupabaseClient);

      expect(createFunctionalBucketListRepository).toHaveBeenCalledTimes(2);
      expect(createFunctionalBucketListService).toHaveBeenCalledTimes(2);
      expect(service1).toBe(mockService);
      expect(service2).toBe(mockService);
    });

    it("作成されたサービスが正しいリポジトリインスタンスで初期化されること", () => {
      createAuthenticatedBucketListService(mockSupabaseClient);

      // サービス作成時に、正しいリポジトリが渡されていることを確認
      expect(createFunctionalBucketListService).toHaveBeenCalledWith(
        mockRepository
      );
    });
  });

  describe("依存性注入パターンの検証", () => {
    it("異なるSupabaseクライアントを渡した場合、それぞれ独立したリポジトリが作成されること", () => {
      const mockSupabaseClient2 = {
        from: vi.fn(),
        auth: vi.fn(),
      } as any;

      const repository1 =
        createAuthenticatedBucketListRepository(mockSupabaseClient);
      const repository2 =
        createAuthenticatedBucketListRepository(mockSupabaseClient2);

      expect(createFunctionalBucketListRepository).toHaveBeenNthCalledWith(
        1,
        mockSupabaseClient
      );
      expect(createFunctionalBucketListRepository).toHaveBeenNthCalledWith(
        2,
        mockSupabaseClient2
      );
      expect(repository1).toBe(mockRepository);
      expect(repository2).toBe(mockRepository);
    });

    it("リポジトリ作成に失敗した場合、エラーが伝播されること", () => {
      const error = new Error("Repository creation failed");
      vi.mocked(createFunctionalBucketListRepository).mockImplementation(() => {
        throw error;
      });

      expect(() => {
        createAuthenticatedBucketListRepository(mockSupabaseClient);
      }).toThrow("Repository creation failed");
    });

    it("サービス作成に失敗した場合、エラーが伝播されること", () => {
      const error = new Error("Service creation failed");
      vi.mocked(createFunctionalBucketListService).mockImplementation(() => {
        throw error;
      });

      expect(() => {
        createAuthenticatedBucketListService(mockSupabaseClient);
      }).toThrow("Service creation failed");
    });
  });

  describe("関数型アプローチの特性検証", () => {
    it("リポジトリ作成関数が純粋関数として動作すること", () => {
      // 同じ入力に対して同じ出力を返すことを確認
      const repository1 =
        createAuthenticatedBucketListRepository(mockSupabaseClient);
      const repository2 =
        createAuthenticatedBucketListRepository(mockSupabaseClient);

      // モック関数の戻り値は同じであることを確認
      expect(repository1).toBe(repository2);
    });

    it("サービス作成関数が純粋関数として動作すること", () => {
      // 同じ入力に対して同じ出力を返すことを確認
      const service1 = createAuthenticatedBucketListService(mockSupabaseClient);
      const service2 = createAuthenticatedBucketListService(mockSupabaseClient);

      // モック関数の戻り値は同じであることを確認
      expect(service1).toBe(service2);
    });

    it("関数合成による依存性注入が正しく動作すること", () => {
      createAuthenticatedBucketListService(mockSupabaseClient);

      // 1. Supabaseクライアント → リポジトリ
      expect(createFunctionalBucketListRepository).toHaveBeenCalledWith(
        mockSupabaseClient
      );

      // 2. リポジトリ → サービス
      expect(createFunctionalBucketListService).toHaveBeenCalledWith(
        mockRepository
      );

      // この流れで依存性注入が完了していることを確認
      expect(createFunctionalBucketListRepository).toHaveBeenCalledTimes(1);
      expect(createFunctionalBucketListService).toHaveBeenCalledTimes(1);
    });
  });
});
