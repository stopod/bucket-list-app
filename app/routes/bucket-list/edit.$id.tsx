import React, { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { AuthenticatedLayout } from "~/shared/layouts";
import {
  getServerAuth,
  createAuthenticatedSupabaseClient,
} from "~/lib/auth-server";
import { BucketItemForm } from "~/features/bucket-list/components/bucket-item-form";
import type {
  BucketItemFormData,
  BucketItem,
  Category,
} from "~/features/bucket-list/types";
import {
  assertPriority,
  assertStatus,
  assertDueType,
} from "~/features/bucket-list/types";
import { createAuthenticatedBucketListRepository } from "~/features/bucket-list/lib/service-factory";
import { isFailure } from "~/shared/types/result";

export function meta() {
  return [{ title: "やりたいことを編集" }];
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // SSR-compatible authentication check
    const authResult = await getServerAuth(request);

    // 認証されていない場合はリダイレクト
    if (!authResult.isAuthenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const itemId = params.id;
    if (!itemId) {
      throw new Response("Item ID is required", { status: 400 });
    }

    // 関数型Repositoryを直接取得
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(authResult);
    const repository = createAuthenticatedBucketListRepository(
      authenticatedSupabase
    );

    // 関数型Repositoryを直接使用してバケットリスト項目とカテゴリを取得
    const [itemResult, categoriesResult] = await Promise.all([
      repository.findById(itemId),
      repository.findAllCategories(),
    ]);

    if (isFailure(itemResult)) {
      console.error("Item loading failed:", itemResult.error);
      throw new Response("Item not found", { status: 404 });
    }

    if (isFailure(categoriesResult)) {
      console.error("Categories loading failed:", categoriesResult.error);
      throw new Response("カテゴリの取得に失敗しました", { status: 500 });
    }

    const item = itemResult.data;
    const categories = categoriesResult.data;

    // 関数型RepositoryのfindByIdがnullを返す場合がある
    if (!item) {
      throw new Response("Item not found", { status: 404 });
    }

    // 自分のアイテムかチェック
    if (item.profile_id !== authResult.user!.id) {
      throw new Response("Not authorized", { status: 403 });
    }

    return {
      item,
      categories,
      user: authResult.user,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Loader error:", error);
    throw new Response("Server error", { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    // 認証チェック
    const authResult = await getServerAuth(request);

    if (!authResult.isAuthenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    const itemId = params.id;
    if (!itemId) {
      throw new Response("Item ID is required", { status: 400 });
    }

    // フォームデータを解析
    const formData = await request.formData();
    const data: BucketItemFormData = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      category_id: Number(formData.get("category_id")),
      priority: formData.get("priority") as "high" | "medium" | "low",
      status: formData.get("status") as
        | "not_started"
        | "in_progress"
        | "completed",
      due_date: (formData.get("due_date") as string) || undefined,
      due_type: formData.get("due_type") as
        | "specific_date"
        | "this_year"
        | "next_year"
        | "unspecified",
      is_public: formData.get("is_public") === "true",
    };

    // バリデーション
    if (!data.title?.trim()) {
      throw new Response("タイトルは必須です", { status: 400 });
    }

    // 関数型Repositoryを直接取得
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(authResult);
    const repository = createAuthenticatedBucketListRepository(
      authenticatedSupabase
    );

    // 関数型Repositoryを直接使用して既存の項目データを取得してステータス変更を判定
    const existingItemResult = await repository.findById(itemId);
    if (isFailure(existingItemResult)) {
      console.error("Item loading failed:", existingItemResult.error);
      throw new Response("Item not found", { status: 404 });
    }

    const existingItem = existingItemResult.data;

    // 関数型RepositoryのfindByIdがnullを返す場合がある
    if (!existingItem) {
      throw new Response("Item not found", { status: 404 });
    }

    // 自分のアイテムかチェック
    if (existingItem.profile_id !== authResult.user!.id) {
      throw new Response("Not authorized", { status: 403 });
    }

    // ステータスが「completed」に変更され、かつ以前は「completed」でなかった場合
    const isBecomingCompleted =
      data.status === "completed" && existingItem.status !== "completed";

    if (isBecomingCompleted) {
      // 関数型Repositoryでステータスを完了に更新
      const completeResult = await repository.update(itemId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        completion_comment: null,
      });
      if (isFailure(completeResult)) {
        console.error("Item completion failed:", completeResult.error);
        throw new Response("完了設定に失敗しました", { status: 500 });
      }

      // 完了以外のフィールドも更新が必要な場合は追加で更新
      const hasOtherChanges =
        data.title.trim() !== existingItem.title ||
        (data.description?.trim() || null) !== existingItem.description ||
        data.category_id !== existingItem.category_id ||
        data.priority !== existingItem.priority ||
        (data.due_date || null) !== existingItem.due_date ||
        (data.due_type || null) !== existingItem.due_type ||
        data.is_public !== existingItem.is_public;

      if (hasOtherChanges) {
        const updateResult = await repository.update(itemId, {
          title: data.title.trim(),
          description: data.description?.trim() || null,
          category_id: data.category_id,
          priority: data.priority,
          due_date: data.due_date || null,
          due_type: data.due_type || null,
          is_public: data.is_public,
        });
        if (isFailure(updateResult)) {
          console.error("Item update failed:", updateResult.error);
          throw new Response("更新に失敗しました", { status: 500 });
        }
      }
    } else {
      // 通常の更新（ステータス変更が完了以外、または完了→他のステータス変更）
      const updateResult = await repository.update(itemId, {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category_id: data.category_id,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || null,
        due_type: data.due_type || null,
        is_public: data.is_public,
      });
      if (isFailure(updateResult)) {
        console.error("Item update failed:", updateResult.error);
        throw new Response("更新に失敗しました", { status: 500 });
      }
    }

    // 成功時はやりたいこと一覧ページにリダイレクト
    return redirect("/bucket-list");
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Action error:", error);
    throw new Response("保存に失敗しました", { status: 500 });
  }
}

export default function EditBucketItemPage({
  loaderData,
}: {
  loaderData: {
    item: BucketItem;
    categories: Category[];
    user: { id: string; email: string };
  };
}) {
  const { item, categories } = loaderData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (data: BucketItemFormData) => {
    setIsSubmitting(true);

    try {
      // フォームデータを送信
      const form = document.createElement("form");
      form.method = "POST";
      form.style.display = "none";

      // フォームフィールドを作成
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          const input = document.createElement("input");
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Submit error:", error);
      setIsSubmitting(false);
      console.error("送信に失敗しました。もう一度お試しください。");
    }
  };

  const handleCancel = () => {
    window.location.href = "/bucket-list";
  };

  return (
    <AuthenticatedLayout title="やりたいことを編集">
      <div className="container mx-auto px-4 py-8 pb-12 max-w-2xl">
        <BucketItemForm
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          mode="edit"
          isSubmitting={isSubmitting}
          defaultValues={{
            title: item.title,
            description: item.description || undefined,
            category_id: item.category_id,
            priority: assertPriority(item.priority),
            status: assertStatus(item.status),
            due_date: item.due_date || undefined,
            due_type: assertDueType(item.due_type || "unspecified"),
            is_public: item.is_public,
          }}
        />
      </div>
    </AuthenticatedLayout>
  );
}
