import { describe, it, expect, beforeEach, vi } from "vitest";
import { BucketListService } from "../bucket-list-service";
import type { BucketListRepository } from "~/features/bucket-list/repositories";
import type {
  BucketItem,
  BucketItemInsert,
  Category,
  UserBucketStats,
} from "~/features/bucket-list/types";

// Mock Repository
const mockRepository: BucketListRepository = {
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
};

describe("BucketListService", () => {
  let service: BucketListService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BucketListService(mockRepository);
  });

  describe("getUserBucketItems", () => {
    it("ユーザーIDを指定した場合、そのユーザーのバケットリスト項目が取得できること", async () => {
      const profileId = "user-1";
      const mockItems: BucketItem[] = [
        {
          id: "1",
          title: "Test Item",
          description: null,
          profile_id: profileId,
          category_id: 1,
          priority: "medium",
          status: "not_started",
          due_date: null,
          due_type: null,
          is_public: false,
          completed_at: null,
          completion_comment: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(mockItems);

      const result = await service.getUserBucketItems(profileId);

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(
        profileId,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockItems);
    });

    it("フィルターとソート条件を指定した場合、それらの条件がリポジトリに正しく渡されること", async () => {
      const profileId = "user-1";
      const filters = { status: "completed" as const };
      const sort = { field: "created_at" as const, direction: "desc" as const };

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue([]);

      await service.getUserBucketItems(profileId, filters, sort);

      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(
        profileId,
        filters,
        sort,
      );
    });
  });

  describe("createBucketItem", () => {
    it("新規項目データを渡した場合、リポジトリ経由で項目が作成されること", async () => {
      const newItem: BucketItemInsert = {
        title: "New Item",
        profile_id: "user-1",
        category_id: 1,
        priority: "high",
        status: "not_started",
        is_public: false,
      };

      const createdItem: BucketItem = {
        id: "1",
        title: "New Item",
        description: null,
        profile_id: "user-1",
        category_id: 1,
        priority: "high",
        status: "not_started",
        due_date: null,
        due_type: null,
        is_public: false,
        completed_at: null,
        completion_comment: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      vi.mocked(mockRepository.create).mockResolvedValue(createdItem);

      const result = await service.createBucketItem(newItem);

      expect(mockRepository.create).toHaveBeenCalledWith(newItem);
      expect(result).toEqual(createdItem);
    });
  });

  describe("getBucketItem", () => {
    it("項目IDを指定した場合、対応するバケットリスト項目が取得できること", async () => {
      const itemId = "1";
      const mockItem: BucketItem = {
        id: itemId,
        title: "Test Item",
        description: null,
        profile_id: "user-1",
        category_id: 1,
        priority: "medium",
        status: "not_started",
        due_date: null,
        due_type: null,
        is_public: false,
        completed_at: null,
        completion_comment: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockItem);

      const result = await service.getBucketItem(itemId);

      expect(mockRepository.findById).toHaveBeenCalledWith(itemId);
      expect(result).toEqual(mockItem);
    });

    it("存在しない項目IDを指定した場合、nullが返されること", async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.getBucketItem("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getCategories", () => {
    it("カテゴリ一覧を要求した場合、全てのカテゴリが取得できること", async () => {
      const mockCategories: Category[] = [
        {
          id: 1,
          name: "Travel",
          color: "blue",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "Learning",
          color: "green",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      vi.mocked(mockRepository.findAllCategories).mockResolvedValue(
        mockCategories,
      );

      const result = await service.getCategories();

      expect(mockRepository.findAllCategories).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });
  });

  describe("getUserStats", () => {
    it("ユーザーIDを指定した場合、そのユーザーの統計情報が取得できること", async () => {
      const profileId = "user-1";
      const mockStats: UserBucketStats = {
        profile_id: profileId,
        display_name: "Test User",
        total_items: 10,
        completed_items: 3,
        in_progress_items: 2,
        not_started_items: 5,
        completion_rate: 30,
      };

      vi.mocked(mockRepository.getUserStats).mockResolvedValue(mockStats);

      const result = await service.getUserStats(profileId);

      expect(mockRepository.getUserStats).toHaveBeenCalledWith(profileId);
      expect(result).toEqual(mockStats);
    });

    it("統計情報が存在しないユーザーIDを指定した場合、nullが返されること", async () => {
      const profileId = "user-1";

      vi.mocked(mockRepository.getUserStats).mockResolvedValue(null);

      const result = await service.getUserStats(profileId);

      expect(result).toBeNull();
    });
  });

  describe("getPublicBucketItems", () => {
    it("公開リスト要求時、公開設定されたバケットリスト項目のみが取得できること", async () => {
      const mockPublicItems: BucketItem[] = [
        {
          id: "1",
          title: "Public Item",
          description: null,
          profile_id: "user-1",
          category_id: 1,
          priority: "medium",
          status: "completed",
          due_date: null,
          due_type: null,
          is_public: true,
          completed_at: "2024-01-01T00:00:00Z",
          completion_comment: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      vi.mocked(mockRepository.findPublic).mockResolvedValue(mockPublicItems);

      const result = await service.getPublicBucketItems();

      expect(mockRepository.findPublic).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPublicItems);
    });
  });
});
