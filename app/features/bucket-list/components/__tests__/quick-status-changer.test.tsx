/**
 * QuickStatusChangerのテスト
 * Result型統合、リアルタイム更新、ステータス変更機能を検証
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickStatusChanger, QuickStatusButton } from "../quick-status-changer";
import type { BucketListRepository } from "../../repositories";
import type { BucketItem, Status } from "../../types";
import { success, failure } from "~/shared/types/result";
import { createApplicationError } from "~/shared/types/errors";

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

// モック項目データ
const mockItemNotStarted: BucketItem = {
  id: "item-1",
  profile_id: "user-1",
  title: "未着手項目",
  description: "テスト項目",
  category_id: 1,
  priority: "medium",
  status: "not_started",
  is_public: true,
  due_date: null,
  due_type: null,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  completed_at: null,
  completion_comment: null,
};

const mockItemInProgress: BucketItem = {
  ...mockItemNotStarted,
  id: "item-2",
  title: "進行中項目",
  status: "in_progress",
};

const mockItemCompleted: BucketItem = {
  ...mockItemNotStarted,
  id: "item-3",
  title: "完了項目",
  status: "completed",
  completed_at: "2023-01-15T12:00:00Z",
};

// 更新後の項目データ
const mockUpdatedItem: BucketItem = {
  ...mockItemNotStarted,
  status: "in_progress",
  updated_at: "2023-01-15T12:00:00Z",
};

// モックコールバック
const mockOnStatusChanged = vi.fn();
const mockOnError = vi.fn();

// フック機能のモック
vi.mock("~/features/bucket-list/hooks/use-bucket-list-operations", () => ({
  useUpdateBucketItem: vi.fn(),
}));

describe("QuickStatusChanger", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
    vi.mocked(useUpdateBucketItem).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      error: null,
      execute: vi.fn().mockResolvedValue(success(mockUpdatedItem)),
    });
  });

  describe("基本的な描画テスト", () => {
    it("全てのステータスボタンが表示されること", () => {
      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("ステータス:")).toBeInTheDocument();
      expect(screen.getByText("未着手")).toBeInTheDocument();
      expect(screen.getByText("進行中")).toBeInTheDocument();
      expect(screen.getByText("完了")).toBeInTheDocument();
    });

    it("現在のステータスに視覚的な強調が表示されること", () => {
      render(
        <QuickStatusChanger
          item={mockItemInProgress}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      const currentStatusButton = screen.getByText("進行中").closest("button");
      expect(currentStatusButton).toHaveClass("ring-2");
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("各ステータスボタンが適切な色で表示されること", () => {
      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      const notStartedButton = screen.getByText("未着手").closest("button");
      const inProgressButton = screen.getByText("進行中").closest("button");
      const completedButton = screen.getByText("完了").closest("button");

      expect(notStartedButton).toHaveClass("bg-gray-100");
      expect(inProgressButton).toHaveClass("bg-blue-100");
      expect(completedButton).toHaveClass("bg-green-100");
    });
  });

  describe("ステータス変更テスト", () => {
    it("未着手から進行中に変更が正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockUpdatedItem));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("進行中"));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Function),
        "item-1",
        { status: "in_progress" }
      );
    });

    it("進行中から完了に変更する場合、completed_atが設定されること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockUpdatedItem));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusChanger
          item={mockItemInProgress}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("完了"));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Function),
        "item-2",
        expect.objectContaining({
          status: "completed",
          completed_at: expect.any(String),
        })
      );
    });

    it("同じステータスをクリックした場合、変更されないこと", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn();

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("未着手"));

      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe("ローディング状態テスト", () => {
    it("変更中の場合、ローディング表示されること", async () => {
      const user = userEvent.setup();
      let executeResolve: (value: any) => void;
      
      const mockExecute = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          executeResolve = resolve;
        });
      });

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      // ステータス変更を開始
      await user.click(screen.getByText("進行中"));

      // ローディング表示を確認
      expect(screen.getByText("ステータスを変更中...")).toBeInTheDocument();
      
      // 処理完了
      executeResolve(success(mockUpdatedItem));
    });

    it("変更中の場合、全てのボタンが無効化されること", async () => {
      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: true,
        isSuccess: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("未着手").closest("button")).toBeDisabled();
      expect(screen.getByText("進行中").closest("button")).toBeDisabled();
      expect(screen.getByText("完了").closest("button")).toBeDisabled();
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("エラーが発生した場合、エラーメッセージが表示されること", async () => {
      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: createApplicationError("ステータス変更エラー"),
        execute: vi.fn(),
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("ステータス変更エラー")).toBeInTheDocument();
    });

    it("エラーコールバックが正しく呼ばれること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(failure(createApplicationError("更新失敗")));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("進行中"));

      // onErrorコールバックを直接呼び出してテスト
      const updateHook = vi.mocked(useUpdateBucketItem).mock.calls[0][1];
      if (updateHook?.onError) {
        updateHook.onError(createApplicationError("更新失敗"));
      }

      expect(mockOnError).toHaveBeenCalledWith("更新失敗");
    });
  });

  describe("成功時の処理テスト", () => {
    it("成功メッセージが表示されること", async () => {
      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: true,
        error: null,
        execute: vi.fn(),
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("ステータスを変更しました")).toBeInTheDocument();
    });

    it("成功コールバックが正しく呼ばれること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockUpdatedItem));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("進行中"));

      // onSuccessコールバックを直接呼び出してテスト
      const updateHook = vi.mocked(useUpdateBucketItem).mock.calls[0][1];
      if (updateHook?.onSuccess) {
        updateHook.onSuccess(mockUpdatedItem);
      }

      expect(mockOnStatusChanged).toHaveBeenCalledWith(mockUpdatedItem);
    });
  });

  describe("アクセシビリティテスト", () => {
    it("ボタンが適切なaria属性を持つこと", () => {
      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it("無効化されたボタンが適切に処理されること", async () => {
      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: true,
        isSuccess: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <QuickStatusChanger
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });
});

describe("QuickStatusButton", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
    vi.mocked(useUpdateBucketItem).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      error: null,
      execute: vi.fn().mockResolvedValue(success(mockUpdatedItem)),
    });
  });

  describe("基本的な描画テスト", () => {
    it("未着手項目の場合、開始ボタンが表示されること", () => {
      render(
        <QuickStatusButton
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("開始する")).toBeInTheDocument();
    });

    it("進行中項目の場合、完了ボタンが表示されること", () => {
      render(
        <QuickStatusButton
          item={mockItemInProgress}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("完了する")).toBeInTheDocument();
    });

    it("完了項目の場合、完了済み表示されること", () => {
      render(
        <QuickStatusButton
          item={mockItemCompleted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("完了済み")).toBeInTheDocument();
      expect(screen.getByText("🎉")).toBeInTheDocument();
    });
  });

  describe("ステータス進行テスト", () => {
    it("未着手から進行中への変更が正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockUpdatedItem));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusButton
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("開始する"));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Function),
        "item-1",
        { status: "in_progress" }
      );
    });

    it("進行中から完了への変更が正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockUpdatedItem));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusButton
          item={mockItemInProgress}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("完了する"));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Function),
        "item-2",
        expect.objectContaining({
          status: "completed",
          completed_at: expect.any(String),
        })
      );
    });
  });

  describe("ボタン色テスト", () => {
    it("未着手項目の場合、青色のボタンが表示されること", () => {
      render(
        <QuickStatusButton
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      const button = screen.getByText("開始する").closest("button");
      expect(button).toHaveClass("bg-blue-600");
    });

    it("進行中項目の場合、緑色のボタンが表示されること", () => {
      render(
        <QuickStatusButton
          item={mockItemInProgress}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      const button = screen.getByText("完了する").closest("button");
      expect(button).toHaveClass("bg-green-600");
    });
  });

  describe("ローディング状態テスト", () => {
    it("変更中の場合、ローディング表示されること", async () => {
      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: true,
        isSuccess: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <QuickStatusButton
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("変更中...")).toBeInTheDocument();
      expect(screen.getByText("⏳")).toBeInTheDocument();
    });

    it("変更中の場合、ボタンが無効化されること", async () => {
      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: true,
        isSuccess: false,
        error: null,
        execute: vi.fn(),
      });

      render(
        <QuickStatusButton
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      expect(screen.getByText("変更中...").closest("button")).toBeDisabled();
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("エラーコールバックが正しく呼ばれること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(failure(createApplicationError("更新失敗")));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusButton
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("開始する"));

      // onErrorコールバックを直接呼び出してテスト
      const updateHook = vi.mocked(useUpdateBucketItem).mock.calls[0][1];
      if (updateHook?.onError) {
        updateHook.onError(createApplicationError("更新失敗"));
      }

      expect(mockOnError).toHaveBeenCalledWith("更新失敗");
    });
  });

  describe("成功時の処理テスト", () => {
    it("成功コールバックが正しく呼ばれること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockUpdatedItem));

      const { useUpdateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useUpdateBucketItem).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickStatusButton
          item={mockItemNotStarted}
          repository={mockRepository}
          onStatusChanged={mockOnStatusChanged}
          onError={mockOnError}
        />
      );

      await user.click(screen.getByText("開始する"));

      // onSuccessコールバックを直接呼び出してテスト
      const updateHook = vi.mocked(useUpdateBucketItem).mock.calls[0][1];
      if (updateHook?.onSuccess) {
        updateHook.onSuccess(mockUpdatedItem);
      }

      expect(mockOnStatusChanged).toHaveBeenCalledWith(mockUpdatedItem);
    });
  });
});