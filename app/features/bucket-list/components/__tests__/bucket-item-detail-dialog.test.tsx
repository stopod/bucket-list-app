/**
 * BucketItemDetailDialogのテスト
 * ダイアログの表示、項目詳細の表示、各種操作の検証
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router";
import { BucketItemDetailDialog } from "../bucket-item-detail-dialog";
import type { BucketItemWithCategory, Category } from "../../types";

// React Routerラッパーコンポーネント
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// モックカテゴリデータ
const mockCategories: Category[] = [
  { id: 1, name: "旅行・観光", color: "#FF6B6B", created_at: "2023-01-01" },
  { id: 2, name: "スキル習得・学習", color: "#4ECDC4", created_at: "2023-01-02" },
];

// モックアイテムデータ
const mockItem: BucketItemWithCategory = {
  id: "item-1",
  profile_id: "user-1",
  title: "富士山に登る",
  description: "日本最高峰の富士山に登頂する",
  category_id: 1,
  priority: "high",
  status: "in_progress",
  due_date: "2024-07-01",
  due_type: "specific_date",
  is_public: true,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-02T00:00:00Z",
  completed_at: null,
  completion_comment: null,
  category: {
    id: 1,
    name: "旅行・観光",
    color: "#FF6B6B",
    created_at: "2023-01-01",
  },
};

// 完了済みアイテムデータ
const completedItem: BucketItemWithCategory = {
  ...mockItem,
  id: "item-2",
  status: "completed",
  completed_at: "2023-06-15T12:30:00Z",
  completion_comment: "天気が良くて最高でした！",
};

// モックコールバック
const mockOnClose = vi.fn();
const mockOnDelete = vi.fn();
const mockOnStatusChange = vi.fn();

describe("BucketItemDetailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本的な描画テスト", () => {
    it("ダイアログが開かれていない場合、何も表示されないこと", () => {
      const { container } = render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={false}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(container.firstChild).toBeNull();
    });

    it("ダイアログが開かれている場合、項目詳細が表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("富士山に登る")).toBeInTheDocument();
      expect(screen.getByText("日本最高峰の富士山に登頂する")).toBeInTheDocument();
      expect(screen.getByText("旅行・観光")).toBeInTheDocument();
      expect(screen.getByText("高")).toBeInTheDocument();
      expect(screen.getByText("進行中")).toBeInTheDocument();
      expect(screen.getByText("公開")).toBeInTheDocument();
    });

    it("アイテムがnullの場合、何も表示されないこと", () => {
      const { container } = render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={null}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("項目詳細表示テスト", () => {
    it("優先度が正しく表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("高")).toBeInTheDocument();
    });

    it("ステータスが正しく表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("進行中")).toBeInTheDocument();
    });

    it("公開状態が正しく表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("公開")).toBeInTheDocument();
    });

    it("期限が正しく表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("期限: 2024-07-01")).toBeInTheDocument();
    });

    it("作成日・更新日が正しく表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText(/作成日:/)).toBeInTheDocument();
      expect(screen.getByText(/更新日:/)).toBeInTheDocument();
    });
  });

  describe("完了済みアイテム表示テスト", () => {
    it("完了済みアイテムの場合、達成情報が表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={completedItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("達成情報")).toBeInTheDocument();
      expect(screen.getByText(/達成日:/)).toBeInTheDocument();
      expect(screen.getByText("天気が良くて最高でした！")).toBeInTheDocument();
    });
  });

  describe("説明文表示テスト", () => {
    it("説明文がある場合、正しく表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("説明")).toBeInTheDocument();
      expect(screen.getByText("日本最高峰の富士山に登頂する")).toBeInTheDocument();
    });

    it("説明文がない場合、説明セクションが表示されないこと", () => {
      const itemWithoutDescription = { ...mockItem, description: null };
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={itemWithoutDescription}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.queryByText("説明")).not.toBeInTheDocument();
    });
  });

  describe("ステータス変更テスト", () => {
    it("編集可能モードでステータス変更セレクトボックスが表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
            readOnly={false}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("ステータス変更")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("読み取り専用モードでステータス変更セレクトボックスが表示されないこと", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
            readOnly={true}
          />
        </RouterWrapper>
      );

      expect(screen.queryByText("ステータス変更")).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("ステータス変更時に正しくコールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      // ステータス変更セレクトボックスをクリック
      await user.click(screen.getByRole("combobox"));
      
      // 「完了」を選択
      await user.click(screen.getByText("完了"));

      expect(mockOnStatusChange).toHaveBeenCalledWith("item-1", "completed");
    });

    it("ステータス変更中の場合、ローディング表示されること", () => {
      const statusChangingIds = new Set(["item-1"]);
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
            statusChangingIds={statusChangingIds}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("変更中...")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });

  describe("アクションボタンテスト", () => {
    it("編集可能モードで編集・削除ボタンが表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
            readOnly={false}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("編集")).toBeInTheDocument();
      expect(screen.getByText("削除")).toBeInTheDocument();
    });

    it("読み取り専用モードで編集・削除ボタンが表示されないこと", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
            readOnly={true}
          />
        </RouterWrapper>
      );

      expect(screen.queryByText("編集")).not.toBeInTheDocument();
      expect(screen.queryByText("削除")).not.toBeInTheDocument();
    });

    it("削除ボタンクリック時に正しくコールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      await user.click(screen.getByText("削除"));

      expect(mockOnDelete).toHaveBeenCalledWith({
        id: "item-1",
        title: "富士山に登る",
      });
    });

    it("閉じるボタンクリック時に正しくコールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      await user.click(screen.getByText("閉じる"));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("送信中状態テスト", () => {
    it("送信中の場合、ボタンが無効化されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
            isSubmitting={true}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("編集")).toBeDisabled();
      expect(screen.getByText("削除")).toBeDisabled();
      expect(screen.getByText("閉じる")).toBeDisabled();
    });

    it("送信中の場合、ダイアログが閉じられないこと", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
            isSubmitting={true}
          />
        </RouterWrapper>
      );

      // ESCキーを押しても閉じられない
      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("期限表示テスト", () => {
    it("具体的な日付がある場合、日付が表示されること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("期限: 2024-07-01")).toBeInTheDocument();
    });

    it("期限タイプのみの場合、タイプが表示されること", () => {
      const itemWithDueType = {
        ...mockItem,
        due_date: null,
        due_type: "this_year",
      };
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={itemWithDueType}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("期限: 今年中")).toBeInTheDocument();
    });

    it("期限が未定の場合、「未定」が表示されること", () => {
      const itemWithoutDue = {
        ...mockItem,
        due_date: null,
        due_type: null,
      };
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={itemWithoutDue}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("期限: 未定")).toBeInTheDocument();
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("不正な優先度の場合、そのまま表示されること", () => {
      const itemWithInvalidPriority = {
        ...mockItem,
        priority: "invalid" as any,
      };
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={itemWithInvalidPriority}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("invalid")).toBeInTheDocument();
    });

    it("不正なステータスの場合、そのまま表示されること", () => {
      const itemWithInvalidStatus = {
        ...mockItem,
        status: "invalid" as any,
      };
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={itemWithInvalidStatus}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByText("invalid")).toBeInTheDocument();
    });
  });

  describe("アクセシビリティテスト", () => {
    it("ダイアログが適切なaria属性を持つこと", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ダイアログタイトルが適切に設定されていること", () => {
      render(
        <RouterWrapper>
          <BucketItemDetailDialog
            isOpen={true}
            onClose={mockOnClose}
            item={mockItem}
            onDelete={mockOnDelete}
            onStatusChange={mockOnStatusChange}
          />
        </RouterWrapper>
      );

      expect(screen.getByRole("dialog")).toHaveAccessibleName("富士山に登る");
    });
  });
});