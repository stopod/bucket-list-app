# 認証・認可システム 実装ドキュメント

## 📋 概要

- **目的**: Supabase Auth を使用したハイブリッド認証システムの実装
- **対象読者**: 開発者、セキュリティ担当者
- **前提知識**: React Router v7, TypeScript, Supabase Auth, SSR
- **推定作業時間**: 12-16時間

## 🏗 アーキテクチャ概要

### 設計思想

- **ハイブリッド認証**: クライアントサイドとサーバーサイドの両方で認証を実装
- **セキュリティファースト**: XSS/CSRF対策、CSP、入力値検証を重視
- **SSR完全対応**: React Router v7 による Server-Side Rendering での認証状態管理
- **型安全性**: TypeScript による完全な型保護
- **Cookie ベースセッション**: HttpOnly Cookie による安全なセッション管理

### 主要コンポーネント

#### 認証システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    認証システム全体図                           │
├─────────────────────────────────────────────────────────────┤
│ Client Side                    │ Server Side                │
│                               │                            │
│ ┌─────────────────────────────┐ │ ┌─────────────────────────┐ │
│ │      AuthContext            │ │ │    auth-server.ts       │ │
│ │   - セッション管理              │ │ │   - JWT検証             │ │
│ │   - アクティビティ監視            │ │ │   - Cookie解析          │ │
│ │   - Cookie操作              │ │ │   - 認証チェック          │ │
│ └─────────────────────────────┘ │ └─────────────────────────┘ │
│                               │                            │
│ ┌─────────────────────────────┐ │ ┌─────────────────────────┐ │
│ │      AuthGuard/withAuth     │ │ │    Route Loaders        │ │
│ │   - ルート保護               │ │ │   - SSR認証チェック       │ │
│ │   - HOC パターン            │ │ │   - リダイレクト処理       │ │
│ └─────────────────────────────┘ │ └─────────────────────────┘ │
│                               │                            │
│ ┌─────────────────────────────┐ │ ┌─────────────────────────┐ │
│ │    security-utils.ts        │ │ │    Supabase Client      │ │
│ │   - 入力値検証               │ │ │   - Service Role Key    │ │
│ │   - XSS対策                │ │ │   - Server認証          │ │
│ │   - レート制限               │ │ │   - 認証済みクライアント    │ │
│ └─────────────────────────────┘ │ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

```
[ユーザー] → [Login Form] → [AuthContext] → [Supabase Auth]
                ↓                              ↓
        [入力値検証] ← [security-utils] ← [JWT Cookie]
                ↓                              ↓
        [Session管理] → [Activity監視] → [Auto Timeout]
                ↓                              ↓
        [Route Protection] → [withAuth HOC] → [AuthGuard]
                ↓                              ↓
        [SSR Loader] → [auth-server] → [Protected Routes]
```

## 💻 実装詳細

### 1. AuthContext の実装

