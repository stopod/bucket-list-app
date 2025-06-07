import type { Route } from "./+types/instruments";
import { redirect } from "react-router";
import { supabase } from "~/lib/supabase";
import { useAuth } from "~/lib/auth-context";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Instruments" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  // クライアントサイドで認証チェックを行うため、
  // loaderでは認証に関係なくデータを取得を試みる
  // RLSが設定されていれば、認証されていないアクセスは自動的に制限される
  const { data, error } = await supabase.from("instruments").select();

  if (error) {
    console.error("Error:", error);
  }

  return { instruments: data || [], error: error?.message || null };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">認証が必要です</h2>
          <Link to="/login">
            <Button>ログインする</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/">
                <h1 className="text-xl font-semibold">Bucket List App</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <span className="text-gray-700">
                    こんにちは、{user.email}さん
                  </span>
                  <Button onClick={signOut} variant="outline">
                    ログアウト
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">一覧</h1>
              {loaderData.error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  エラー: {loaderData.error}
                </div>
              )}
              {loaderData.instruments.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {loaderData.instruments.map((instrument) => (
                    <li key={instrument.id} className="py-4">
                      <div className="text-lg font-medium text-gray-900">
                        {instrument.name}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">登録されていません。</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
