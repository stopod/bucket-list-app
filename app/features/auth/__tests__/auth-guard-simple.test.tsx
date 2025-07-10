/**
 * AuthGuardのシンプルテスト
 * ルート保護、認証チェック、リダイレクト機能を検証
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router";
import { withAuth, useRequireAuth } from "../components/auth-guard";
import { AuthProvider } from "../lib/auth-context";
import type { User, Session } from "@supabase/supabase-js";

// React Routerのモック
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// モックユーザーデータ
const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2023-01-01T00:00:00Z",
  phone_confirmed_at: "2023-01-01T00:00:00Z",
  confirmed_at: "2023-01-01T00:00:00Z",
  last_sign_in_at: "2023-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
};

const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

// テスト用コンポーネント
function DummyComponent({ title = "Protected Content" }: { title?: string }) {
  return <div data-testid="protected-content">{title}</div>;
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );
}

describe("AuthGuard - Simple Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    const { supabase } = await import("~/lib/supabase");
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback) => {
        return {
          data: {
            subscription: {
              id: "test-subscription",
              callback: callback,
              unsubscribe: vi.fn(),
            },
          },
        };
      }
    );
  });

  describe("withAuth HOC", () => {
    it("認証済みユーザーの場合、コンポーネントが正常に表示されること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const AuthenticatedComponent = withAuth(DummyComponent);

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
        expect(screen.getByTestId("protected-content")).toHaveTextContent(
          "Protected Content"
        );
      });
    });

    it("未認証ユーザーの場合、リダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const AuthenticatedComponent = withAuth(DummyComponent);

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      // ローディング完了後、リダイレクトされる
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    it("カスタムリダイレクト先が指定された場合、その場所にリダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const AuthenticatedComponent = withAuth(DummyComponent, {
        redirectTo: "/custom-login",
      });

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/custom-login");
      });
    });
  });

  describe("useRequireAuth Hook", () => {
    function RequireAuthTestComponent() {
      const { user, loading, isAuthenticated } = useRequireAuth();

      return (
        <div>
          <div data-testid="loading">{loading ? "Loading" : "Not Loading"}</div>
          <div data-testid="authenticated">
            {isAuthenticated ? "Authenticated" : "Not Authenticated"}
          </div>
          <div data-testid="user">{user ? user.email : "No User"}</div>
        </div>
      );
    }

    it("認証済みユーザーの場合、正しい値が返されること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <TestWrapper>
          <RequireAuthTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "Authenticated"
        );
        expect(screen.getByTestId("user")).toHaveTextContent(
          "test@example.com"
        );
      });
    });

    it("未認証ユーザーの場合、リダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <TestWrapper>
          <RequireAuthTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });
  });
});