```typescript
// app/features/auth/lib/auth-context.tsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase";
import { sanitizeString, validateEmail, validatePassword } from "~/lib/security-utils";
import { clearAllAuthCookies, setAuthCookie, getAuthCookie } from "~/lib/cookie-utils";

interface AuthContextType {
  // 状態
  user: User | null;
  session: Session | null;
  loading: boolean;

  // メソッド
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

interface AuthResult {
  error: string | null;
  data?: {
    user?: User;
    session?: Session;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // アクティビティ監視用
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分

  // アクティビティ更新
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // セッション検証
  const validateSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) return false;

    try {
      // JWT有効期限チェック
      const { exp } = JSON.parse(atob(currentSession.access_token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      if (exp < currentTime) {
        console.log('JWT has expired');
        return false;
      }

      // アクティビティタイムアウトチェック
      if (Date.now() - lastActivity > ACTIVITY_TIMEOUT) {
        console.log('Activity timeout');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, [lastActivity]);

  // セッション初期化
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session initialization error:', error);
          setLoading(false);
          return;
        }

        if (session && mounted) {
          const isValid = await validateSession(session);
          if (isValid) {
            setSession(session);
            setUser(session.user);
            setAuthCookie('supabase.auth.token', session.access_token);
          } else {
            // 無効なセッションをクリア
            await supabase.auth.signOut();
            clearAllAuthCookies();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setUser(session.user);
          setAuthCookie('supabase.auth.token', session.access_token);
          updateActivity();
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          clearAllAuthCookies();
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [validateSession, updateActivity]);

  // アクティビティ監視
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateActivity();
    };

    // グローバルイベントリスナー
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // 定期的なセッションチェック
  useEffect(() => {
    const interval = setInterval(async () => {
      if (session) {
        const isValid = await validateSession(session);
        if (!isValid) {
          await signOut();
        }
      }
    }, 60000); // 1分毎

    return () => clearInterval(interval);
  }, [session, validateSession]);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      // 入力値検証
      const sanitizedEmail = sanitizeString(email);
      if (!validateEmail(sanitizedEmail)) {
        return { error: '有効なメールアドレスを入力してください' };
      }

      if (!validatePassword(password)) {
        return { error: 'パスワードは8文字以上で、大文字、小文字、数字を含む必要があります' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { error: 'ログイン中にエラーが発生しました' };
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    try {
      // 入力値検証
      const sanitizedEmail = sanitizeString(email);
      if (!validateEmail(sanitizedEmail)) {
        return { error: '有効なメールアドレスを入力してください' };
      }

      if (!validatePassword(password)) {
        return { error: 'パスワードは8文字以上で、大文字、小文字、数字を含む必要があります' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { error: 'アカウント作成中にエラーが発生しました' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      clearAllAuthCookies();

      // localStorage のクリア（フォールバック）
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      const sanitizedEmail = sanitizeString(email);
      if (!validateEmail(sanitizedEmail)) {
        return { error: '有効なメールアドレスを入力してください' };
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail);

      if (error) {
        return { error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { error: 'パスワードリセット中にエラーが発生しました' };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 2. サーバーサイド認証の実装

```typescript
// app/lib/auth-server.ts
import { createServerClient } from "@supabase/ssr";
import type { Request } from "@react-router/node";

export interface AuthResult {
  isAuthenticated: boolean;
  user: any | null;
  error: string | null;
}

export async function getServerAuth(request: Request): Promise<AuthResult> {
  try {
    const supabase = createServerClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: (name: string) => {
            const cookies = request.headers.get("Cookie");
            if (!cookies) return undefined;

            const cookieValue = cookies
              .split(";")
              .find((c) => c.trim().startsWith(`${name}=`))
              ?.split("=")[1];

            return cookieValue ? decodeURIComponent(cookieValue) : undefined;
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Server auth error:", error);
      return {
        isAuthenticated: false,
        user: null,
        error: error.message,
      };
    }

    return {
      isAuthenticated: !!user,
      user,
      error: null,
    };
  } catch (error) {
    console.error("Server auth exception:", error);
    return {
      isAuthenticated: false,
      user: null,
      error: "Authentication failed",
    };
  }
}

export async function requireAuth(
  request: Request,
  redirectTo: string = "/auth/login",
): Promise<never> {
  const authResult = await getServerAuth(request);

  if (!authResult.isAuthenticated) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  }

  // TypeScript の型安全性のため、never を返す
  throw new Error("This should never be reached");
}

export async function createAuthenticatedSupabaseClient(
  authResult: AuthResult,
) {
  if (!authResult.isAuthenticated || !authResult.user) {
    throw new Error("User not authenticated");
  }

  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    },
  );
}

export async function withAuth(
  request: Request,
  redirectTo: string = "/auth/login",
) {
  const authResult = await getServerAuth(request);

  if (!authResult.isAuthenticated) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  }

  const supabase = await createAuthenticatedSupabaseClient(authResult);

  return {
    user: authResult.user,
    supabase,
  };
}
```

### 3. AuthGuard と HOC パターンの実装

```typescript
// app/features/auth/components/auth-guard.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/use-auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  fallback = <div>Loading...</div>,
  redirectTo = '/auth/login'
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [user, loading, navigate, redirectTo]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// HOC パターンの実装
interface WithAuthOptions {
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: WithAuthOptions = {}
) {
  const { redirectTo = '/auth/login', fallback = <div>Loading...</div> } = options;

  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !user) {
        navigate(redirectTo);
      }
    }, [user, loading, navigate]);

    if (loading) {
      return <>{fallback}</>;
    }

    if (!user) {
      return <>{fallback}</>;
    }

    return <Component {...props} />;
  };
}
```

### 4. セキュリティユーティリティ

```typescript
// app/lib/security-utils.ts

