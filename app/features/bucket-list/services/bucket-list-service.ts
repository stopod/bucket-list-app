import type { BucketListRepository } from "~/features/bucket-list/repositories";
import type {
  BucketItem,
  BucketItemInsert,
  BucketItemUpdate,
  Category,
  UserBucketStats,
  BucketListFilters,
  BucketListSort,
} from "~/features/bucket-list/types";

// サービス層：ビジネスロジックを含む高レベルの操作
export class BucketListService {
  constructor(private repository: BucketListRepository) {}

  // リポジトリへのアクセス（関数型サービスとの連携用）
  getRepository(): BucketListRepository {
    return this.repository;
  }

  // バケットリスト項目の操作
  async getUserBucketItems(
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ) {
    return this.repository.findByProfileId(profileId, filters, sort);
  }

  async getUserBucketItemsWithCategory(
    profileId: string,
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ) {
    // プロファイルIDフィルターを追加
    const userFilters = {
      ...filters,
      profile_id: profileId,
    };

    // Repositoryでフィルタリングを実行
    const allItems = await this.repository.findAllWithCategory(
      userFilters,
      sort,
    );

    return allItems;
  }

  async getPublicBucketItems(
    filters?: BucketListFilters,
    sort?: BucketListSort,
  ) {
    return this.repository.findPublic(filters, sort);
  }

  async getBucketItem(id: string) {
    return this.repository.findById(id);
  }


  async createBucketItem(data: BucketItemInsert) {
    return this.repository.create(data);
  }

  async updateBucketItem(id: string, data: BucketItemUpdate) {
    return this.repository.update(id, data);
  }

  async completeBucketItem(id: string, comment?: string) {
    const updateData: BucketItemUpdate = {
      status: "completed",
      completed_at: new Date().toISOString(),
      completion_comment: comment || null,
    };
    return this.repository.update(id, updateData);
  }

  async deleteBucketItem(id: string) {
    return this.repository.delete(id);
  }

  // カテゴリの操作
  async getCategories() {
    return this.repository.findAllCategories();
  }

  async getCategory(id: number) {
    return this.repository.findCategoryById(id);
  }

  // 統計の操作
  async getUserStats(profileId: string) {
    return this.repository.getUserStats(profileId);
  }

  // ビジネスロジックを含むメソッド
  async getBucketItemsByCategory(profileId: string) {
    const [items, categories] = await Promise.all([
      this.getUserBucketItemsWithCategory(profileId),
      this.getCategories(),
    ]);

    // カテゴリ別にグループ化
    const itemsByCategory = categories
      .map((category) => ({
        category,
        items: items.filter((item) => item.category_id === category.id),
      }))
      .filter((group) => group.items.length > 0);

    return itemsByCategory;
  }

  async getDashboardData(profileId: string) {
    const [items, categories, stats] = await Promise.all([
      this.getUserBucketItemsWithCategory(profileId),
      this.getCategories(),
      this.getUserStats(profileId),
    ]);

    return {
      items,
      categories,
      stats,
      itemsByCategory: await this.getBucketItemsByCategory(profileId),
    };
  }
}
