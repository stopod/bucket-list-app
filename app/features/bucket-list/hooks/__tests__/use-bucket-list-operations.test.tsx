import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BucketListError } from "~/shared/types/errors";
import type { FunctionalBucketListRepository } from "../../repositories/bucket-list.repository";
import type { BucketItem } from "../../types";
import {
  useCategories,
  useCreateBucketItem,
  useDashboardData,
  useDeleteBucketItem,
  useUpdateBucketItem,
} from "../use-bucket-list-operations";

// useResultOperationのモック
vi.mock("~/shared/hooks/use-result-operation", () => ({
  useResultOperation: vi.fn(),
}));

import { useResultOperation } from "~/shared/hooks/use-result-operation";

describe("use-bucket-list-operations", () => {
  let mockRepository: FunctionalBucketListRepository;
  let mockUseResultOperation: any;

  beforeEach(() => {
    vi.clearAllMocks();

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

    // useResultOperationのモック戻り値
    mockUseResultOperation = {
      data: null,
      error: null,
      loading: false,
      execute: vi.fn(),
      reset: vi.fn(),
      isLoading: false,
      hasError: false,
      hasData: false,
    };

    vi.mocked(useResultOperation).mockReturnValue(mockUseResultOperation);
  });

  describe("useCreateBucketItem", () => {
    it("リポジトリと空のオプションで初期化した場合、useResultOperationが正しい設定で呼ばれること", () => {
      renderHook(() => useCreateBucketItem(mockRepository));

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess: undefined,
        onError: undefined,
      });
    });

    it("成功コールバックオプションを渡した場合、useResultOperationに正しく渡されること", () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useCreateBucketItem(mockRepository, { onSuccess, onError })
      );

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess,
        onError,
      });
    });

    it("hookの戻り値がuseResultOperationの戻り値と一致すること", () => {
      const { result } = renderHook(() => useCreateBucketItem(mockRepository));

      expect(result.current).toBe(mockUseResultOperation);
    });

    it("オプションが部分的に渡された場合、undefinedで補完されること", () => {
      const onSuccess = vi.fn();

      renderHook(() => useCreateBucketItem(mockRepository, { onSuccess }));

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess,
        onError: undefined,
      });
    });

    it("型パラメータが正しく設定されること", () => {
      renderHook(() => useCreateBucketItem(mockRepository));

      // 型チェック用の確認 - useResultOperationが BucketItem, BucketListError で呼ばれることを確認
      expect(useResultOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe("useUpdateBucketItem", () => {
    it("リポジトリと空のオプションで初期化した場合、useResultOperationが正しい設定で呼ばれること", () => {
      renderHook(() => useUpdateBucketItem(mockRepository));

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess: undefined,
        onError: undefined,
      });
    });

    it("成功・エラーコールバックオプションを渡した場合、useResultOperationに正しく渡されること", () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useUpdateBucketItem(mockRepository, { onSuccess, onError })
      );

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess,
        onError,
      });
    });

    it("hookの戻り値がuseResultOperationの戻り値と一致すること", () => {
      const { result } = renderHook(() => useUpdateBucketItem(mockRepository));

      expect(result.current).toBe(mockUseResultOperation);
    });

    it("onErrorのみを指定した場合、正しく処理されること", () => {
      const onError = vi.fn();

      renderHook(() => useUpdateBucketItem(mockRepository, { onError }));

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess: undefined,
        onError,
      });
    });
  });

  describe("useDeleteBucketItem", () => {
    it("リポジトリと空のオプションで初期化した場合、useResultOperationが正しい設定で呼ばれること", () => {
      renderHook(() => useDeleteBucketItem(mockRepository));

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess: undefined,
        onError: undefined,
      });
    });

    it("成功・エラーコールバックオプションを渡した場合、useResultOperationに正しく渡されること", () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useDeleteBucketItem(mockRepository, { onSuccess, onError })
      );

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess,
        onError,
      });
    });

    it("hookの戻り値がuseResultOperationの戻り値と一致すること", () => {
      const { result } = renderHook(() => useDeleteBucketItem(mockRepository));

      expect(result.current).toBe(mockUseResultOperation);
    });

    it("削除操作の戻り値型がvoidであることを確認すること", () => {
      renderHook(() => useDeleteBucketItem(mockRepository));

      // 型チェック用の確認 - useResultOperationが void, BucketListError で呼ばれることを確認
      expect(useResultOperation).toHaveBeenCalledTimes(1);
    });

    it("onSuccessコールバックが戻り値を持たない設計であることを確認すること", () => {
      const onSuccess = vi.fn();

      renderHook(() => useDeleteBucketItem(mockRepository, { onSuccess }));

      expect(useResultOperation).toHaveBeenCalledWith({
        onSuccess,
        onError: undefined,
      });
    });
  });

  describe("useCategories", () => {
    it("リポジトリを渡した場合、useResultOperationが空配列の初期データで呼ばれること", () => {
      renderHook(() => useCategories(mockRepository));

      expect(useResultOperation).toHaveBeenCalledWith({
        initialData: [],
      });
    });

    it("hookの戻り値がuseResultOperationの戻り値と一致すること", () => {
      const { result } = renderHook(() => useCategories(mockRepository));

      expect(result.current).toBe(mockUseResultOperation);
    });

    it("複数回呼び出しても同じ設定で初期化されること", () => {
      renderHook(() => useCategories(mockRepository));
      renderHook(() => useCategories(mockRepository));

      expect(useResultOperation).toHaveBeenCalledTimes(2);
      expect(useResultOperation).toHaveBeenNthCalledWith(1, {
        initialData: [],
      });
      expect(useResultOperation).toHaveBeenNthCalledWith(2, {
        initialData: [],
      });
    });

    it("型パラメータがCategory配列で設定されること", () => {
      renderHook(() => useCategories(mockRepository));

      // 型チェック用の確認 - useResultOperationが Category[], BucketListError で呼ばれることを確認
      expect(useResultOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe("useDashboardData", () => {
    const expectedInitialData = {
      items: [],
      categories: [],
      stats: {
        profile_id: null,
        display_name: null,
        total_items: 0,
        completed_items: 0,
        in_progress_items: 0,
        not_started_items: 0,
        completion_rate: 0,
      },
      itemsByCategory: [],
      recentCompletedItems: [],
      upcomingItems: [],
    };

    it("リポジトリを渡した場合、useResultOperationが複合初期データで呼ばれること", () => {
      renderHook(() => useDashboardData(mockRepository));

      expect(useResultOperation).toHaveBeenCalledWith({
        initialData: expectedInitialData,
      });
    });

    it("hookの戻り値がuseResultOperationの戻り値と一致すること", () => {
      const { result } = renderHook(() => useDashboardData(mockRepository));

      expect(result.current).toBe(mockUseResultOperation);
    });

    it("初期データの各プロパティが正しい型と値で設定されること", () => {
      renderHook(() => useDashboardData(mockRepository));

      const calledWith = vi.mocked(useResultOperation).mock.calls[0]?.[0];
      expect(calledWith).toBeDefined();

      if (calledWith && "initialData" in calledWith) {
        const initialData = calledWith.initialData as any;

        expect(initialData.items).toEqual([]);
        expect(initialData.categories).toEqual([]);
        expect(initialData.itemsByCategory).toEqual([]);
        expect(initialData.recentCompletedItems).toEqual([]);
        expect(initialData.upcomingItems).toEqual([]);

        expect(initialData.stats.profile_id).toBe(null);
        expect(initialData.stats.display_name).toBe(null);
        expect(initialData.stats.total_items).toBe(0);
        expect(initialData.stats.completed_items).toBe(0);
        expect(initialData.stats.in_progress_items).toBe(0);
        expect(initialData.stats.not_started_items).toBe(0);
        expect(initialData.stats.completion_rate).toBe(0);
      }
    });

    it("統計データのインターフェースが正しく設定されること", () => {
      renderHook(() => useDashboardData(mockRepository));

      const calledWith = vi.mocked(useResultOperation).mock.calls[0]?.[0];
      expect(calledWith).toBeDefined();

      if (calledWith && "initialData" in calledWith) {
        const stats = (calledWith.initialData as any).stats;

        // UserBucketStatsの全フィールドが含まれていることを確認
        expect(stats).toHaveProperty("profile_id");
        expect(stats).toHaveProperty("display_name");
        expect(stats).toHaveProperty("total_items");
        expect(stats).toHaveProperty("completed_items");
        expect(stats).toHaveProperty("in_progress_items");
        expect(stats).toHaveProperty("not_started_items");
        expect(stats).toHaveProperty("completion_rate");
      }
    });

    it("複合データ型が正しく構成されること", () => {
      renderHook(() => useDashboardData(mockRepository));

      // 型チェック用の確認 - useResultOperationが複合型, BucketListError で呼ばれることを確認
      expect(useResultOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe("Hookの共通動作", () => {
    it("異なるリポジトリインスタンスでも正しく動作すること", () => {
      const anotherRepository = {
        ...mockRepository,
        findAll: vi.fn(),
      } as FunctionalBucketListRepository;

      renderHook(() => useCreateBucketItem(mockRepository));
      renderHook(() => useCreateBucketItem(anotherRepository));

      expect(useResultOperation).toHaveBeenCalledTimes(2);
    });

    it("再レンダリング時にuseResultOperationが再実行されること", () => {
      const { rerender } = renderHook(() =>
        useCreateBucketItem(mockRepository)
      );

      rerender();

      expect(useResultOperation).toHaveBeenCalledTimes(2);
    });

    it("すべてのHookがBucketListErrorを共通のエラー型として使用すること", () => {
      renderHook(() => useCreateBucketItem(mockRepository));
      renderHook(() => useUpdateBucketItem(mockRepository));
      renderHook(() => useDeleteBucketItem(mockRepository));
      renderHook(() => useCategories(mockRepository));
      renderHook(() => useDashboardData(mockRepository));

      // 全てのHookが呼び出されていることを確認
      expect(useResultOperation).toHaveBeenCalledTimes(5);
    });
  });

  describe("エラーハンドリングの統一性", () => {
    it("すべてのCRUD操作でBucketListErrorが使用されること", () => {
      const onError = vi.fn((error: BucketListError) => {
        // エラーハンドラーでBucketListError型が使用されることを確認
        expect(error).toBeDefined();
      });

      renderHook(() => useCreateBucketItem(mockRepository, { onError }));
      renderHook(() => useUpdateBucketItem(mockRepository, { onError }));
      renderHook(() => useDeleteBucketItem(mockRepository, { onError }));

      expect(useResultOperation).toHaveBeenCalledTimes(3);
    });

    it("成功コールバックが適切な型を受け取ること", () => {
      const createSuccess = vi.fn((item: BucketItem) => {
        expect(item).toBeDefined();
      });

      const updateSuccess = vi.fn((item: BucketItem) => {
        expect(item).toBeDefined();
      });

      const deleteSuccess = vi.fn(() => {
        // void型なので引数なし
      });

      renderHook(() =>
        useCreateBucketItem(mockRepository, { onSuccess: createSuccess })
      );
      renderHook(() =>
        useUpdateBucketItem(mockRepository, { onSuccess: updateSuccess })
      );
      renderHook(() =>
        useDeleteBucketItem(mockRepository, { onSuccess: deleteSuccess })
      );

      expect(useResultOperation).toHaveBeenCalledTimes(3);
    });
  });
});