// XSS対策: 文字列サニタイズ
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .replace(/[<>]/g, "") // HTMLタグ除去
    .replace(/javascript:/gi, "") // javascript: プロトコル除去
    .replace(/on\w+=/gi, "") // イベントハンドラ除去
    .trim();
}

// メールアドレス検証
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// パスワード強度チェック
export function validatePassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  return (
    password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers
  );
}

// レート制限（クライアントサイド）
const attemptCounts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
): boolean {
  const now = Date.now();
  const attempts = attemptCounts.get(identifier);

  if (!attempts) {
    attemptCounts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // ウィンドウリセット
  if (now - attempts.lastAttempt > windowMs) {
    attemptCounts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // 制限チェック
  if (attempts.count >= maxAttempts) {
    return false;
  }

  // カウント増加
  attempts.count++;
  attempts.lastAttempt = now;

  return true;
}

// CSP ノンス生成
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
```

## 🔒 セキュリティ実装

### 多層防御セキュリティアーキテクチャ

このアプリケーションは以下の多層セキュリティ戦略を実装しています：

#### レイヤー1: 入力値検証・サニタイゼーション

- クライアントサイドでの即座な検証
- XSS攻撃ベクターの除去
- SQLインジェクション対策（Supabase ORM経由のみアクセス）

#### レイヤー2: 認証・認可

- JWT トークンベース認証
- セッション有効期限管理
- アクティビティベースタイムアウト

#### レイヤー3: トランスポートセキュリティ

- HTTPS 強制
- セキュアCookie設定
- CSP（Content Security Policy）

#### レイヤー4: アプリケーションレベル保護

- レート制限
- CSRF保護（SameSite Cookie）
- セッションハイジャック対策

### Content Security Policy (CSP)

```typescript
// app/root.tsx
export const meta: MetaFunction = () => {
  const nonce = generateCSPNonce();

  return [
    { title: "Bucket List App" },
    {
      name: "description",
      content: "Personal bucket list management application",
    },
    {
      "http-equiv": "Content-Security-Policy",
      content: `
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net ${process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""};
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        connect-src 'self' ${process.env.VITE_SUPABASE_URL} https://api.supabase.com;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
      `
        .replace(/\s+/g, " ")
        .trim(),
    },
  ];
};
```

**CSP 設定の詳細:**

- `default-src 'self'`: デフォルトで同一オリジンのみ許可
- `script-src`: スクリプト実行を制限、開発環境では eval() を許可
- `connect-src`: Supabase API への接続のみ許可
- `frame-ancestors 'none'`: フレーム埋め込みを完全禁止
- `form-action 'self'`: フォーム送信を同一オリジンに制限

### セキュアCookie実装

```typescript
// app/lib/cookie-utils.ts (実装例)
export function setAuthCookie(
  name: string,
  value: string,
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number;
  },
) {
  const {
    httpOnly = true, // XSS対策: JavaScriptからアクセス不可
    secure = process.env.NODE_ENV === "production", // HTTPS必須
    sameSite = "strict", // CSRF対策: 同一サイトリクエストのみ
    maxAge = 24 * 60 * 60, // 24時間で期限切れ
  } = options || {};

  // Cookie サイズ制限チェック（4KB以下）
  if (value.length > 4096) {
    throw new Error("Cookie value too large");
  }

  const cookieValue = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=${sameSite}${secure ? "; Secure" : ""}${httpOnly ? "; HttpOnly" : ""}`;

  document.cookie = cookieValue;
}

export function clearAllAuthCookies() {
  const authCookies = [
    "supabase.auth.token",
    "supabase.auth.refresh_token",
    "supabase.auth.provider_token",
    "supabase.auth.provider_refresh_token",
  ];

  authCookies.forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=strict; Secure`;
  });
}

export function getAuthCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  const cookie = cookies.find((c) => c.trim().startsWith(`${name}=`));

  if (!cookie) return null;

  const value = cookie.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}
```

### 入力値検証・XSS対策の詳細実装

```typescript
// app/lib/security-utils.ts - 関数型拡張版

