/**
 * QuickItemCreatorのテスト
 * Result型統合、フック使用、インライン項目作成機能を検証
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickItemCreator, MinimalQuickCreator } from "../quick-item-creator";
import type { BucketListRepository } from "../../repositories";
import type { BucketItem, Category, Priority } from "../../types";
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
  softDelete: vi.fn(),
};

// モックカテゴリデータ
const mockCategories: Category[] = [
  { id: 1, name: "旅行・観光", color: "#FF6B6B", created_at: "2023-01-01" },
  { id: 2, name: "スキル習得・学習", color: "#4ECDC4", created_at: "2023-01-02" },
  { id: 3, name: "体験・チャレンジ", color: "#45B7D1", created_at: "2023-01-03" },
];

// モック作成項目データ
const mockCreatedItem: BucketItem = {
  id: "new-item-1",
  profile_id: "user-1",
  title: "新しい項目",
  description: "新しい項目の説明",
  category_id: 1,
  priority: "medium",
  status: "not_started",
  is_public: true,
  due_date: null,
  due_type: null,
  created_at: "2023-01-15T10:00:00Z",
  updated_at: "2023-01-15T10:00:00Z",
  completed_at: null,
  completion_comment: null,
};

// モックコールバック
const mockOnItemCreated = vi.fn();
const mockOnError = vi.fn();
const mockOnCancel = vi.fn();

// フック機能のモック
vi.mock("~/features/bucket-list/hooks/use-bucket-list-operations", () => ({
  useCategories: vi.fn(),
  useCreateBucketItem: vi.fn(),
}));

describe("QuickItemCreator", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    const { useCategories, useCreateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
    vi.mocked(useCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
      execute: vi.fn().mockResolvedValue(success(mockCategories)),
    });
    vi.mocked(useCreateBucketItem).mockReturnValue({
      isLoading: false,
      error: null,
      execute: vi.fn().mockResolvedValue(success(mockCreatedItem)),
    });
  });

  describe("基本的な描画テスト", () => {
    it("展開モードで必要なフィールドが表示されること", () => {
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("➕ 新しい項目を追加")).toBeInTheDocument();
      expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明/)).toBeInTheDocument();
      expect(screen.getByLabelText(/カテゴリ/)).toBeInTheDocument();
      expect(screen.getByLabelText(/優先度/)).toBeInTheDocument();
      expect(screen.getByLabelText(/他のユーザーに公開する/)).toBeInTheDocument();
    });

    it("コンパクトモードで未展開の場合、追加ボタンが表示されること", () => {
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
          compact={true}
        />
      );

      expect(screen.getByText("新しい項目を追加")).toBeInTheDocument();
      expect(screen.getByText("➕")).toBeInTheDocument();
      expect(screen.queryByLabelText(/タイトル/)).not.toBeInTheDocument();
    });

    it("コンパクトモードで展開した場合、フォームが表示されること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
          compact={true}
        />
      );

      await user.click(screen.getByText("新しい項目を追加"));

      expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明/)).toBeInTheDocument();
    });
  });

  describe("初期値設定テスト", () => {
    it("デフォルト値が正しく設定されること", () => {
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
          defaultCategoryId={2}
          defaultPriority="high"
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toHaveValue("");
      expect(screen.getByLabelText(/説明/)).toHaveValue("");
      expect(screen.getByLabelText(/優先度/)).toHaveValue("high");
      expect(screen.getByLabelText(/他のユーザーに公開する/)).toBeChecked();
    });
  });

  describe("フォーム操作テスト", () => {
    it("タイトルの入力が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByLabelText(/タイトル/);
      await user.type(titleInput, "新しいやりたいこと");

      expect(titleInput).toHaveValue("新しいやりたいこと");
    });

    it("説明の入力が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      const descriptionInput = screen.getByLabelText(/説明/);
      await user.type(descriptionInput, "詳細な説明文");

      expect(descriptionInput).toHaveValue("詳細な説明文");
    });

    it("カテゴリの選択が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      const categorySelect = screen.getByLabelText(/カテゴリ/);
      await user.selectOptions(categorySelect, "2");

      expect(categorySelect).toHaveValue("2");
    });

    it("優先度の選択が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      const prioritySelect = screen.getByLabelText(/優先度/);
      await user.selectOptions(prioritySelect, "high");

      expect(prioritySelect).toHaveValue("high");
    });

    it("公開設定のチェックボックスが正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      const publicCheckbox = screen.getByLabelText(/他のユーザーに公開する/);
      expect(publicCheckbox).toBeChecked();

      await user.click(publicCheckbox);
      expect(publicCheckbox).not.toBeChecked();
    });
  });

  describe("フォーム送信テスト", () => {
    it("有効なデータでフォーム送信が正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockCreatedItem));

      // useCreateBucketItemのモックを更新
      const { useCreateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCreateBucketItem).mockReturnValue({
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/タイトル/), "新しい項目");
      await user.type(screen.getByLabelText(/説明/), "詳細説明");
      await user.selectOptions(screen.getByLabelText(/カテゴリ/), "1");

      // 送信ボタンをクリック
      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(mockExecute).toHaveBeenCalled();
    });

    it("タイトルが空の場合、エラーメッセージが表示されること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      // タイトルなしで送信
      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(mockOnError).toHaveBeenCalledWith("タイトルとカテゴリは必須です");
    });

    it("カテゴリが選択されていない場合、エラーメッセージが表示されること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      // タイトルのみ入力してカテゴリを未選択
      await user.type(screen.getByLabelText(/タイトル/), "新しい項目");
      await user.selectOptions(screen.getByLabelText(/カテゴリ/), "");

      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(mockOnError).toHaveBeenCalledWith("タイトルとカテゴリは必須です");
    });

    it("送信中の場合、ボタンが無効化されること", () => {
      const { useCreateBucketItem } = require("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCreateBucketItem).mockReturnValue({
        isLoading: true,
        error: null,
        execute: vi.fn(),
      });

      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole("button", { name: "作成中..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
    });
  });

  describe("キャンセル処理テスト", () => {
    it("キャンセルボタンクリックでフォームがリセットされること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/タイトル/), "テスト項目");
      await user.type(screen.getByLabelText(/説明/), "テスト説明");

      // キャンセルボタンをクリック
      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(screen.getByLabelText(/タイトル/)).toHaveValue("");
      expect(screen.getByLabelText(/説明/)).toHaveValue("");
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("コンパクトモードでキャンセルした場合、フォームが折りたたまれること", async () => {
      const user = userEvent.setup();
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
          compact={true}
        />
      );

      // 展開
      await user.click(screen.getByText("新しい項目を追加"));

      // キャンセル
      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(screen.getByText("新しい項目を追加")).toBeInTheDocument();
      expect(screen.queryByLabelText(/タイトル/)).not.toBeInTheDocument();
    });
  });

  describe("カテゴリ読み込みテスト", () => {
    it("カテゴリ読み込み中の場合、ローディング表示されること", async () => {
      const { useCategories } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCategories).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        execute: vi.fn(),
      });

      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("カテゴリを読み込み中...")).toBeInTheDocument();
    });

    it("カテゴリ読み込みエラーの場合、エラーメッセージが表示されること", async () => {
      const { useCategories } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCategories).mockReturnValue({
        data: null,
        isLoading: false,
        error: createApplicationError("カテゴリ読み込みエラー"),
        execute: vi.fn(),
      });

      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("カテゴリの読み込みに失敗しました")).toBeInTheDocument();
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("作成エラーが発生した場合、エラーメッセージが表示されること", () => {
      const { useCreateBucketItem } = require("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCreateBucketItem).mockReturnValue({
        isLoading: false,
        error: createApplicationError("作成エラー"),
        execute: vi.fn(),
      });

      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("作成エラー")).toBeInTheDocument();
    });
  });

  describe("アクセシビリティテスト", () => {
    it("必須項目に適切なラベルが設定されていること", () => {
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toBeRequired();
      expect(screen.getByLabelText(/カテゴリ/)).toBeRequired();
    });

    it("フォーム要素が適切にラベル付けされていること", () => {
      render(
        <QuickItemCreator
          repository={mockRepository}
          profileId="user-1"
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明/)).toBeInTheDocument();
      expect(screen.getByLabelText(/カテゴリ/)).toBeInTheDocument();
      expect(screen.getByLabelText(/優先度/)).toBeInTheDocument();
      expect(screen.getByLabelText(/他のユーザーに公開する/)).toBeInTheDocument();
    });
  });
});

describe("MinimalQuickCreator", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    const { useCreateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
    vi.mocked(useCreateBucketItem).mockReturnValue({
      isLoading: false,
      error: null,
      execute: vi.fn().mockResolvedValue(success(mockCreatedItem)),
    });
  });

  describe("基本的な描画テスト", () => {
    it("最小限のフォームが表示されること", () => {
      render(
        <MinimalQuickCreator
          repository={mockRepository}
          profileId="user-1"
          defaultCategoryId={1}
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
        />
      );

      expect(screen.getByPlaceholderText("新しいやりたいことを入力...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
    });

    it("カスタムプレースホルダーが表示されること", () => {
      render(
        <MinimalQuickCreator
          repository={mockRepository}
          profileId="user-1"
          defaultCategoryId={1}
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
          placeholder="カスタムプレースホルダー"
        />
      );

      expect(screen.getByPlaceholderText("カスタムプレースホルダー")).toBeInTheDocument();
    });
  });

  describe("フォーム操作テスト", () => {
    it("タイトルの入力が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <MinimalQuickCreator
          repository={mockRepository}
          profileId="user-1"
          defaultCategoryId={1}
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
        />
      );

      const titleInput = screen.getByPlaceholderText("新しいやりたいことを入力...");
      await user.type(titleInput, "簡単な項目");

      expect(titleInput).toHaveValue("簡単な項目");
    });

    it("有効なデータでフォーム送信が正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockCreatedItem));

      const { useCreateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCreateBucketItem).mockReturnValue({
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <MinimalQuickCreator
          repository={mockRepository}
          profileId="user-1"
          defaultCategoryId={1}
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
        />
      );

      await user.type(screen.getByPlaceholderText("新しいやりたいことを入力..."), "簡単な項目");
      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(mockExecute).toHaveBeenCalled();
    });

    it("タイトルが空の場合、送信ボタンが無効化されること", () => {
      render(
        <MinimalQuickCreator
          repository={mockRepository}
          profileId="user-1"
          defaultCategoryId={1}
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
        />
      );

      expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
    });

    it("送信中の場合、フォームが無効化されること", () => {
      const { useCreateBucketItem } = require("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCreateBucketItem).mockReturnValue({
        isLoading: true,
        error: null,
        execute: vi.fn(),
      });

      render(
        <MinimalQuickCreator
          repository={mockRepository}
          profileId="user-1"
          defaultCategoryId={1}
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
        />
      );

      expect(screen.getByRole("button", { name: "追加中..." })).toBeDisabled();
      expect(screen.getByPlaceholderText("新しいやりたいことを入力...")).toBeDisabled();
    });
  });

  describe("成功時の処理テスト", () => {
    it("作成成功時にフォームがリセットされること", async () => {
      const user = userEvent.setup();
      const mockExecute = vi.fn().mockResolvedValue(success(mockCreatedItem));

      const { useCreateBucketItem } = await import("~/features/bucket-list/hooks/use-bucket-list-operations");
      vi.mocked(useCreateBucketItem).mockReturnValue({
        isLoading: false,
        error: null,
        execute: mockExecute,
      });

      render(
        <MinimalQuickCreator
          repository={mockRepository}
          profileId="user-1"
          defaultCategoryId={1}
          onItemCreated={mockOnItemCreated}
          onError={mockOnError}
        />
      );

      const titleInput = screen.getByPlaceholderText("新しいやりたいことを入力...");
      await user.type(titleInput, "簡単な項目");
      await user.click(screen.getByRole("button", { name: "追加" }));

      // onSuccessコールバックを直接呼び出してテスト
      const createItemHook = vi.mocked(useCreateBucketItem).mock.calls[0][1];
      if (createItemHook?.onSuccess) {
        createItemHook.onSuccess(mockCreatedItem);
      }

      expect(titleInput).toHaveValue("");
      expect(mockOnItemCreated).toHaveBeenCalledWith(mockCreatedItem);
    });
  });
});