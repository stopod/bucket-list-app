/**
 * LiveDashboardWidgetのテスト
 * Result型統合、リアルタイム更新、ダッシュボード機能を検証
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LiveDashboardWidget } from "../live-dashboard-widget";
import type { BucketListRepository } from "../../repositories";
import type { BucketItem, BucketItemWithCategory, Category } from "../../types";
import { success, failure } from "~/shared/types/result";
import { createApplicationError } from "~/shared/types/errors";

// タイマーのモック
vi.useFakeTimers();

// モックリポジトリ
const mockRepository: BucketListRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByProfileId: vi.fn(),
  findAllWithCategory: vi.fn(),
  findPublic: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAllCategories: vi.fn(),
  findCategoryById: vi.fn(),
  getUserStats: vi.fn(),
};

// モックカテゴリデータ
const mockCategory: Category = {
  id: 1,
  name: "旅行・観光",
  color: "#FF6B6B",
  created_at: "2023-01-01",
};

// モックアイテムデータ
const mockItems: BucketItemWithCategory[] = [
  {
    id: "item-1",
    profile_id: "user-1",
    title: "完了項目",
    description: "完了した項目",
    category_id: 1,
    priority: "high",
    status: "completed",
    is_public: true,
    due_date: "2023-12-31",
    due_type: "specific_date",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    completed_at: "2023-01-15T12:00:00Z",
    completion_comment: null,
    category: mockCategory,
  },
  {
    id: "item-2",
    profile_id: "user-1",
    title: "進行中項目",
    description: "進行中の項目",
    category_id: 1,
    priority: "medium",
    status: "in_progress",
    is_public: true,
    due_date: "2024-01-15",
    due_type: "specific_date",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    completed_at: null,
    completion_comment: null,
    category: mockCategory,
  },
  {
    id: "item-3",
    profile_id: "user-1",
    title: "未着手項目",
    description: "未着手の項目",
    category_id: 1,
    priority: "low",
    status: "not_started",
    is_public: false,
    due_date: null,
    due_type: null,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    completed_at: null,
    completion_comment: null,
    category: mockCategory,
  },
];

// モックダッシュボードデータ
const mockDashboardData = {
  items: mockItems,
  categories: [mockCategory],
  stats: {
    total_items: 3,
    completed_items: 1,
    in_progress_items: 1,
    not_started_items: 1,
    completion_rate: 33,
    display_name: "テストユーザー",
    profile_id: "user-1",
  },
  itemsByCategory: [
    {
      category: mockCategory,
      items: mockItems,
    },
  ],
  recentCompletedItems: [mockItems[0]],
  upcomingItems: [mockItems[1]],
};

// フック機能のモック
vi.mock("~/features/bucket-list/hooks/use-bucket-list-operations", () => ({
  useDashboardData: vi.fn(),
}));

describe("LiveDashboardWidget", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
    vi.mocked(useDashboardData).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
      execute: vi.fn().mockResolvedValue(success(mockDashboardData)),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("基本的な描画テスト", () => {
    it("ダッシュボード要素が正しく表示されること", async () => {
      await act(async () => {
        render(
          <LiveDashboardWidget
            repository={mockRepository}
            profileId="user-1"
          />
        );
      });

      expect(screen.getByText("📊 ライブダッシュボード")).toBeInTheDocument();
      expect(screen.getByText("総項目数")).toBeInTheDocument();
      expect(screen.getByText("完了済み")).toBeInTheDocument();
      expect(screen.getByText("進行中")).toBeInTheDocument();
      expect(screen.getByText("達成率")).toBeInTheDocument();
    });

    it("統計データが正しく表示されること", async () => {
      await act(async () => {
        render(
          <LiveDashboardWidget
            repository={mockRepository}
            profileId="user-1"
          />
        );
      });

      expect(screen.getByText("3")).toBeInTheDocument(); // 総項目数
      expect(screen.getAllByText("1")).toHaveLength(2); // 完了済み and 進行中
      expect(screen.getByText("33%")).toBeInTheDocument(); // 達成率
    });

    it("最近の完了項目が表示されること", async () => {
      await act(async () => {
        render(
          <LiveDashboardWidget
            repository={mockRepository}
            profileId="user-1"
          />
        );
      });

      expect(screen.getByText("🎉 最近の達成 (直近5件)")).toBeInTheDocument();
      expect(screen.getByText("完了項目")).toBeInTheDocument();
    });

    it("期限が近い項目が表示されること", async () => {
      await act(async () => {
        render(
          <LiveDashboardWidget
            repository={mockRepository}
            profileId="user-1"
          />
        );
      });

      expect(screen.getByText("⏰ 期限が近い項目 (30日以内)")).toBeInTheDocument();
      expect(screen.getByText("進行中項目")).toBeInTheDocument();
    });

    it("カテゴリ別進捗が表示されること", async () => {
      await act(async () => {
        render(
          <LiveDashboardWidget
            repository={mockRepository}
            profileId="user-1"
          />
        );
      });

      expect(screen.getByText("📂 カテゴリ別進捗")).toBeInTheDocument();
      expect(screen.getByText("旅行・観光")).toBeInTheDocument();
      expect(screen.getByText("1/3 (33%)")).toBeInTheDocument();
    });
  });

  describe("自動更新機能テスト", () => {
    it("自動更新が有効な場合、指定間隔で更新されること", async () => {
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      await act(async () => {
        render(
          <LiveDashboardWidget
            repository={mockRepository}
            profileId="user-1"
            refreshInterval={1000} // より短い間隔に変更
          />
        );
      });

      // 初回読み込み確認
      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      // タイマーを進める
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      // 自動更新確認
      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });
    }, 10000);

    it("自動更新トグルボタンが正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      await act(async () => {
        render(
          <LiveDashboardWidget
            repository={mockRepository}
            profileId="user-1"
            refreshInterval={1000}
          />
        );
      });

      // 初期状態では自動更新が有効
      await waitFor(() => {
        expect(screen.getByText("⏰ 自動更新ON")).toBeInTheDocument();
      }, { timeout: 3000 });

      // 自動更新を無効にする
      await act(async () => {
        await user.click(screen.getByText("⏰ 自動更新ON"));
      });
      
      await waitFor(() => {
        expect(screen.getByText("⏸️ 自動更新OFF")).toBeInTheDocument();
      }, { timeout: 3000 });

      // 自動更新を再度有効にする
      await act(async () => {
        await user.click(screen.getByText("⏸️ 自動更新OFF"));
      });
      
      await waitFor(() => {
        expect(screen.getByText("⏰ 自動更新ON")).toBeInTheDocument();
      }, { timeout: 3000 });
    }, 15000);

    it("自動更新が無効な場合、定期更新されないこと", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
          refreshInterval={5000}
        />
      );

      // 自動更新を無効にする
      await user.click(screen.getByText("⏰ 自動更新ON"));

      // 初回読み込み後はカウントが増えない
      const initialCallCount = mockExecute.mock.calls.length;

      // 5秒経過させる
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockExecute).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe("手動更新機能テスト", () => {
    it("手動更新ボタンが表示されること", () => {
      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
          showRefreshButton={true}
        />
      );

      expect(screen.getByText("🔄 更新")).toBeInTheDocument();
    });

    it("手動更新ボタンを非表示にできること", () => {
      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
          showRefreshButton={false}
        />
      );

      expect(screen.queryByText("🔄 更新")).not.toBeInTheDocument();
    });

    it("手動更新ボタンクリック時に更新が実行されること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      const initialCallCount = mockExecute.mock.calls.length;

      await user.click(screen.getByText("🔄 更新"));

      expect(mockExecute).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it("更新中は手動更新ボタンが無効化されること", async () => {
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: true,
        error: null,
        execute: vi.fn(),
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      expect(screen.getByText("更新中")).toBeInTheDocument();
      expect(screen.getByText("更新中").closest("button")).toBeDisabled();
    });
  });

  describe("ローディング状態テスト", () => {
    it("初回読み込み中はローディング表示されること", async () => {
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useDashboardData).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        execute: vi.fn(),
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      expect(screen.getByText("ダッシュボードデータを読み込み中...")).toBeInTheDocument();
    });

    it("データ読み込み済みの場合は通常表示されること", () => {
      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      expect(screen.getByText("📊 ライブダッシュボード")).toBeInTheDocument();
      expect(screen.queryByText("ダッシュボードデータを読み込み中...")).not.toBeInTheDocument();
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("エラーが発生した場合、エラーメッセージが表示されること", async () => {
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useDashboardData).mockReturnValue({
        data: null,
        isLoading: false,
        error: createApplicationError("データ読み込みエラー"),
        execute: vi.fn(),
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      expect(screen.getByText("⚠️ ダッシュボードデータの読み込みに失敗しました")).toBeInTheDocument();
      expect(screen.getByText("データ読み込みエラー")).toBeInTheDocument();
      expect(screen.getByText("再読み込み")).toBeInTheDocument();
    });

    it("エラー状態で再読み込みボタンが動作すること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: null,
        isLoading: false,
        error: createApplicationError("データ読み込みエラー"),
        execute: mockExecute,
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      await user.click(screen.getByText("再読み込み"));

      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe("空データ状態テスト", () => {
    it("データが空の場合、空状態メッセージが表示されること", async () => {
      const emptyData = {
        ...mockDashboardData,
        items: [],
      };

      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useDashboardData).mockReturnValue({
        data: emptyData,
        isLoading: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      expect(screen.getByText("まだ項目が登録されていません")).toBeInTheDocument();
      expect(screen.getByText("新しい目標を追加してみましょう！")).toBeInTheDocument();
    });

    it("データがnullの場合、データなしメッセージが表示されること", async () => {
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useDashboardData).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      expect(screen.getByText("データがありません")).toBeInTheDocument();
    });
  });

  describe("最終更新時刻表示テスト", () => {
    it("初回読み込み時は最終更新時刻が表示されないこと", () => {
      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      expect(screen.queryByText(/最終更新:/)).not.toBeInTheDocument();
    });

    it("手動更新後は最終更新時刻が表示されること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      await user.click(screen.getByText("🔄 更新"));

      await waitFor(() => {
        expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
      });
    });
  });

  describe("期限計算テスト", () => {
    it("期限が7日以内の項目は緊急表示されること", async () => {
      const urgentItem = {
        ...mockItems[1],
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5日後
      };

      const urgentData = {
        ...mockDashboardData,
        upcomingItems: [urgentItem],
      };

      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useDashboardData).mockReturnValue({
        data: urgentData,
        isLoading: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      const upcomingItem = screen.getByText("進行中項目").closest("div");
      expect(upcomingItem).toHaveClass("bg-red-50");
    });

    it("期限が8日以上の項目は通常表示されること", async () => {
      const normalItem = {
        ...mockItems[1],
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15日後
      };

      const normalData = {
        ...mockDashboardData,
        upcomingItems: [normalItem],
      };

      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useDashboardData).mockReturnValue({
        data: normalData,
        isLoading: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
        />
      );

      const upcomingItem = screen.getByText("進行中項目").closest("div");
      expect(upcomingItem).toHaveClass("bg-yellow-50");
    });
  });

  describe("カスタマイズオプションテスト", () => {
    it("カスタム更新間隔が設定されること", async () => {
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
          refreshInterval={10000}
        />
      );

      // 10秒後に更新される
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockExecute).toHaveBeenCalledTimes(2); // 初回 + 10秒後
    });

    it("更新間隔を0にすると自動更新が無効になること", async () => {
      const mockExecute = vi.fn().mockImplementation(async () => {
        return success(mockDashboardData);
      });
      const { useDashboardData } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      
      vi.mocked(useDashboardData).mockReturnValue({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <LiveDashboardWidget
          repository={mockRepository}
          profileId="user-1"
          refreshInterval={0}
        />
      );

      // 時間経過させても更新されない
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockExecute).toHaveBeenCalledTimes(1); // 初回のみ
    });
  });
});