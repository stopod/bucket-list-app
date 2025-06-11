import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { AuthenticatedLayout } from "~/shared/layouts";
import { getServerAuth, createAuthenticatedSupabaseClient } from "~/lib/auth-server";
import { createAuthenticatedBucketListService } from "~/features/bucket-list/lib/repository-factory";
import { BucketItemForm } from "~/features/bucket-list/components/bucket-item-form";
import type { BucketItemFormData, BucketItem } from "~/features/bucket-list/types";
import { assertPriority, assertStatus, assertDueType } from "~/features/bucket-list/types";

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

    // 認証済みクライアントでデータを取得
    const authenticatedSupabase = await createAuthenticatedSupabaseClient(authResult);
    const bucketListService = createAuthenticatedBucketListService(authenticatedSupabase);
    
    // バケットリスト項目とカテゴリを取得
    const [item, categories] = await Promise.all([
      bucketListService.getBucketItemById(itemId),
      bucketListService.getCategories()
    ]);

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
      user: authResult.user
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
      description: formData.get("description") as string || undefined,
      category_id: Number(formData.get("category_id")),
      priority: formData.get("priority") as "high" | "medium" | "low",
      status: formData.get("status") as "not_started" | "in_progress" | "completed",
      due_date: formData.get("due_date") as string || undefined,
      due_type: formData.get("due_type") as "specific_date" | "this_year" | "next_year" | "unspecified",
      is_public: formData.get("is_public") === "true",
    };

    // バリデーション
    if (!data.title?.trim()) {
      throw new Response("タイトルは必須です", { status: 400 });
    }

    // 認証済みクライアントでデータを更新
    const authenticatedSupabase = await createAuthenticatedSupabaseClient(authResult);
    const bucketListService = createAuthenticatedBucketListService(authenticatedSupabase);
    
    // 項目を更新
    await bucketListService.updateBucketItem(itemId, {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category_id: data.category_id,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date || null,
      due_type: data.due_type || null,
      is_public: data.is_public,
    });

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
  loaderData 
}: { 
  loaderData: { 
    item: BucketItem; 
    categories: any[]; 
    user: any 
  } 
}) {
  const { item, categories } = loaderData;

  const handleSubmit = (data: BucketItemFormData) => {
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
  };

  const handleCancel = () => {
    window.location.href = "/bucket-list";
  };

  return (
    <AuthenticatedLayout title="やりたいことを編集">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <BucketItemForm
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          mode="edit"
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