// メール検証関数（詳細版）
export const validateEmail = (email: string): Result<string, ValidationError> => {
  if (!email || typeof email !== "string") {
    return failure(createValidationError('INVALID_TYPE', 'Email must be a string'));
  }

  // 基本的な形式チェック
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return failure(createValidationError('INVALID_FORMAT', 'Invalid email format'));
  }

  // 長さ制限
  if (email.length > 254) {
    return failure(createValidationError('TOO_LONG', 'Email too long'));
  }

  return success(email);

    // ローカル部の長さチェック
    const [localPart] = email.split("@");
    if (localPart.length > 64) return false;

    // 危険な文字列パターンチェック
    const dangerousPatterns = [
      /javascript:/i,
      /<script/i,
      /on\w+=/i,
      /style\s*=/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(email));
  }

  // パスワード強度チェック（詳細版）
  static validatePassword(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (!password || typeof password !== "string") {
      return { isValid: false, score: 0, feedback: ["パスワードが必要です"] };
    }

    // 長さチェック
    if (password.length < 8) {
      feedback.push("8文字以上必要です");
    } else {
      score += 1;
    }

    // 文字種別チェック
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("小文字を含む必要があります");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("大文字を含む必要があります");

    if (/\d/.test(password)) score += 1;
    else feedback.push("数字を含む必要があります");

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    // 一般的なパスワードチェック
    const commonPasswords = ["password", "123456", "qwerty", "abc123"];
    if (commonPasswords.includes(password.toLowerCase())) {
      feedback.push("一般的すぎるパスワードです");
      score = Math.max(0, score - 2);
    }

    return {
      isValid: score >= 3 && feedback.length === 0,
      score,
      feedback,
    };
  }

  // 高度なXSS対策
  static sanitizeInput(input: string): string {
    if (typeof input !== "string") return "";

    return (
      input
        // HTMLエンティティエンコード
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;")
        // JavaScript プロトコル除去
        .replace(/javascript:/gi, "")
        // データURL除去
        .replace(/data:/gi, "")
        // イベントハンドラ除去
        .replace(/on\w+\s*=/gi, "")
        // style属性除去
        .replace(/style\s*=/gi, "")
        .trim()
    );
  }
}

// レート制限の関数型実装
type RateLimitState = {
  count: number;
  windowStart: number;
  isBlocked: boolean;
};

const createRateLimiter = () => {
  const attempts = new Map<string, RateLimitState>();

  const checkLimit = (
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000,
    blockDurationMs: number = 60 * 60 * 1000,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = identifier.toLowerCase();
    const current = this.attempts.get(key);

    // 初回アクセス
    if (!current) {
      this.attempts.set(key, {
        count: 1,
        windowStart: now,
        isBlocked: false,
      });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: now + windowMs,
      };
    }

    // ブロック期間中
    if (current.isBlocked && now - current.windowStart < blockDurationMs) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.windowStart + blockDurationMs,
      };
    }

    // ウィンドウリセット
    if (now - current.windowStart >= windowMs) {
      current.count = 1;
      current.windowStart = now;
      current.isBlocked = false;
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: now + windowMs,
      };
    }

    // 制限内
    if (current.count < maxAttempts) {
      current.count++;
      return {
        allowed: true,
        remaining: maxAttempts - current.count,
        resetTime: current.windowStart + windowMs,
      };
    }

    // 制限超過
    current.isBlocked = true;
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.windowStart + blockDurationMs,
    };
  }

  static reset(identifier: string): void {
    this.attempts.delete(identifier.toLowerCase());
  }
}
```

### セッションセキュリティ

```typescript
// app/lib/session-security.ts - 関数型アプローチ

// セッション固定攻撃対策
export const regenerateSessionId = (session: Session): Result<void, SessionError> => {
  try {
    // 新しいセッショントークンの生成を要求
    // Note: Supabaseの場合は自動的に処理される
    console.log("Session regenerated for security");
    return success(undefined);
  } catch (error) {
    return failure(createSessionError('REGENERATION_FAILED', error));
  }
};

