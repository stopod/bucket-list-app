import type { Route } from "./+types/sample";
import { AuthenticatedLayout } from "~/shared/layouts/authenticated-layout";
import { getServerAuth } from "~/lib/auth-server";

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
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) {
      console.error("Failed to load profiles:", error.message);
      throw new Response("Failed to load profiles", {
        status: 500,
        statusText: error.message,
      });
    }

    return { 
      profiles: profiles || [],
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


export default function SamplePage({ loaderData }: Route.ComponentProps) {
  const { profiles } = loaderData;

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Sample Page</h1>
        <p className="text-gray-600 mb-6">
          This is a sample page for demonstration purposes.
        </p>
        
        {profiles.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Profiles:</h2>
            <ul className="list-disc pl-6">
              {profiles.map((profile) => (
                <li key={profile.id} className="text-sm">
                  ID: {profile.id}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              プロファイルが登録されていません。
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
