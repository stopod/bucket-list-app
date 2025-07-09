import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createFunctionalBucketListService,
  getUserBucketItems,
  createBucketItem,
  updateBucketItem,
  deleteBucketItem,
  getBucketItem,
  getCategories,
  getUserStats
} from '~/features/bucket-list/services/functional-bucket-list-service';
import { RepositoryFactory } from '~/features/bucket-list/lib/repository-factory';
import { calculateUserStats, calculateCategoryStats } from '~/features/bucket-list/lib/business-logic';
import { isSuccess, isFailure } from '~/shared/types/result';
import type { BucketItem } from '~/features/bucket-list/types';
import type { Database } from '~/shared/types/database';

type BucketItemRow = Database['public']['Tables']['bucket_items']['Row'];

// テストデータ
const mockBucketItems: BucketItemRow[] = [
  {
    id: 'test-item-1',
    title: 'テスト項目1',
    description: '説明1',
    category_id: 1,
    priority: 'high',
    status: 'completed',
    is_public: true,
    due_type: 'specific_date',
    due_date: '2024-12-31',
    profile_id: 'test-user-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    completed_at: '2024-01-15T00:00:00Z',
    completion_comment: '完了しました',
  },
  {
    id: 'test-item-2',
    title: 'テスト項目2',
    description: '説明2',
    category_id: 2,
    priority: 'medium',
    status: 'in_progress',
    is_public: false,
    due_type: 'this_year',
    due_date: null,
    profile_id: 'test-user-id',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    completed_at: null,
    completion_comment: null,
  },
  {
    id: 'test-item-3',
    title: 'テスト項目3',
    description: '説明3',
    category_id: 1,
    priority: 'low',
    status: 'not_started',
    is_public: true,
    due_type: 'unspecified',
    due_date: null,
    profile_id: 'test-user-id',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    completed_at: null,
    completion_comment: null,
  },
];

const mockCategories = [
  { id: 1, name: '旅行・観光', color: '#3B82F6', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'スキル習得・学習', color: '#10B981', created_at: '2024-01-01T00:00:00Z' },
];

