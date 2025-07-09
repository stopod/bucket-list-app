/**
 * AuthGuardのテスト
 * ルート保護、認証チェック、リダイレクト機能を検証
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Supabaseモックはtest-setup.tsで設定済み

// モックユーザーデータ
const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2023-01-01T00:00:00Z",
  phone_confirmed_at: null,
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

// useRequireAuthフックのテスト用コンポーネント
function RequireAuthTestComponent() {
  const { user, loading, isAuthenticated } = useRequireAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? "Loading" : "Not Loading"}</div>
      <div data-testid="authenticated">{isAuthenticated ? "Authenticated" : "Not Authenticated"}</div>
      <div data-testid="user">{user ? user.email : "No User"}</div>
    </div>
  );
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("AuthGuard", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // デフォルトのモック設定
    const { supabase } = await import("~/lib/supabase");
      const { supabase } = await import("~/lib/supabase");
    vi.mocked(vi.mocked(supabase.auth.)onAuthStateChange).mockImplementation((callback) => {
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
  });

  describe("withAuth HOC", () => {
    it("認証済みユーザーの場合、コンポーネントが正常に表示されること", async () => {
      const { supabase } = await import("~/lib/supabase");
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(vi.mocked(supabase.auth.)getSession).mockResolvedValue({
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
        expect(screen.getByTestId("protected-content")).toHaveTextContent("Protected Content");
      });
    });

    it("未認証ユーザーの場合、ローディング後にリダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(vi.mocked(supabase.auth.)getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const AuthenticatedComponent = withAuth(DummyComponent);

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      // 初期状態ではローディング表示
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();

      // ローディング完了後、リダイレクトされる
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    it("カスタムリダイレクト先が指定された場合、その場所にリダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
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

    it("ローディングスピナーを無効にした場合、ローディング表示されないこと", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockImplementation(() => 
        new Promise(() => {}) // 永続的にローディング状態
      );

      const AuthenticatedComponent = withAuth(DummyComponent, {
        showLoadingSpinner: false,
      });

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      // ローディングスピナーが表示されないことを確認
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    it("未認証状態で非表示モードの場合、ログインリンクが表示されること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const AuthenticatedComponent = withAuth(DummyComponent, {
        showLoadingSpinner: false,
      });

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("認証が必要です")).toBeInTheDocument();
        expect(screen.getByText("ログインする")).toBeInTheDocument();
      });
    });

    it("プロパティが正しく渡されること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const AuthenticatedComponent = withAuth(DummyComponent);

      render(
        <TestWrapper>
          <AuthenticatedComponent title="Custom Title" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toHaveTextContent("Custom Title");
      });
    });
  });

  describe("useRequireAuth Hook", () => {
    it("認証済みユーザーの場合、正しい値が返されること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
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
        expect(screen.getByTestId("authenticated")).toHaveTextContent("Authenticated");
        expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
      });
    });

    it("未認証ユーザーの場合、リダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
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

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
        expect(screen.getByTestId("authenticated")).toHaveTextContent("Not Authenticated");
        expect(screen.getByTestId("user")).toHaveTextContent("No User");
      });
    });

    it("カスタムリダイレクト先が指定された場合、その場所にリダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      function CustomRedirectComponent() {
        const auth = useRequireAuth("/custom-auth");
        return <div data-testid="custom-redirect">Custom Component</div>;
      }

      render(
        <TestWrapper>
          <CustomRedirectComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/custom-auth");
      });
    });

    it("ローディング中は正しい状態が返されること", () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockImplementation(() => 
        new Promise(() => {}) // 永続的にローディング状態
      );

      render(
        <TestWrapper>
          <RequireAuthTestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading");
      expect(screen.getByTestId("authenticated")).toHaveTextContent("Not Authenticated");
      expect(screen.getByTestId("user")).toHaveTextContent("No User");
    });
  });

  describe("認証状態変更テスト", () => {
    it("認証状態がログイン済みから未認証に変わった場合、リダイレクトされること", async () => {
      // 最初は認証済み
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const AuthenticatedComponent = withAuth(DummyComponent);

      const { rerender } = render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      // セッションが無効になった場合をシミュレート
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // 認証コンテキストの状態を変更するため再レンダー
      rerender(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      // リダイレクトが発生することを確認
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("エッジケーステスト", () => {
    it("セッション取得エラーの場合、リダイレクトされること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Session error" },
      });

      const AuthenticatedComponent = withAuth(DummyComponent);

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    it("予期しないエラーが発生した場合、適切に処理されること", async () => {
      const { supabase } = await import("~/lib/supabase");
      vi.mocked(supabase.auth.)getSession.mockRejectedValue(new Error("Unexpected error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const AuthenticatedComponent = withAuth(DummyComponent);

      render(
        <TestWrapper>
          <AuthenticatedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });

      consoleSpy.mockRestore();
    });
  });
});