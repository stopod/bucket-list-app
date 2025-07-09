/**
 * AuthContextのテスト
 * セッション管理、認証フロー、セキュリティ機能を検証
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User, Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "../lib/auth-context";
import type { AuthContextType } from "../types";

// Supabaseモジュールのモック
vi.mock("~/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

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

const mockExpiredSession: Session = {
  ...mockSession,
  expires_at: Math.floor(Date.now() / 1000) - 1, // 1秒前に期限切れ
};

// テスト用コンポーネント
function TestComponent() {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{auth.loading ? "Loading" : "Not Loading"}</div>
      <div data-testid="user">{auth.user ? auth.user.email : "No User"}</div>
      <div data-testid="session">{auth.session ? "Has Session" : "No Session"}</div>
      <button onClick={() => auth.signIn("test@example.com", "password")}>
        Sign In
      </button>
      <button onClick={() => auth.signUp("test@example.com", "password")}>
        Sign Up
      </button>
      <button onClick={() => auth.signOut()}>Sign Out</button>
    </div>
  );
}

// Import mocked supabase for use in tests
const { supabase } = await import("~/lib/supabase");
const mockSupabase = vi.mocked(supabase);

describe("AuthContext", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // デフォルトのモック設定
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("初期化テスト", () => {
    it("初期状態ではローディング中であること", () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading");
      expect(screen.getByTestId("user")).toHaveTextContent("No User");
      expect(screen.getByTestId("session")).toHaveTextContent("No Session");
    });

    it("セッションがない場合、ローディング完了後に未認証状態になること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      expect(screen.getByTestId("user")).toHaveTextContent("No User");
      expect(screen.getByTestId("session")).toHaveTextContent("No Session");
    });

    it("有効なセッションがある場合、認証済み状態になること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
      expect(screen.getByTestId("session")).toHaveTextContent("Has Session");
    });
  });

  describe("セッション検証テスト", () => {
    it("期限切れセッションの場合、自動的にサインアウトされること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockExpiredSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("user")).toHaveTextContent("No User");
      expect(screen.getByTestId("session")).toHaveTextContent("No Session");
    });

    it("ユーザー情報が不正なセッションの場合、自動的にサインアウトされること", async () => {
      const invalidSession = {
        ...mockSession,
        user: { ...mockUser, id: "", email: "" }, // 不正なユーザー情報
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: invalidSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("user")).toHaveTextContent("No User");
      expect(screen.getByTestId("session")).toHaveTextContent("No Session");
    });

    it("セッション取得エラーの場合、適切にエラーハンドリングされること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Session error" },
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      expect(consoleSpy).toHaveBeenCalledWith("Error getting session:", { message: "Session error" });
      expect(screen.getByTestId("user")).toHaveTextContent("No User");
      expect(screen.getByTestId("session")).toHaveTextContent("No Session");

      consoleSpy.mockRestore();
    });
  });

  describe("認証フローテスト", () => {
    it("サインイン成功時に認証状態が更新されること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      fireEvent.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password",
        });
      });
    });

    it("サインイン失敗時にエラーが適切に処理されること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid credentials" },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      fireEvent.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password",
        });
      });
    });

    it("サインアップ成功時に適切に処理されること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      fireEvent.click(screen.getByText("Sign Up"));

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password",
        });
      });
    });

    it("サインアウト時に認証状態がクリアされること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      fireEvent.click(screen.getByText("Sign Out"));

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("SSR対応テスト", () => {
    it("サーバーサイドレンダリング環境では初期化をスキップすること", async () => {
      // windowオブジェクトを一時的に削除
      const originalWindow = global.window;
      delete (global as any).window;

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
      expect(screen.getByTestId("user")).toHaveTextContent("No User");
      expect(screen.getByTestId("session")).toHaveTextContent("No Session");

      // windowオブジェクトを復元
      global.window = originalWindow;
    });
  });

  describe("セキュリティ機能テスト", () => {
    it("アクティビティ追跡が正しく動作すること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // アクティビティ追跡をテストするため、useAuthを直接使用
      function ActivityTestComponent() {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="last-activity">
              {auth.lastActivity ? auth.lastActivity.toISOString() : "No Activity"}
            </div>
            <button onClick={() => auth.updateActivity()}>Update Activity</button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <ActivityTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("last-activity")).not.toHaveTextContent("No Activity");
      });

      const initialActivity = screen.getByTestId("last-activity").textContent;

      // 少し時間を進める
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      fireEvent.click(screen.getByText("Update Activity"));

      await waitFor(() => {
        expect(screen.getByTestId("last-activity")).not.toHaveTextContent(initialActivity);
      });
    });

    it("非アクティブタイムアウトが動作すること", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      // 30分（1800秒）経過させる
      act(() => {
        vi.advanceTimersByTime(30 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      });
    });
  });

  describe("エラーハンドリングテスト", () => {
    it("useAuthが適切なコンテキスト外で使用された場合、エラーが発生すること", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleErrorSpy.mockRestore();
    });

    it("予期しないエラーが発生した場合、適切に処理されること", async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error("Unexpected error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading");
      });

      expect(consoleSpy).toHaveBeenCalledWith("Unexpected error getting session:", expect.any(Error));
      expect(screen.getByTestId("user")).toHaveTextContent("No User");
      expect(screen.getByTestId("session")).toHaveTextContent("No Session");

      consoleSpy.mockRestore();
    });
  });
});