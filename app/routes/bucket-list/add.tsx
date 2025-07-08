import React, { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { AuthenticatedLayout } from "~/shared/layouts";
import { getServerAuth } from "~/lib/auth-server";
import { createAuthenticatedSupabaseClient } from "~/lib/auth-server";
import { BucketItemForm } from "~/features/bucket-list/components/bucket-item-form";
import type { BucketItemFormData } from "~/features/bucket-list/types";
import { createAuthenticatedBucketListService } from "~/features/bucket-list/lib/repository-factory";
import { getCategories, createBucketItem } from "~/features/bucket-list/services/functional-bucket-list-service";
import { isSuccess, isFailure } from "~/shared/types/result";

export function meta() {
  return [{ title: "やりたいことを追加" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
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

    // 認証済みクライアントでカテゴリ一覧を取得
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(authResult);
    const bucketListService = createAuthenticatedBucketListService(
      authenticatedSupabase,
    );
    const repository = bucketListService.getRepository();

    // 関数型サービスを使用してカテゴリを取得
    const categoriesResult = await getCategories(repository)();
    
    if (isFailure(categoriesResult)) {
      console.error("Categories loading failed:", categoriesResult.error);
      throw new Response("カテゴリの取得に失敗しました", { status: 500 });
    }

    const categories = categoriesResult.data;
    console.log("Categories loaded:", categories.length);
    console.log("User ID:", authResult.user?.id);

    return {
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

export async function action({ request }: ActionFunctionArgs) {
  try {
    // 認証チェック
    const authResult = await getServerAuth(request);

    if (!authResult.isAuthenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // フォームデータを解析
    const formData = await request.formData();
    const data: BucketItemFormData = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      category_id: Number(formData.get("category_id")),
      priority: formData.get("priority") as "high" | "medium" | "low",
      status:
        (formData.get("status") as
          | "not_started"
          | "in_progress"
          | "completed") || "not_started",
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

    // 認証済みクライアントでデータを保存
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(authResult);
    const bucketListService = createAuthenticatedBucketListService(
      authenticatedSupabase,
    );
    const repository = bucketListService.getRepository();

    // 関数型サービスを使用して新しい項目を作成
    const createResult = await createBucketItem(repository)({
      profile_id: authResult.user!.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category_id: data.category_id,
      priority: data.priority,
      status: data.status || "not_started",
      due_date: data.due_date || null,
      due_type: data.due_type || null,
      is_public: data.is_public,
    });

    if (isFailure(createResult)) {
      console.error("Bucket item creation failed:", createResult.error);
      throw new Response("項目の作成に失敗しました", { status: 500 });
    }

    console.log("Bucket item created successfully");

    // 成功時はやりたいこと一覧ページにリダイレクト
    return redirect("/bucket-list");
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Action error details:", error);
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack",
    );
    throw new Response("保存に失敗しました", { status: 500 });
  }
}

export default function AddBucketItemPage({
  loaderData,
}: {
  loaderData: { categories: any[]; user: any };
}) {
  const { categories } = loaderData;
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
      alert("送信に失敗しました。もう一度お試しください。");
    }
  };

  const handleCancel = () => {
    window.location.href = "/bucket-list";
  };

  return (
    <AuthenticatedLayout title="やりたいことを追加">
      <div className="container mx-auto px-4 py-8 pb-12 max-w-2xl">
        <BucketItemForm
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          mode="create"
          isSubmitting={isSubmitting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
