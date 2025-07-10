import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../lib/auth-context";
import { Button } from "~/components/ui/button";

interface WithAuthOptions {
  redirectTo?: string;
  showLoadingSpinner?: boolean;
}

export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: WithAuthOptions = {}
) {
  const { redirectTo = "/login", showLoadingSpinner = true } = options;

  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !user) {
        navigate(redirectTo);
      }
    }, [user, loading, navigate]);

    if (loading && showLoadingSpinner) {
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
            <Link to={redirectTo}>
              <Button>ログインする</Button>
            </Link>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// 認証チェック用のカスタムフック
export function useRequireAuth(redirectTo: string = "/login") {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [user, loading, navigate, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
}
