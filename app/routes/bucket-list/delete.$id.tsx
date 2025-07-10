import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import {
  getServerAuth,
  createAuthenticatedSupabaseClient,
} from "~/lib/auth-server";
import { createAuthenticatedBucketListRepository } from "~/features/bucket-list/lib/repository-factory";
import { isFailure } from "~/shared/types/result";

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

    // 関数型Repositoryを直接取得
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(authResult);
    const repository = createAuthenticatedBucketListRepository(
      authenticatedSupabase
    );

    // まず項目が存在し、自分のものかチェック
    const itemResult = await repository.findById(itemId);
    if (isFailure(itemResult)) {
      console.error("Item loading failed:", itemResult.error);
      throw new Response("Item not found", { status: 404 });
    }

    const item = itemResult.data;
    if (!item) {
      throw new Response("Item not found", { status: 404 });
    }

    // 自分のアイテムかチェック
    if (item.profile_id !== authResult.user!.id) {
      throw new Response("Not authorized", { status: 403 });
    }

    // 項目を削除
    const deleteResult = await repository.delete(itemId);
    if (isFailure(deleteResult)) {
      console.error("Delete failed:", deleteResult.error);
      throw new Response("削除に失敗しました", { status: 500 });
    }

    // 成功時はやりたいこと一覧ページにリダイレクト
    return redirect("/bucket-list");
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Delete action error:", error);
    throw new Response("削除に失敗しました", { status: 500 });
  }
}

// このルートはActionのみなので、loaderやcomponentは不要
