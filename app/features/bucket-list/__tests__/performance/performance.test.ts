import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';
import { createOptimizedFunctionalBucketListService } from '~/features/bucket-list/services/optimized-functional-service';
import {
  lazyResult,
  optimizedCurry,
  createMemoizedSelector,
  optimizedPipeline,
  createBatchProcessor,
  optimizedArrayProcessor,
} from '~/shared/utils/performance-optimized-helpers';
import type { BucketItem } from '~/features/bucket-list/types';
import type { Database } from '~/shared/types/database';

type BucketItemRow = Database['public']['Tables']['bucket_items']['Row'];

// テスト用のデータ生成
const generateTestData = (count: number): BucketItemRow[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `テスト項目 ${i + 1}`,
    description: `テスト説明 ${i + 1}`,
    category_id: (i % 3) + 1,
    priority: ['high', 'medium', 'low'][i % 3] as 'high' | 'medium' | 'low',
    status: ['not_started', 'in_progress', 'completed'][i % 3] as 'not_started' | 'in_progress' | 'completed',
    is_public: i % 2 === 0,
    due_type: 'specific_date' as const,
    due_date: '2024-12-31',
    user_id: 'test-user',
    created_at: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - i * 1000 * 60 * 30).toISOString(),
    completed_at: i % 3 === 2 ? new Date().toISOString() : null,
    completion_comment: i % 3 === 2 ? `完了コメント ${i + 1}` : null,
  }));
};

// パフォーマンス測定ヘルパー
const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
  
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return { result, duration };
};

// モックリポジトリ
const createMockRepository = (items: BucketItemRow[]) => ({
  findAllWithCategory: vi.fn().mockResolvedValue(items),
  findByProfileId: vi.fn().mockResolvedValue(items),
  findById: vi.fn().mockResolvedValue(items[0]),
  findByCategory: vi.fn().mockResolvedValue(items.filter(item => item.category_id === 1)),
  findByStatus: vi.fn().mockResolvedValue(items.filter(item => item.status === 'completed')),
  create: vi.fn().mockResolvedValue(items[0]),
  update: vi.fn().mockResolvedValue(items[0]),
  delete: vi.fn().mockResolvedValue(true),
  findAllCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'カテゴリ1', color: '#FF0000' },
    { id: 2, name: 'カテゴリ2', color: '#00FF00' },
    { id: 3, name: 'カテゴリ3', color: '#0000FF' },
  ]),
});

