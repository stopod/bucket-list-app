import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/features/auth";
import { Button, MobileMenu } from "~/components/ui";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AuthenticatedLayout({
  children,
  title,
}: AuthenticatedLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  // クライアントサイドマウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  // サーバーサイドで認証チェック済みなので、クライアントサイドリダイレクトは不要
  // useEffect(() => {
  //   if (mounted && !loading && !user) {
  //     console.log("🚪 No user detected, redirecting to login");
  //     navigate("/login");
  //   }
  // }, [mounted, user, loading, navigate]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      // ログアウト成功後、ログインページにリダイレクト
      navigate("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // SSR時やマウント前は何も表示しない
  if (!mounted) {
    return null;
  }

  // サーバーサイドで認証済みなので、loading状態でもページを表示
  // ただし、ナビゲーションバーにはローディング表示を使用

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* ロゴ・タイトル */}
            <div className="flex items-center">
              <Link to="/">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors">
                  人生でやりたいこと
                </h1>
              </Link>
            </div>

            {/* デスクトップナビゲーション */}
            <div className="hidden md:flex items-center space-x-4">
              {/* ユーザー情報（デスクトップのみ） */}
              <div className="text-sm text-gray-700">
                {loading ? (
                  <span className="text-gray-500">読み込み中...</span>
                ) : user ? (
                  <span className="max-w-48 truncate">
                    こんにちは、{user.email}さん
                  </span>
                ) : (
                  <span className="text-gray-500">認証情報を取得中...</span>
                )}
              </div>
              
              {/* ナビゲーションボタン */}
              <Link to="/dashboard">
                <Button variant="outline" size="sm">
                  ダッシュボード
                </Button>
              </Link>
              <Link to="/bucket-list">
                <Button variant="outline" size="sm">
                  やりたいこと一覧
                </Button>
              </Link>
              <Link to="/public">
                <Button variant="outline" size="sm">
                  みんなのやりたいこと
                </Button>
              </Link>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                disabled={isSigningOut || loading}
              >
                {isSigningOut ? "ログアウト中..." : "ログアウト"}
              </Button>
            </div>

            {/* モバイルナビゲーション */}
            <div className="md:hidden flex items-center">
              <MobileMenu
                user={user}
                onSignOut={handleSignOut}
                isSigningOut={isSigningOut || loading}
              />
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
