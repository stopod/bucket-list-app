import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { useAuth } from "~/lib/auth-context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "bucket-list-app" },
    { name: "description", content: "hello~ ^^" },
  ];
}

export default function Home() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Bucket List App</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700">
                    こんにちは、{user.email}さん
                  </span>
                  <Link to="/instruments">
                    <Button variant="outline">一覧</Button>
                  </Link>
                  <Button onClick={signOut} variant="outline">
                    ログアウト
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline">ログイン</Button>
                  </Link>
                  <Link to="/register">
                    <Button>新規登録</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              ようこそ
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {user ? "ログインしてる" : "ログインしてない"}
            </p>
            {user && (
              <div className="mt-8">
                <Link to="/instruments">
                  <Button size="lg">一覧を見る</Button>
                </Link>

                <Link to="/sample">
                  <Button size="lg">sample</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