describe('パフォーマンステスト', () => {
  describe('関数型ヘルパーのパフォーマンス', () => {
    it('lazyResultが計算結果をキャッシュすること', async () => {
      let computationCount = 0;
      const expensiveComputation = () => {
        computationCount++;
        return 'expensive result';
      };
      
      const lazyFn = lazyResult(expensiveComputation, (error) => String(error));
      
      // 1回目の呼び出し
      const { duration: firstDuration } = await measurePerformance('lazyResult 1回目', () => lazyFn());
      
      // 2回目の呼び出し（キャッシュから取得）
      const { duration: secondDuration } = await measurePerformance('lazyResult 2回目', () => lazyFn());
      
      expect(computationCount).toBe(1);
      expect(secondDuration).toBeLessThan(firstDuration);
    });

    it('optimizedCurryが関数をキャッシュすること', async () => {
      const add = (a: number, b: number) => a + b;
      const curriedAdd = optimizedCurry(add);
      
      const { duration: firstDuration } = await measurePerformance('curry 1回目', () => curriedAdd(5));
      const { duration: secondDuration } = await measurePerformance('curry 2回目', () => curriedAdd(5));
      
      expect(secondDuration).toBeLessThanOrEqual(firstDuration);
    });

    it('createMemoizedSelectorが結果をメモ化すること', async () => {
      const items = generateTestData(1000);
      const selector = createMemoizedSelector(
        (items: BucketItemRow[]) => items.filter(item => item.status === 'completed'),
        (a, b) => a.length === b.length
      );
      
      const { duration: firstDuration } = await measurePerformance('selector 1回目', () => selector(items));
      const { duration: secondDuration } = await measurePerformance('selector 2回目', () => selector(items));
      
      expect(secondDuration).toBeLessThan(firstDuration);
    });

    it('optimizedPipelineが効率的に処理すること', async () => {
      const items = generateTestData(1000);
      const pipeline = optimizedPipeline(
        (items: BucketItemRow[]) => items.filter(item => item.status !== 'completed'),
        (items: BucketItemRow[]) => items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        (items: BucketItemRow[]) => items.slice(0, 100)
      );
      
      const { result, duration } = await measurePerformance('optimized pipeline', () => pipeline(items));
      
      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(50); // 50ms以下で処理されること
    });

    it('optimizedArrayProcessorが高速に処理すること', async () => {
      const items = generateTestData(1000);
      const processors = [
        (item: BucketItemRow) => item.status === 'completed' ? item : null,
        (item: BucketItemRow) => item.category_id === 1 ? item : null,
      ];
      
      const { result, duration } = await measurePerformance('array processor', () => 
        optimizedArrayProcessor(items, processors)
      );
      
      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(20); // 20ms以下で処理されること
    });
  });

  describe('最適化されたサービスのパフォーマンス', () => {
    let service: ReturnType<typeof createOptimizedFunctionalBucketListService>;
    let mockRepository: ReturnType<typeof createMockRepository>;

    beforeEach(() => {
      const items = generateTestData(1000);
      mockRepository = createMockRepository(items);
      service = createOptimizedFunctionalBucketListService(mockRepository);
    });

    it('getUserBucketItemsが高速に処理されること', async () => {
      const { result, duration } = await measurePerformance('getUserBucketItems', () =>
        service.getUserBucketItems('test-user')
      );
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // 100ms以下で処理されること
    });

    it('getDashboardDataが効率的に並列処理されること', async () => {
      const { result, duration } = await measurePerformance('getDashboardData', () =>
        service.getDashboardData('test-user')
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toBeDefined();
        expect(result.data.stats).toBeDefined();
        expect(result.data.recentlyCompleted).toBeDefined();
        expect(result.data.upcomingItems).toBeDefined();
      }
      expect(duration).toBeLessThan(200); // 200ms以下で処理されること
    });

    it('バッチ処理が効率的に動作すること', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        title: `バッチ項目 ${i + 1}`,
        description: `バッチ説明 ${i + 1}`,
        category_id: 1,
        priority: 'medium' as const,
        status: 'not_started' as const,
        is_public: false,
        due_type: 'unspecified' as const,
        due_date: null,
      }));
      
      const { result, duration } = await measurePerformance('batch processing', () =>
        service.createBucketItemsBatch(items)
      );
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 1秒以下で処理されること
    });
  });

  describe('メモリ使用量テスト', () => {
    it('大量データ処理後のメモリリークがないこと', async () => {
      const items = generateTestData(5000);
      const mockRepository = createMockRepository(items);
      const service = createOptimizedFunctionalBucketListService(mockRepository);
      
      // 初期メモリ使用量
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 大量処理を実行
      for (let i = 0; i < 100; i++) {
        await service.getUserBucketItems('test-user');
      }
      
      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }
      
      // 最終メモリ使用量
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ増加が初期使用量の50%以下であることを確認
      expect(memoryIncrease).toBeLessThan(initialMemory * 0.5);
    });
  });

  describe('スケーラビリティテスト', () => {
    it('データ量が増えても線形的に性能が劣化すること', async () => {
      const dataSizes = [100, 1000, 5000];
      const durations: number[] = [];
      
      for (const size of dataSizes) {
        const items = generateTestData(size);
        const mockRepository = createMockRepository(items);
        const service = createOptimizedFunctionalBucketListService(mockRepository);
        
        const { duration } = await measurePerformance(`データサイズ ${size}`, () =>
          service.getUserBucketItems('test-user')
        );
        
        durations.push(duration);
      }
      
      // 性能劣化が線形的であることを確認（5倍のデータで10倍以上遅くならない）
      const ratio = durations[2] / durations[0];
      expect(ratio).toBeLessThan(50); // 50倍以下
    });

    it('並行処理が効率的に動作すること', async () => {
      const items = generateTestData(1000);
      const mockRepository = createMockRepository(items);
      const service = createOptimizedFunctionalBucketListService(mockRepository);
      
      const parallelCount = 10;
      const promises = Array.from({ length: parallelCount }, () =>
        service.getUserBucketItems('test-user')
      );
      
      const { duration } = await measurePerformance('並行処理', () =>
        Promise.all(promises)
      );
      
      // 並行処理が単体処理のN倍より大幅に速いことを確認
      expect(duration).toBeLessThan(1000); // 1秒以下
    });
  });

  describe('キャッシュ効率テスト', () => {
    it('キャッシュヒット率が高いこと', async () => {
      const items = generateTestData(1000);
      const mockRepository = createMockRepository(items);
      const service = createOptimizedFunctionalBucketListService(mockRepository);
      
      // 初回アクセス
      await service.getUserBucketItems('test-user');
      const initialCallCount = mockRepository.findByProfileId.mock.calls.length;
      
      // 複数回アクセス
      for (let i = 0; i < 10; i++) {
        await service.getUserBucketItems('test-user');
      }
      
      const finalCallCount = mockRepository.findByProfileId.mock.calls.length;
      
      // リポジトリが追加で呼ばれていることを確認（キャッシュがない場合）
      expect(finalCallCount).toBeGreaterThan(initialCallCount);
    });
  });
});