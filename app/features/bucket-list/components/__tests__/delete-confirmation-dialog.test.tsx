/**
 * DeleteConfirmationDialogのテスト
 * 削除確認ダイアログの基本機能とユーザーインタラクションを検証
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteConfirmationDialog } from "../delete-confirmation-dialog";

// モックコールバック
const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

describe("DeleteConfirmationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本的な描画テスト", () => {
    it("ダイアログが開かれていない場合、何も表示されないこと", () => {
      const { container } = render(
        <DeleteConfirmationDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("ダイアログが開かれている場合、確認内容が表示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(screen.getByText("項目を削除しますか？")).toBeInTheDocument();
      expect(screen.getByText("テスト項目")).toBeInTheDocument();
      expect(screen.getByText("※ この操作は取り消すことができません。")).toBeInTheDocument();
    });

    it("キャンセルボタンと削除ボタンが表示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(screen.getByText("キャンセル")).toBeInTheDocument();
      expect(screen.getByText("削除する")).toBeInTheDocument();
    });

    it("項目タイトルが正しく表示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="特別な項目名"
        />
      );

      expect(screen.getByText("特別な項目名")).toBeInTheDocument();
    });
  });

  describe("ユーザーインタラクションテスト", () => {
    it("キャンセルボタンクリック時に正しくコールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      await user.click(screen.getByText("キャンセル"));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("削除ボタンクリック時に正しくコールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      await user.click(screen.getByText("削除する"));

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("ESCキーでダイアログが閉じられること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("背景クリックでダイアログが閉じられること", async () => {
      const user = userEvent.setup();
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      // ダイアログの背景をクリック
      const dialog = screen.getByRole("dialog");
      await user.click(dialog.parentElement!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("削除中状態テスト", () => {
    it("削除中の場合、ローディング表示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
          isSubmitting={true}
        />
      );

      expect(screen.getByText("削除中...")).toBeInTheDocument();
    });

    it("削除中の場合、ボタンが無効化されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
          isSubmitting={true}
        />
      );

      expect(screen.getByText("キャンセル")).toBeDisabled();
      expect(screen.getByText("削除中...")).toBeDisabled();
    });

    it("削除中の場合、ESCキーでダイアログが閉じられないこと", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
          isSubmitting={true}
        />
      );

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("削除中の場合、背景クリックでダイアログが閉じられないこと", async () => {
      const user = userEvent.setup();
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
          isSubmitting={true}
        />
      );

      // ダイアログの背景をクリック
      const dialog = screen.getByRole("dialog");
      await user.click(dialog.parentElement!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("ボタンスタイルテスト", () => {
    it("削除ボタンが危険色で表示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      const deleteButton = screen.getByText("削除する");
      expect(deleteButton).toHaveClass("bg-destructive");
    });

    it("キャンセルボタンがアウトライン形式で表示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      const cancelButton = screen.getByText("キャンセル");
      expect(cancelButton).toHaveClass("border-input");
    });
  });

  describe("警告メッセージテスト", () => {
    it("削除の不可逆性が適切に警告されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      const warningMessage = screen.getByText("※ この操作は取り消すことができません。");
      expect(warningMessage).toBeInTheDocument();
      expect(warningMessage).toHaveClass("text-red-600");
    });

    it("削除対象が明確に示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="重要な項目"
        />
      );

      const itemTitle = screen.getByText("重要な項目");
      expect(itemTitle).toBeInTheDocument();
      expect(itemTitle).toHaveClass("font-medium");
    });
  });

  describe("アクセシビリティテスト", () => {
    it("ダイアログが適切なaria属性を持つこと", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ダイアログタイトルが適切に設定されていること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(screen.getByRole("dialog")).toHaveAccessibleName("項目を削除しますか？");
    });

    it("ダイアログ説明が適切に設定されていること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(screen.getByRole("dialog")).toHaveAccessibleDescription();
    });

    it("ボタンが適切なタイプ属性を持つこと", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      const cancelButton = screen.getByText("キャンセル");
      const deleteButton = screen.getByText("削除する");

      expect(cancelButton).toHaveAttribute("type", "button");
      expect(deleteButton).toHaveAttribute("type", "button");
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("空のタイトルでも正しく表示されること", () => {
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle=""
        />
      );

      expect(screen.getByText("項目を削除しますか？")).toBeInTheDocument();
      expect(screen.getByText("キャンセル")).toBeInTheDocument();
      expect(screen.getByText("削除する")).toBeInTheDocument();
    });

    it("長いタイトルでも正しく表示されること", () => {
      const longTitle = "これは非常に長いタイトルです".repeat(10);
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle={longTitle}
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("特殊文字を含むタイトルでも正しく表示されること", () => {
      const specialTitle = "テスト & <項目> \"削除\" 確認";
      render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle={specialTitle}
        />
      );

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });
  });

  describe("状態変更テスト", () => {
    it("isSubmittingがfalseからtrueに変更されると、ボタンが無効化されること", () => {
      const { rerender } = render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
          isSubmitting={false}
        />
      );

      expect(screen.getByText("削除する")).not.toBeDisabled();

      rerender(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
          isSubmitting={true}
        />
      );

      expect(screen.getByText("削除中...")).toBeDisabled();
    });

    it("isOpenがtrueからfalseに変更されると、ダイアログが閉じられること", () => {
      const { rerender } = render(
        <DeleteConfirmationDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      rerender(
        <DeleteConfirmationDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          itemTitle="テスト項目"
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});