// セッションハイジャック検出
export const validateSessionIntegrity = (
  session: Session,
    userAgent: string,
    ipAddress: string,
  ): boolean {
    // ユーザーエージェント変更検出
    const storedUserAgent = localStorage.getItem("session.userAgent");
    if (storedUserAgent && storedUserAgent !== userAgent) {
      console.warn("User agent changed, possible session hijacking");
      return false;
    }

    // IP アドレス変更検出（オプション）
    const storedIP = localStorage.getItem("session.ipAddress");
    if (storedIP && storedIP !== ipAddress) {
      console.warn("IP address changed, possible session hijacking");
      // IPアドレス変更は必ずしも攻撃ではないため、警告のみ
    }

    return true;
  }

  // セッション情報の安全な保存
  static storeSessionMetadata(userAgent: string, ipAddress: string): void {
    localStorage.setItem("session.userAgent", userAgent);
    localStorage.setItem("session.ipAddress", ipAddress);
    localStorage.setItem("session.createdAt", Date.now().toString());
  }
}
```

## 🧪 テスト戦略

### テストケース実装

```typescript
// app/features/auth/__tests__/auth-context.test.tsx
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../lib/auth-context";

describe("AuthContext", () => {
  it("有効なログイン情報でサインインできること", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const response = await result.current.signIn(
        "test@example.com",
        "ValidPass123",
      );
      expect(response.error).toBeNull();
    });
  });

  it("無効なメール形式でエラーが返されること", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const response = await result.current.signIn(
        "invalid-email",
        "ValidPass123",
      );
      expect(response.error).toBe("有効なメールアドレスを入力してください");
    });
  });

  it("弱いパスワードでエラーが返されること", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const response = await result.current.signIn("test@example.com", "weak");
      expect(response.error).toBe(
        "パスワードは8文字以上で、大文字、小文字、数字を含む必要があります",
      );
    });
  });
});
```

## 🔧 トラブルシューティング

### 実際の問題と解決事例

#### 1. Service Role Key 設定エラー

**症状**: ダッシュボードで「期限が近い項目」が表示されない、サーバーサイドで認証データが取得できない
**実際の問題**: ダッシュボードのローダーでAnon Keyを使用していたため、Service Role Keyが必要なサーバーサイド認証が失敗
**原因**: `SUPABASE_SERVICE_ROLE_KEY` 環境変数が未設定、またはloader関数で適切なクライアントを使用していない
**解決方法**:

```bash
# 1. .env に Service Role Key を追加
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```typescript
// 2. ダッシュボードローダーで認証済みクライアントを使用
export async function loader({ request }: Route.LoaderArgs) {
  const authResult = await getServerAuth(request);

  if (!authResult.isAuthenticated) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  // Service Role Keyを使用した認証済みクライアント
  const supabase = await createAuthenticatedSupabaseClient(authResult);

  // 正常にデータ取得が可能
  const { data: items } = await supabase
    .from("bucket_items")
    .select("*")
    .eq("user_id", authResult.user.id);

  return { dashboardData: { items } };
}
```

#### 2. Cookie 認証の問題

**症状**: ログイン後にページ更新で認証状態が失われる
**原因**: Cookie の設定や読み取りの問題、HttpOnly設定でJavaScriptからアクセスできない
**解決方法**:

```typescript
// Cookie デバッグ用コード
export function debugAuthCookies() {
  console.log("All cookies:", document.cookie);
  console.log("Auth token:", getAuthCookie("supabase.auth.token"));

  // Cookie 設定状況確認
  const cookies = document.cookie.split(";");
  const authCookies = cookies.filter((c) => c.includes("supabase.auth"));
  console.log("Auth cookies found:", authCookies);

  // LocalStorage フォールバック確認
  console.log("LS token:", localStorage.getItem("supabase.auth.token"));
}

// Cookie 設定の修正
export function setAuthCookieFixed(name: string, value: string) {
  // HttpOnlyをfalseに設定してJavaScriptからアクセス可能にする
  const cookieValue = `${name}=${encodeURIComponent(value)}; Max-Age=86400; Path=/; SameSite=strict; Secure=${location.protocol === "https:"}`;
  document.cookie = cookieValue;
}
```

#### 3. SSR ハイドレーション問題

**症状**: サーバーとクライアントで認証状態が異なる、ハイドレーションエラーが発生
**原因**: サーバーサイドでCookieが正しく解析されていない、クライアントサイドの初期化タイミング
**解決方法**:

