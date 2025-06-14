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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* ロゴ・タイトル */}
            <div className="flex items-center">
              <Link to="/">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors">
                  死ぬまでにやること
                </h1>
              </Link>
            </div>

            {/* ハンバーガーメニュー（全画面サイズ対応） */}
            <div className="flex items-center">
              <MobileMenu
                user={user}
                onSignOut={handleSignOut}
                isSigningOut={isSigningOut || loading}
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>
      
      {/* フッター */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>
              © 2025 stopod. Licensed under{" "}
              <a 
                href="https://opensource.org/licenses/MIT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                MIT License
              </a>
              {" "}| 本ソフトウェアは「AS IS」で提供され、一切の保証はありません
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
