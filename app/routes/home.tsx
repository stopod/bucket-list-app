import { useState } from "react";
import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/features/auth";
import { AppLayout } from "~/shared/layouts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "bucket-list-app" },
    { name: "description", content: "hello~ ^^" },
  ];
}

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>読み込み中...</div>
      </div>
    );
  }

  const navigationContent = user ? (
    <>
      <span className="text-gray-700">
        こんにちは、{user.email}さん
      </span>
      <Link to="/instruments">
        <Button variant="outline">一覧</Button>
      </Link>
      <Button
        onClick={handleSignOut}
        variant="outline"
        disabled={isSigningOut}
      >
        {isSigningOut ? "ログアウト中..." : "ログアウト"}
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
  );

  return (
    <AppLayout showNavigation={true} navigationContent={navigationContent}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              ようこそ
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {user ? "ログインしてる" : "ログインしてない"}
            </p>
            {user && (
              <div className="mt-8 space-x-4">
                <Link to="/instruments">
                  <Button size="lg">一覧を見る</Button>
                </Link>
                <Link to="/sample">
                  <Button size="lg" variant="outline">Sample</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