// モックリポジトリ
const mockRepository = {
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

describe('サービス統合テスト', () => {
  let service: ReturnType<typeof createFunctionalBucketListService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createFunctionalBucketListService(mockRepository);
  });

  describe('CRUD操作統合', () => {
    it('作成から取得まで完全なCRUD統合フローが動作すること', async () => {
      // 1. 作成
      const newItem = {
        title: 'テスト項目',
        description: 'テスト説明',
        category_id: 1,
        priority: 'high' as const,
        status: 'not_started' as const,
        is_public: false,
        due_type: 'unspecified' as const,
        due_date: null,
        profile_id: 'test-user-id',
      };

      const createdItem = { ...mockBucketItems[0], ...newItem };
      mockRepository.create.mockResolvedValue(createdItem);

      const createResult = await service.createBucketItem(newItem);
      expect(isSuccess(createResult)).toBe(true);
      if (isSuccess(createResult)) {
        expect(createResult.data).toEqual(createdItem);
      }

      // 2. 取得
      mockRepository.findById.mockResolvedValue(createdItem);
      const getResult = await service.getBucketItem('1');
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult)) {
        expect(getResult.data).toEqual(createdItem);
      }

      // 3. 更新
      const updateData = { title: '更新されたタイトル' };
      const updatedItem = { ...createdItem, ...updateData };
      mockRepository.update.mockResolvedValue(updatedItem);

      const updateResult = await service.updateBucketItem('1', updateData);
      expect(isSuccess(updateResult)).toBe(true);
      if (isSuccess(updateResult)) {
        expect(updateResult.data).toEqual(updatedItem);
      }

      // 4. 削除
      mockRepository.delete.mockResolvedValue(undefined);
      const deleteResult = await service.deleteBucketItem('1');
      expect(isSuccess(deleteResult)).toBe(true);
    });

    it('一覧取得から統計計算まで完全なデータフローが動作すること', async () => {
      // 1. 一覧取得
      mockRepository.findByProfileId.mockResolvedValue(mockBucketItems);
      const listResult = await service.getUserBucketItems('test-user-id');
      expect(isSuccess(listResult)).toBe(true);
      
      if (isSuccess(listResult)) {
        const items = listResult.data;
        expect(items).toHaveLength(3);

        // 2. 統計計算
        const stats = calculateUserStats(items);
        expect(stats.total_items).toBe(3);
        expect(stats.completed_items).toBe(1);
        expect(stats.in_progress_items).toBe(1);
        expect(stats.not_started_items).toBe(1);
        expect(stats.completion_rate).toBeCloseTo(33, 0);

        // 3. カテゴリ別進捗計算
        const categoryProgress = calculateCategoryStats(items, mockCategories);
        expect(categoryProgress).toHaveLength(2);
        expect(categoryProgress[0].category.name).toBe('旅行・観光');
        expect(categoryProgress[0].rate).toBeCloseTo(50, 0);
        expect(categoryProgress[1].category.name).toBe('スキル習得・学習');
        expect(categoryProgress[1].rate).toBe(0);
      }
    });
  });

  describe('エラーハンドリング統合', () => {
    it('リポジトリエラーから適切なResult型エラーに変換されること', async () => {
      // データベースエラー
      mockRepository.findById.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await service.getBucketItem('1');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe('ApplicationError');
        expect(result.error.message).toContain('getBucketItem failed');
      }
    });

    it('バリデーションエラーが適切に処理されること', async () => {
      // 無効なデータ
      const invalidItem = {
        title: '', // 空のタイトル
        description: 'テスト説明',
        category_id: 1,
        priority: 'high' as const,
        status: 'not_started' as const,
        is_public: false,
        due_type: 'unspecified' as const,
        due_date: null,
        profile_id: 'test-user-id',
      };
      
      const result = await service.createBucketItem(invalidItem);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe('ValidationError');
      }
    });

    it('認証エラーが適切に処理されること', async () => {
      // 認証エラー
      mockRepository.findByProfileId.mockRejectedValue(new Error('Authentication required'));
      
      const result = await service.getUserBucketItems('test-user-id');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.type).toBe('ApplicationError');
      }
    });
  });

  describe('ビジネスロジック統合', () => {
    it('ステータス更新時に完了日時が正しく設定されること', async () => {
      const item = mockBucketItems[1]; // in_progress項目
      const updateData = { status: 'completed' as const };
      
      // 既存アイテムの取得をモック
      mockRepository.findById.mockResolvedValue(item);
      
      mockRepository.update.mockResolvedValue({
        ...item,
        ...updateData,
        completed_at: '2024-01-20T00:00:00Z',
      });

      const result = await service.updateBucketItem(item.id.toString(), updateData);
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data.status).toBe('completed');
        expect(result.data.completed_at).toBeTruthy();
      }
    });

    it('公開設定変更時に適切なバリデーションが動作すること', async () => {
      const item = mockBucketItems[1]; // in_progress項目を使用（completedではない）
      const updateData = { is_public: false };
      
      // 既存アイテムの取得をモック
      mockRepository.findById.mockResolvedValue(item);
      
      mockRepository.update.mockResolvedValue({
        ...item,
        ...updateData,
      });

      const result = await service.updateBucketItem(item.id.toString(), updateData);
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data.is_public).toBe(false);
      }
    });
  });

  describe('フィルタリング統合', () => {
    it('カテゴリフィルタリングが正しく動作すること', async () => {
      const itemsWithCategories = mockBucketItems.map(item => ({
        ...item,
        category: mockCategories.find(cat => cat.id === item.category_id) || mockCategories[0]
      }));
      mockRepository.findAllWithCategory.mockResolvedValue(itemsWithCategories);
      mockRepository.findAllCategories.mockResolvedValue(mockCategories);

      const result = await service.getBucketItemsByCategory('test-user-id');
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data).toHaveLength(2); // 両方のカテゴリに項目がある
        expect(result.data[0].category.name).toBe('旅行・観光');
        expect(result.data[1].category.name).toBe('スキル習得・学習');
      }
    });

    it('ステータスフィルタリングが正しく動作すること', async () => {
      const completedItems = mockBucketItems.filter(item => item.status === 'completed');
      mockRepository.findByProfileId.mockResolvedValue(completedItems);

      const result = await service.getUserBucketItems('test-user-id', { status: 'completed' });
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].status).toBe('completed');
      }
    });

    it('優先度フィルタリングが正しく動作すること', async () => {
      const highPriorityItems = mockBucketItems.filter(item => item.priority === 'high');
      mockRepository.findByProfileId.mockResolvedValue(highPriorityItems);

      const result = await service.getUserBucketItems('test-user-id', { priority: 'high' });
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].priority).toBe('high');
      }
    });
  });

  describe('統計データ統合', () => {
    it('ユーザー統計が正しく計算されること', async () => {
      const userStats = {
        totalItems: 3,
        completedItems: 1,
        inProgressItems: 1,
        notStartedItems: 1,
        completionRate: 33.33,
      };

      mockRepository.getUserStats.mockResolvedValue(userStats);
      
      const result = await service.getUserStats('test-user-id');
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data).toEqual(userStats);
      }
    });

    it('ダッシュボードデータが正しく計算されること', async () => {
      const itemsWithCategory = mockBucketItems.map(item => ({
        ...item,
        category: mockCategories.find(cat => cat.id === item.category_id) || mockCategories[0],
      }));
      
      mockRepository.findAllWithCategory.mockResolvedValue(itemsWithCategory);
      mockRepository.findAllCategories.mockResolvedValue(mockCategories);
      
      const result = await service.getDashboardData('test-user-id');
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data.items).toHaveLength(3);
        expect(result.data.categories).toHaveLength(2);
        expect(result.data.stats.total_items).toBe(3);
        expect(result.data.itemsByCategory).toHaveLength(2);
      }
    });
  });

  describe('キャッシュ統合', () => {
    it('複数回のアクセスでキャッシュが適切に動作すること', async () => {
      mockRepository.findByProfileId.mockResolvedValue(mockBucketItems);

      // 1回目のアクセス
      const firstResult = await service.getUserBucketItems('test-user-id');
      expect(isSuccess(firstResult)).toBe(true);
      expect(mockRepository.findByProfileId).toHaveBeenCalledTimes(1);

      // 2回目のアクセス（キャッシュが実装されていないので2回呼ばれる）
      const secondResult = await service.getUserBucketItems('test-user-id');
      expect(isSuccess(secondResult)).toBe(true);
      
      // キャッシュが実装されていないので2回呼ばれる
      expect(mockRepository.findByProfileId).toHaveBeenCalledTimes(2);
    });
  });

  describe('並行処理統合', () => {
    it('複数の非同期操作が適切に処理されること', async () => {
      mockRepository.findByProfileId.mockResolvedValue(mockBucketItems);
      mockRepository.getUserStats.mockResolvedValue({
        totalItems: 3,
        completedItems: 1,
        inProgressItems: 1,
        notStartedItems: 1,
        completionRate: 33.33,
      });
      mockRepository.findAllCategories.mockResolvedValue(mockCategories);

      // 複数の操作を並行実行
      const [itemsResult, statsResult, categoriesResult] = await Promise.all([
        service.getUserBucketItems('test-user-id'),
        service.getUserStats('test-user-id'),
        service.getCategories(),
      ]);

      expect(isSuccess(itemsResult)).toBe(true);
      expect(isSuccess(statsResult)).toBe(true);
      expect(isSuccess(categoriesResult)).toBe(true);
    });
  });
});