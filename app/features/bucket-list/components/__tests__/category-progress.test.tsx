import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryProgress } from "../category-progress";
import type { Category, BucketItem } from "~/features/bucket-list/types";

describe("CategoryProgress", () => {
  const mockCategories: Category[] = [
    {
      id: 1,
      name: "Travel",
      color: "blue",
      created_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockItems: BucketItem[] = [
    {
      id: "1",
      title: "Visit Japan",
      description: null,
      profile_id: "user-1",
      category_id: 1,
      priority: "high",
      status: "completed",
      due_date: null,
      due_type: null,
      is_public: false,
      completed_at: "2024-01-01T00:00:00Z",
      completion_comment: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      title: "Visit Paris",
      description: null,
      profile_id: "user-1",
      category_id: 1,
      priority: "medium",
      status: "in_progress",
      due_date: null,
      due_type: null,
      is_public: false,
      completed_at: null,
      completion_comment: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "3",
      title: "Visit London",
      description: null,
      profile_id: "user-1",
      category_id: 1,
      priority: "low",
      status: "not_started",
      due_date: null,
      due_type: null,
      is_public: false,
      completed_at: null,
      completion_comment: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  it("カテゴリと項目データを渡した場合、カテゴリ名と進捗情報が正しく表示されること", () => {
    render(<CategoryProgress categories={mockCategories} items={mockItems} />);

    expect(screen.getByText("カテゴリ別達成状況")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("一部完了項目を含むデータの場合、正しい割合で達成率が表示されること", () => {
    render(<CategoryProgress categories={mockCategories} items={mockItems} />);

    // 1 completed out of 3 items = 33.33%
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("空の項目配列を渡した場合、コンポーネントが非表示となること", () => {
    const result = render(
      <CategoryProgress categories={mockCategories} items={[]} />,
    );

    // Should render nothing when no items
    expect(result.container.firstChild).toBeNull();
  });

  it("全て完了済みの項目データの場合、100%達成と表示されること", () => {
    const allCompletedItems = mockItems.map((item) => ({
      ...item,
      status: "completed" as const,
    }));

    render(
      <CategoryProgress
        categories={mockCategories}
        items={allCompletedItems}
      />,
    );

    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("カテゴリデータを渡した場合、タイトルとカテゴリ名が表示されること", () => {
    render(<CategoryProgress categories={mockCategories} items={mockItems} />);

    expect(screen.getByText("カテゴリ別達成状況")).toBeInTheDocument();
    expect(screen.getAllByText("Travel")).toHaveLength(2); // appears in category name and highlight
  });
});
