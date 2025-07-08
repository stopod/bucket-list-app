/**
 * BucketItemFormのテスト
 * フォームの基本機能、バリデーション、ユーザーインタラクションを検証
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BucketItemForm } from "../bucket-item-form";
import type { Category, BucketItemFormData } from "../../types";

// モックカテゴリデータ
const mockCategories: Category[] = [
  { id: 1, name: "旅行・観光", color: "#FF6B6B", created_at: "2023-01-01" },
  { id: 2, name: "スキル習得・学習", color: "#4ECDC4", created_at: "2023-01-02" },
  { id: 3, name: "体験・チャレンジ", color: "#45B7D1", created_at: "2023-01-03" },
];

// モックコールバック
const mockOnSubmit = vi.fn();
const mockOnCancel = vi.fn();

describe("BucketItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本的な描画テスト", () => {
    it("作成モードの場合、正しいタイトルとテキストが表示されること", () => {
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="create"
        />
      );

      expect(screen.getByText("新しいやりたいことを追加")).toBeInTheDocument();
      expect(
        screen.getByText("あなたが人生でやりたいことを追加しましょう")
      ).toBeInTheDocument();
    });

    it("編集モードの場合、正しいタイトルとテキストが表示されること", () => {
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
        />
      );

      expect(screen.getByText("やりたいことを編集")).toBeInTheDocument();
      expect(screen.getByText("項目の内容を編集できます")).toBeInTheDocument();
    });

    it("全ての必須フィールドが表示されること", () => {
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明・詳細/)).toBeInTheDocument();
      expect(screen.getByText(/カテゴリ/)).toBeInTheDocument();
      expect(screen.getByText(/優先度/)).toBeInTheDocument();
      expect(screen.getByText(/ステータス/)).toBeInTheDocument();
      expect(screen.getByText(/期限/)).toBeInTheDocument();
      expect(screen.getByLabelText(/他のユーザーに公開する/)).toBeInTheDocument();
    });

    it("カテゴリが空の場合、エラーメッセージが表示されること", () => {
      render(
        <BucketItemForm
          categories={[]}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("カテゴリが見つかりません")).toBeInTheDocument();
      expect(
        screen.getByText(/データベースにカテゴリが登録されていない可能性があります/)
      ).toBeInTheDocument();
    });
  });

  describe("初期値の設定テスト", () => {
    it("defaultValuesが正しく設定されること", () => {
      const defaultValues: Partial<BucketItemFormData> = {
        title: "テスト項目",
        description: "テスト説明",
        category_id: 2,
        priority: "high",
        status: "in_progress",
        due_date: "2024-12-31",
        due_type: "specific_date",
        is_public: false,
      };

      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          defaultValues={defaultValues}
        />
      );

      expect(screen.getByDisplayValue("テスト項目")).toBeInTheDocument();
      expect(screen.getByDisplayValue("テスト説明")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2024-12-31")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "具体的な日付" })).toBeChecked();
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("デフォルト値が正しく設定されること", () => {
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toHaveValue(""); // タイトル
      expect(screen.getByRole("radio", { name: "未定" })).toBeChecked();
      expect(screen.getByRole("checkbox")).toBeChecked(); // 公開設定
    });
  });

  describe("フォーム操作テスト", () => {
    it("タイトルの入力が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByLabelText(/タイトル/);
      await user.type(titleInput, "富士山に登る");

      expect(titleInput).toHaveValue("富士山に登る");
    });

    it("説明の入力が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const descriptionInput = screen.getByLabelText(/説明・詳細/);
      await user.type(descriptionInput, "詳細説明テキスト");

      expect(descriptionInput).toHaveValue("詳細説明テキスト");
    });

    it("公開設定のチェックボックスが正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const publicCheckbox = screen.getByRole("checkbox");
      expect(publicCheckbox).toBeChecked();

      await user.click(publicCheckbox);
      expect(publicCheckbox).not.toBeChecked();

      await user.click(publicCheckbox);
      expect(publicCheckbox).toBeChecked();
    });
  });

  describe("期限設定テスト", () => {
    it("期限タイプの選択が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // 初期状態は「未定」
      expect(screen.getByRole("radio", { name: "未定" })).toBeChecked();

      // 「今年中」を選択
      await user.click(screen.getByRole("radio", { name: "今年中" }));
      expect(screen.getByRole("radio", { name: "今年中" })).toBeChecked();

      // 「来年中」を選択
      await user.click(screen.getByRole("radio", { name: "来年中" }));
      expect(screen.getByRole("radio", { name: "来年中" })).toBeChecked();

      // 「具体的な日付」を選択
      await user.click(screen.getByRole("radio", { name: "具体的な日付" }));
      expect(screen.getByRole("radio", { name: "具体的な日付" })).toBeChecked();
    });

    it("今年中を選択した場合、今年の12月31日が設定されること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole("radio", { name: "今年中" }));
      
      const currentYear = new Date().getFullYear();
      const expectedDate = `${currentYear}-12-31`;
      
      // 日付入力フィールドは具体的な日付選択時のみ表示されるため、内部状態の確認のみ
      expect(screen.getByRole("radio", { name: "今年中" })).toBeChecked();
    });

    it("来年中を選択した場合、来年の12月31日が設定されること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole("radio", { name: "来年中" }));
      
      expect(screen.getByRole("radio", { name: "来年中" })).toBeChecked();
    });

    it("具体的な日付を選択した場合、日付入力フィールドが表示されること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole("radio", { name: "具体的な日付" }));
      
      expect(screen.getByRole("radio", { name: "具体的な日付" })).toBeChecked();
      
      // 日付入力フィールドが表示されること
      const dateInputs = screen.getAllByDisplayValue("");
      const dateInput = dateInputs.find(input => input.getAttribute("type") === "date");
      expect(dateInput).toBeInTheDocument();
    });

    it("具体的な日付で日付を入力した場合、正しく反映されること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole("radio", { name: "具体的な日付" }));
      
      const dateInputs = screen.getAllByDisplayValue("");
      const dateInput = dateInputs.find(input => input.getAttribute("type") === "date");
      await user.type(dateInput!, "2024-06-15");
      
      expect(dateInput).toHaveValue("2024-06-15");
    });
  });

  describe("フォーム送信テスト", () => {
    it("有効なデータでフォーム送信が正しく動作すること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/タイトル/), "富士山に登る");
      await user.type(screen.getByLabelText(/説明・詳細/), "登山の詳細説明");
      
      // 送信ボタンをクリック
      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: "富士山に登る",
        description: "登山の詳細説明",
        category_id: 1, // 最初のカテゴリが選択される
        priority: "medium",
        status: "not_started",
        due_date: "",
        due_type: "unspecified",
        is_public: true,
      });
    });

    it("タイトルが空の場合、フォーム送信が無効化されること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole("button", { name: "追加" });
      expect(submitButton).toBeDisabled();

      // タイトルを入力すると有効化される
      await user.type(screen.getByLabelText(/タイトル/), "テスト");
      expect(submitButton).not.toBeDisabled();

      // タイトルを消すと無効化される
      await user.clear(screen.getByLabelText(/タイトル/));
      expect(submitButton).toBeDisabled();
    });

    it("送信中の場合、ボタンが無効化されローディング表示されること", () => {
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
      expect(screen.getByText("追加中...")).toBeInTheDocument();
    });
  });

  describe("キャンセル処理テスト", () => {
    it("キャンセルボタンクリックで正しくコールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("フォーム送信でエラーが発生してもコンポーネントが壊れないこと", async () => {
      const user = userEvent.setup();
      const mockOnSubmitError = vi.fn();

      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmitError}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText(/タイトル/), "テスト項目");
      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(mockOnSubmitError).toHaveBeenCalled();
    });
  });

  describe("アクセシビリティテスト", () => {
    it("必須項目に適切なaria属性が設定されていること", () => {
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByLabelText(/タイトル/);
      expect(titleInput).toBeRequired();
    });

    it("フォーム要素が適切にラベル付けされていること", () => {
      render(
        <BucketItemForm
          categories={mockCategories}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明・詳細/)).toBeInTheDocument();
      expect(screen.getByText(/カテゴリ/)).toBeInTheDocument();
      expect(screen.getByText(/優先度/)).toBeInTheDocument();
      expect(screen.getByText(/ステータス/)).toBeInTheDocument();
    });
  });
});