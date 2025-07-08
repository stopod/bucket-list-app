/**
 * ExpandableTextのテスト
 * テキスト展開・折りたたみ機能の検証
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExpandableText, ControlledExpandableText } from "../expandable-text";

describe("ExpandableText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本的な描画テスト", () => {
    it("短いテキストの場合、省略されずに表示されること", () => {
      const shortText = "短いテキストです";
      render(<ExpandableText text={shortText} maxLength={100} />);

      expect(screen.getByText(shortText)).toBeInTheDocument();
      expect(screen.queryByText("続きを読む")).not.toBeInTheDocument();
      expect(screen.queryByText("...")).not.toBeInTheDocument();
    });

    it("長いテキストの場合、省略されて表示されること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(<ExpandableText text={longText} maxLength={50} />);

      expect(screen.getByText("続きを読む")).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();
      
      // 最初の50文字だけが表示される
      const displayedText = screen.getByText((content) => 
        content.includes(longText.slice(0, 50))
      );
      expect(displayedText).toBeInTheDocument();
    });

    it("デフォルトの最大文字数が適用されること", () => {
      const mediumText = "a".repeat(150); // 150文字
      render(<ExpandableText text={mediumText} />);

      expect(screen.getByText("続きを読む")).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();
    });
  });

  describe("展開・折りたたみ機能テスト", () => {
    it("「続きを読む」ボタンをクリックするとテキストが展開されること", async () => {
      const user = userEvent.setup();
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(<ExpandableText text={longText} maxLength={50} />);

      // 初期状態では省略されている
      expect(screen.getByText("続きを読む")).toBeInTheDocument();

      // 「続きを読む」をクリック
      await user.click(screen.getByText("続きを読む"));

      // 全文が表示される
      expect(screen.getByText("折りたたむ")).toBeInTheDocument();
      expect(screen.queryByText("...")).not.toBeInTheDocument();
      
      // 全文が含まれていることを確認
      expect(screen.getByText((content) => 
        content.includes(longText)
      )).toBeInTheDocument();
    });

    it("「折りたたむ」ボタンをクリックするとテキストが省略されること", async () => {
      const user = userEvent.setup();
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(<ExpandableText text={longText} maxLength={50} />);

      // 展開
      await user.click(screen.getByText("続きを読む"));
      expect(screen.getByText("折りたたむ")).toBeInTheDocument();

      // 折りたたみ
      await user.click(screen.getByText("折りたたむ"));
      expect(screen.getByText("続きを読む")).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("複数回の展開・折りたたみが正しく動作すること", async () => {
      const user = userEvent.setup();
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(<ExpandableText text={longText} maxLength={50} />);

      // 初期状態
      expect(screen.getByText("続きを読む")).toBeInTheDocument();

      // 展開
      await user.click(screen.getByText("続きを読む"));
      expect(screen.getByText("折りたたむ")).toBeInTheDocument();

      // 折りたたみ
      await user.click(screen.getByText("折りたたむ"));
      expect(screen.getByText("続きを読む")).toBeInTheDocument();

      // 再度展開
      await user.click(screen.getByText("続きを読む"));
      expect(screen.getByText("折りたたむ")).toBeInTheDocument();
    });
  });

  describe("カスタマイズオプションテスト", () => {
    it("カスタムmaxLengthが適用されること", () => {
      const text = "0123456789"; // 10文字
      render(<ExpandableText text={text} maxLength={5} />);

      expect(screen.getByText("続きを読む")).toBeInTheDocument();
      expect(screen.getByText("01234")).toBeInTheDocument();
    });

    it("カスタムclassNameが適用されること", () => {
      const text = "テストテキスト";
      render(<ExpandableText text={text} className="custom-class" />);

      const textElement = screen.getByText(text);
      expect(textElement).toHaveClass("custom-class");
    });

    it("shortTextClassNameが短いテキストに適用されること", () => {
      const text = "短いテキスト";
      render(
        <ExpandableText 
          text={text} 
          maxLength={100} 
          shortTextClassName="short-text-class"
        />
      );

      const textElement = screen.getByText(text);
      expect(textElement).toHaveClass("short-text-class");
    });

    it("buttonClassNameがボタンに適用されること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(
        <ExpandableText 
          text={longText} 
          maxLength={50} 
          buttonClassName="custom-button-class"
        />
      );

      const button = screen.getByText("続きを読む");
      expect(button).toHaveClass("custom-button-class");
    });
  });

  describe("エッジケーステスト", () => {
    it("空文字列の場合、正しく表示されること", () => {
      render(<ExpandableText text="" maxLength={100} />);

      // 空文字列は要素が存在するが、テキストが見えない状態
      const textElement = screen.getByText((content, element) => {
        return element?.textContent === "";
      });
      expect(textElement).toBeInTheDocument();
      expect(screen.queryByText("続きを読む")).not.toBeInTheDocument();
    });

    it("maxLengthが0の場合、正しく動作すること", () => {
      const text = "テストテキスト";
      render(<ExpandableText text={text} maxLength={0} />);

      expect(screen.getByText("続きを読む")).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("maxLengthがテキスト長と同じ場合、省略されないこと", () => {
      const text = "テストテキスト";
      render(<ExpandableText text={text} maxLength={text.length} />);

      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.queryByText("続きを読む")).not.toBeInTheDocument();
    });

    it("特殊文字を含むテキストが正しく処理されること", () => {
      const text = "テスト & <タグ> \"引用\" 'アポストロフィ'";
      render(<ExpandableText text={text} maxLength={100} />);

      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });
});

describe("ControlledExpandableText", () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本的な描画テスト", () => {
    it("短いテキストの場合、省略されずに表示されること", () => {
      const shortText = "短いテキストです";
      render(
        <ControlledExpandableText
          text={shortText}
          isExpanded={false}
          onToggle={mockOnToggle}
          maxLength={100}
        />
      );

      expect(screen.getByText(shortText)).toBeInTheDocument();
      expect(screen.queryByText("続きを読む")).not.toBeInTheDocument();
    });

    it("長いテキストが折りたたまれて表示されること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(
        <ControlledExpandableText
          text={longText}
          isExpanded={false}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      expect(screen.getByText("続きを読む")).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("長いテキストが展開されて表示されること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(
        <ControlledExpandableText
          text={longText}
          isExpanded={true}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      expect(screen.getByText("折りたたむ")).toBeInTheDocument();
      expect(screen.queryByText("...")).not.toBeInTheDocument();
      expect(screen.getByText((content) => 
        content.includes(longText)
      )).toBeInTheDocument();
    });
  });

  describe("外部制御テスト", () => {
    it("ボタンクリック時に外部コールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(
        <ControlledExpandableText
          text={longText}
          isExpanded={false}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      await user.click(screen.getByText("続きを読む"));

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it("展開状態でのボタンクリック時に外部コールバックが呼ばれること", async () => {
      const user = userEvent.setup();
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(
        <ControlledExpandableText
          text={longText}
          isExpanded={true}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      await user.click(screen.getByText("折りたたむ"));

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it("isExpandedプロパティの変更に応じて表示が切り替わること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      const { rerender } = render(
        <ControlledExpandableText
          text={longText}
          isExpanded={false}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      // 初期状態（折りたたみ）
      expect(screen.getByText("続きを読む")).toBeInTheDocument();

      // 展開状態に変更
      rerender(
        <ControlledExpandableText
          text={longText}
          isExpanded={true}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      expect(screen.getByText("折りたたむ")).toBeInTheDocument();
      expect(screen.queryByText("...")).not.toBeInTheDocument();
    });
  });

  describe("カスタマイズオプションテスト", () => {
    it("カスタムスタイルが適用されること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(
        <ControlledExpandableText
          text={longText}
          isExpanded={false}
          onToggle={mockOnToggle}
          maxLength={50}
          className="custom-text-class"
          buttonClassName="custom-button-class"
        />
      );

      const textElement = screen.getByText((content) => 
        content.includes(longText.slice(0, 50))
      );
      expect(textElement).toHaveClass("custom-text-class");

      const button = screen.getByText("続きを読む");
      expect(button).toHaveClass("custom-button-class");
    });
  });

  describe("アクセシビリティテスト", () => {
    it("ボタンが適切な要素で表示されること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      render(
        <ControlledExpandableText
          text={longText}
          isExpanded={false}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      const button = screen.getByText("続きを読む");
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    it("展開・折りたたみ状態がボタンテキストで明確に示されること", () => {
      const longText = "これは非常に長いテキストです。".repeat(10);
      const { rerender } = render(
        <ControlledExpandableText
          text={longText}
          isExpanded={false}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      // 折りたたみ状態
      expect(screen.getByText("続きを読む")).toBeInTheDocument();

      // 展開状態
      rerender(
        <ControlledExpandableText
          text={longText}
          isExpanded={true}
          onToggle={mockOnToggle}
          maxLength={50}
        />
      );

      expect(screen.getByText("折りたたむ")).toBeInTheDocument();
    });
  });
});