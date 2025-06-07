import type { Route } from "./+types/instruments";
import { AuthenticatedLayout } from "~/shared/layouts";
import { getServerAuth } from "~/lib/auth-server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Instruments" }];
}

export async function loader({ request }: Route.LoaderArgs) {
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

    // 基本Supabaseクライアントでデータ取得
    const { supabase } = await import("~/lib/supabase");
    const { data: instruments, error } = await supabase
      .from("instruments")
      .select("*");

    if (error) {
      console.error("Failed to load instruments:", error.message);
      throw new Response("Failed to load instruments", {
        status: 500,
        statusText: error.message,
      });
    }

    return {
      instruments: instruments || [],
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

export default function InstrumentsPage({ loaderData }: Route.ComponentProps) {
  const { instruments } = loaderData;

  return (
    <AuthenticatedLayout title="楽器一覧">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">楽器一覧</h1>

        {instruments.length > 0 ? (
          <div className="max-w-2xl mx-auto">
            <p className="mb-4 text-green-600">
              ✅ データ取得成功！{instruments.length}件の楽器が見つかりました。
            </p>
            <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow">
              {instruments.map((instrument) => (
                <li key={instrument.id} className="p-4 hover:bg-gray-50">
                  <div className="text-lg font-medium text-gray-900">
                    {instrument.name} (ID: {instrument.id})
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              楽器が登録されていません。
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