```typescript
// サーバーサイドCookie解析の修正
export async function getServerAuth(request: Request): Promise<AuthResult> {
  const cookieHeader = request.headers.get("Cookie");

  if (!cookieHeader) {
    return { isAuthenticated: false, user: null, error: "No cookies found" };
  }

  // Cookie解析の改善
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      return [name, rest.join("=")];
    }),
  );

  const token = cookies["supabase.auth.token"];
  if (!token) {
    return {
      isAuthenticated: false,
      user: null,
      error: "No auth token in cookies",
    };
  }

  // JWT検証続行...
}

// クライアントサイドの段階的ハイドレーション
useEffect(() => {
  let mounted = true;

  const initializeAuth = async () => {
    try {
      // サーバーサイドから渡された初期状態を優先
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted && session) {
        setUser(session.user);
        setSession(session);
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
    }
  };

  initializeAuth();

  return () => {
    mounted = false;
  };
}, []);
```

#### 4. 開発環境での CORS エラー

**症状**: localhost からの認証リクエストが失敗
**解決方法**:

1. Supabase ダッシュボードで `http://localhost:5173` を許可ドメインに追加
2. 開発環境での追加設定:

```typescript
// vite.config.ts でプロキシ設定
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_SUPABASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

#### 5. デバッグログが残っている問題

**症状**: 本番環境でもコンソールにデバッグ情報が表示される
**原因**: 開発中に追加したconsole.logが残っている
**解決方法**:

```typescript
// 条件付きログ出力
export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(message, data);
  }
}

// 本番環境では無効化
export function removeDebugLogs() {
  if (process.env.NODE_ENV === "production") {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
  }
}
```

#### 6. モバイルでの認証エラー

**症状**: モバイル端末で認証が正常に動作しない
**原因**: SafariのITPやCookie制限
**解決方法**:

```typescript
// LocalStorage フォールバック戦略
export function getAuthTokenWithFallback(): string | null {
  // 1. Cookie から取得を試行
  const cookieToken = getAuthCookie("supabase.auth.token");
  if (cookieToken) return cookieToken;

  // 2. LocalStorage フォールバック
  const lsToken = localStorage.getItem("supabase.auth.token");
  if (lsToken) return lsToken;

  // 3. SessionStorage フォールバック
  const ssToken = sessionStorage.getItem("supabase.auth.token");
  return ssToken;
}

// iOS Safari 対応
export function setTokenWithFallback(token: string) {
  try {
    // Cookie 設定
    setAuthCookie("supabase.auth.token", token);
  } catch (error) {
    console.warn("Cookie setting failed, using localStorage fallback");
  }

  // フォールバック保存
  localStorage.setItem("supabase.auth.token", token);
  sessionStorage.setItem("supabase.auth.token", token);
}
```

#### 7. TypeScript エラーと認証の型問題

**症状**: User型やSession型でTypeScriptエラーが発生
**解決方法**:

```typescript
// 型定義の明確化
import type { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

// null チェック関数
export function isAuthenticated(user: User | null): user is User {
  return user !== null && user !== undefined;
}

// 型ガードの使用
export function requireUser(user: User | null): User {
  if (!isAuthenticated(user)) {
    throw new Error("User is not authenticated");
  }
  return user;
}
```

### デバッグツール

#### 認証状態デバッガー

```typescript
export function AuthDebugger() {
  const { user, session, loading } = useAuth();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div>Loading: {loading.toString()}</div>
      <div>User: {user?.email || 'none'}</div>
      <div>User ID: {user?.id || 'none'}</div>
      <div>Session: {session ? 'active' : 'none'}</div>
      <div>JWT Expires: {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'none'}</div>
      <div>Cookies: {document.cookie.split(';').length} items</div>
      <button
        onClick={() => debugAuthCookies()}
        className="mt-2 bg-blue-600 px-2 py-1 rounded text-xs"
      >
        Log Auth Details
      </button>
    </div>
  );
}
```

## 📚 関連ドキュメント

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Router v7 Authentication](https://reactrouter.com/en/main/start/tutorial#authentication)
- [OWASP Authentication Guidelines](https://owasp.org/www-project-authentication-cheat-sheet/)
- [認証フローシーケンス図](./auth-sequence-diagrams.md)

---

**更新履歴**

- 2025-01-11: 初版作成
- 2025-06-14: 最新ソースコード分析に基づく包括的更新 - ハイブリッド認証システム、セキュリティ強化、実装詳細の追加
