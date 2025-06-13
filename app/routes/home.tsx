import { useState } from "react";
import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Button, MobileMenu } from "~/components/ui";
import { useAuth } from "~/features/auth";
import { AppLayout } from "~/shared/layouts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "人生でやりたいことリスト" },
    { name: "description", content: "あなたの夢や目標を管理するやりたいことリストアプリ" },
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
    <MobileMenu
      user={user}
      onSignOut={handleSignOut}
      isSigningOut={isSigningOut}
    />
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
              人生でやりたいことリスト
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {user ? "あなたの夢や目標を管理しましょう" : "ログインして始めましょう"}
            </p>
            {user && (
              <div className="mt-8 space-x-4">
                <Link to="/dashboard">
                  <Button size="lg">ダッシュボードを見る</Button>
                </Link>
                <Link to="/bucket-list">
                  <Button size="lg" variant="outline">やりたいこと一覧</Button>
                </Link>
                <Link to="/public">
                  <Button size="lg" variant="outline">みんなのやりたいこと</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
