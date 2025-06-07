import type { Route } from "./+types/instruments";
import { supabase } from "~/lib/supabase";
import { withAuth } from "~/lib/with-auth";
import { AuthenticatedLayout } from "~/components/authenticated-layout";

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

function InstrumentsComponent({ loaderData }: Route.ComponentProps) {
  return (
    <AuthenticatedLayout>
      {loaderData.error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          エラー: {loaderData.error}
        </div>
      )}
      {loaderData.instruments.length > 0 ? (
        <div className="max-w-2xl mx-auto px-4">
          <ul className="divide-y divide-gray-200">
            {loaderData.instruments.map((instrument) => (
              <li key={instrument.id} className="py-4">
                <div className="text-lg font-medium text-gray-900">
                  {instrument.name}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500">楽器が登録されていません。</p>
      )}
    </AuthenticatedLayout>
  );
}

export default withAuth(InstrumentsComponent);
