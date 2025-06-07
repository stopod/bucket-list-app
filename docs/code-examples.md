# 認証システム コード例集

このドキュメントでは、実際のコードを使用して認証システムの実装パターンを詳しく解説します。

## 目次

1. [基本的な認証フック](#基本的な認証フック)
2. [認証保護パターン](#認証保護パターン)
3. [エラーハンドリング](#エラーハンドリング)
4. [高度な認証機能](#高度な認証機能)
5. [テストの書き方](#テストの書き方)

## 基本的な認証フック

### 1. useAuth フックの詳細実装

```typescript
// app/features/auth/lib/auth-context.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

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
  updateProfile: (updates: UserUpdates) => Promise<AuthResult>;
}

interface AuthResult {
  error: AuthError | null;
  data?: any;
}

interface UserUpdates {
  email?: string;
  password?: string;
  data?: Record<string, any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッション取得
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // 認証状態変化の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // 特定のイベントに対する処理
      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in:', session?.user?.email);
          break;
        case 'SIGNED_OUT':
          console.log('User signed out');
          break;
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed');
          break;
        case 'USER_UPDATED':
          console.log('User updated');
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // サインイン
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }
      
      return { error: null, data };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { 
        error: { 
          message: '予期しないエラーが発生しました', 
          name: 'UnexpectedError',
          status: 500 
        } as AuthError 
      };
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // メール確認後にリダイレクトするURL
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }
      
      return { error: null, data };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { 
        error: { 
          message: '予期しないエラーが発生しました', 
          name: 'UnexpectedError',
          status: 500 
        } as AuthError 
      };
    }
  };

  // パスワードリセット
  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error);
        return { error };
      }
      
      return { error: null, data };
    } catch (error) {
      console.error('Unexpected password reset error:', error);
      return { 
        error: { 
          message: '予期しないエラーが発生しました', 
          name: 'UnexpectedError',
          status: 500 
        } as AuthError 
      };
    }
  };

  // プロフィール更新
  const updateProfile = async (updates: UserUpdates): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.updateUser(updates);
      
      if (error) {
        console.error('Profile update error:', error);
        return { error };
      }
      
      return { error: null, data };
    } catch (error) {
      console.error('Unexpected profile update error:', error);
      return { 
        error: { 
          message: '予期しないエラーが発生しました', 
          name: 'UnexpectedError',
          status: 500 
        } as AuthError 
      };
    }
  };

  // サインアウト
  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
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
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// 認証必須フック
export const useRequireAuth = (redirectTo: string = "/login") => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [user, loading, navigate, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
};
```

## 認証保護パターン

### 1. Higher-Order Component（HOC）パターン

```typescript
// app/features/auth/components/auth-guard.tsx
// 注意: 現在の実装では withAuth HOC は削除され、AuthenticatedLayout を使用
import { ComponentType, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "./auth-context";
import { Button } from "~/components/ui/button";

interface WithAuthOptions {
  redirectTo?: string;
  showLoadingSpinner?: boolean;
  requireEmailVerified?: boolean;
  roles?: string[];
}

export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    redirectTo = "/login",
    showLoadingSpinner = true,
    requireEmailVerified = false,
    roles = [],
  } = options;

  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !user) {
        navigate(redirectTo);
      }
    }, [user, loading, navigate]);

    // ローディング中
    if (loading && showLoadingSpinner) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // 未認証
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">認証が必要です</h2>
            <p className="text-gray-600 mb-4">
              このページにアクセスするにはログインが必要です。
            </p>
            <Link to={redirectTo}>
              <Button>ログインする</Button>
            </Link>
          </div>
        </div>
      );
    }

    // メール確認必須の場合
    if (requireEmailVerified && !user.email_confirmed_at) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">メール確認が必要です</h2>
            <p className="text-gray-600 mb-4">
              送信されたメールからアカウントを有効化してください。
            </p>
            <Button onClick={() => window.location.reload()}>
              確認後、リロード
            </Button>
          </div>
        </div>
      );
    }

    // ロールチェック
    if (roles.length > 0) {
      const userRoles = user.user_metadata?.roles || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">アクセス権限がありません</h2>
              <p className="text-gray-600 mb-4">
                このページにアクセスする権限がありません。
              </p>
              <Link to="/">
                <Button>ホームに戻る</Button>
              </Link>
            </div>
          </div>
        );
      }
    }

    return <Component {...props} />;
  };
}

// 使用例
export default withAuth(MyProtectedComponent, {
  requireEmailVerified: true,
  roles: ['admin', 'editor']
});
```

### 2. ルートガードパターン

```typescript
// app/features/auth/components/route-guard.tsx
// 注意: 現在の実装では SSR ベースの認証チェックを loader で行う
import { useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "./auth-context";

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRoles?: string[];
  fallbackPath?: string;
}

export function RouteGuard({
  children,
  requireAuth = true,
  requiredRoles = [],
  fallbackPath = "/login"
}: RouteGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      // 現在のパスを保存してログイン後にリダイレクト
      navigate(fallbackPath, { 
        state: { from: location.pathname } 
      });
      return;
    }

    if (requiredRoles.length > 0 && user) {
      const userRoles = user.user_metadata?.roles || [];
      const hasRequiredRole = requiredRoles.some(role => 
        userRoles.includes(role)
      );
      
      if (!hasRequiredRole) {
        navigate("/unauthorized");
        return;
      }
    }
  }, [user, loading, navigate, location, requireAuth, requiredRoles, fallbackPath]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}

// 使用例（app/routes.ts）
export default [
  index("routes/home.tsx"),
  route("instruments", "routes/instruments/instruments.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("sample", "routes/sample/sample.tsx"),
] satisfies RouteConfig;

// 各認証必須ページの loader で getServerAuth を使用
// routes/instruments/instruments.tsx
export async function loader({ request }: Route.LoaderArgs) {
  const authResult = await getServerAuth(request);
  if (!authResult.isAuthenticated) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  // データ取得処理...
}
```

## エラーハンドリング

### 1. 認証エラーの分類と処理

```typescript
// app/lib/auth-errors.ts
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  SIGNUP_DISABLED = 'signup_disabled',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  WEAK_PASSWORD = 'weak_password',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

export interface AuthErrorInfo {
  type: AuthErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
}

export function categorizeAuthError(error: any): AuthErrorInfo {
  if (!error) {
    return {
      type: AuthErrorType.UNKNOWN_ERROR,
      message: 'Unknown error',
      userMessage: '不明なエラーが発生しました',
      retryable: true,
    };
  }

  // Supabaseのエラーコードに基づく分類
  switch (error.message) {
    case 'Invalid login credentials':
      return {
        type: AuthErrorType.INVALID_CREDENTIALS,
        message: error.message,
        userMessage: 'メールアドレスまたはパスワードが正しくありません',
        retryable: true,
      };

    case 'Email not confirmed':
      return {
        type: AuthErrorType.EMAIL_NOT_CONFIRMED,
        message: error.message,
        userMessage: 'メールアドレスの確認が完了していません。送信されたメールを確認してください。',
        retryable: false,
      };

    case 'Signup is disabled':
      return {
        type: AuthErrorType.SIGNUP_DISABLED,
        message: error.message,
        userMessage: '現在、新規登録は無効になっています',
        retryable: false,
      };

    case 'User already registered':
      return {
        type: AuthErrorType.EMAIL_ALREADY_EXISTS,
        message: error.message,
        userMessage: 'このメールアドレスは既に登録されています',
        retryable: false,
      };

    default:
      if (error.message.includes('Password')) {
        return {
          type: AuthErrorType.WEAK_PASSWORD,
          message: error.message,
          userMessage: 'パスワードは6文字以上で、英数字を含める必要があります',
          retryable: true,
        };
      }

      if (error.message.includes('rate limit')) {
        return {
          type: AuthErrorType.RATE_LIMIT_EXCEEDED,
          message: error.message,
          userMessage: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
          retryable: true,
        };
      }

      return {
        type: AuthErrorType.UNKNOWN_ERROR,
        message: error.message,
        userMessage: '予期しないエラーが発生しました。しばらく待ってから再試行してください。',
        retryable: true,
      };
  }
}

// エラー表示コンポーネント
export function AuthErrorDisplay({ error }: { error: any }) {
  if (!error) return null;

  const errorInfo = categorizeAuthError(error);

  return (
    <div className={`p-4 rounded-md mb-4 ${
      errorInfo.retryable 
        ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' 
        : 'bg-red-50 border border-red-200 text-red-800'
    }`}>
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium">
            {errorInfo.retryable ? '⚠️ 警告' : '❌ エラー'}
          </h3>
          <div className="mt-2 text-sm">
            <p>{errorInfo.userMessage}</p>
          </div>
          {errorInfo.retryable && (
            <div className="mt-3">
              <button
                type="button"
                className="bg-yellow-100 px-2 py-1 text-xs rounded"
                onClick={() => window.location.reload()}
              >
                再試行
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. リトライ機能付き認証処理

```typescript
// app/lib/auth-retry.ts
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2
  }
): Promise<T> {
  let lastError: any;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 最後の試行の場合はエラーをthrow
      if (attempt === options.maxRetries) {
        throw error;
      }

      // リトライ可能なエラーかチェック
      const errorInfo = categorizeAuthError(error);
      if (!errorInfo.retryable) {
        throw error;
      }

      // 指定した時間待機
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= options.backoffMultiplier;
    }
  }

  throw lastError;
}

// 使用例
export const signInWithRetry = async (email: string, password: string) => {
  return withRetry(
    () => supabase.auth.signInWithPassword({ email, password }),
    { maxRetries: 2, initialDelay: 500, backoffMultiplier: 2 }
  );
};
```

## 高度な認証機能

### 1. ソーシャルログイン

```typescript
// app/lib/social-auth.ts
import { Provider } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const signInWithProvider = async (provider: Provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });

  if (error) {
    console.error(`${provider} login error:`, error);
    throw error;
  }

  return data;
};

// ソーシャルログインボタンコンポーネント
export function SocialLoginButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: Provider) => {
    try {
      setLoading(provider);
      await signInWithProvider(provider);
    } catch (error) {
      console.error('Social login failed:', error);
      // エラーハンドリング
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => handleSocialLogin('google')}
        disabled={loading === 'google'}
        className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
      >
        {loading === 'google' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <GoogleIcon className="w-5 h-5 mr-2" />
            Googleでログイン
          </>
        )}
      </button>

      <button
        onClick={() => handleSocialLogin('github')}
        disabled={loading === 'github'}
        className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
      >
        {loading === 'github' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <GitHubIcon className="w-5 h-5 mr-2" />
            GitHubでログイン
          </>
        )}
      </button>
    </div>
  );
}
```

### 2. 多要素認証（MFA）

```typescript
// app/lib/mfa.ts
export const enableMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator App'
  });

  if (error) {
    throw error;
  }

  return data;
};

export const verifyMFA = async (factorId: string, challengeId: string, code: string) => {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code
  });

  if (error) {
    throw error;
  }

  return data;
};

// MFA設定コンポーネント
export function MFASetup() {
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');

  const handleEnableMFA = async () => {
    try {
      const { qr_code, secret: mfaSecret, id } = await enableMFA();
      setQrCode(qr_code);
      setSecret(mfaSecret);
    } catch (error) {
      console.error('MFA setup failed:', error);
    }
  };

  const handleVerifySetup = async () => {
    try {
      // 実装に応じてfactorIdとchallengeIdを取得
      await verifyMFA(factorId, challengeId, verificationCode);
      // 設定完了処理
    } catch (error) {
      console.error('MFA verification failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={handleEnableMFA}>
        多要素認証を有効にする
      </button>
      
      {qrCode && (
        <div>
          <img src={qrCode} alt="MFA QR Code" />
          <p>認証アプリでQRコードをスキャンしてください</p>
          
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="認証コードを入力"
          />
          
          <button onClick={handleVerifySetup}>
            設定を完了
          </button>
        </div>
      )}
    </div>
  );
}
```

## テストの書き方

### 1. 認証フックのテスト

```typescript
// __tests__/auth-context.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useAuth, AuthProvider } from '../app/lib/auth-context';

// Supabaseのモック
jest.mock('../app/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } }))
    }
  }
}));

describe('useAuth', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態では未認証', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('ログインが成功する', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };
    
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'password');
      expect(response.error).toBeNull();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });

  it('ログインエラーを適切に処理する', async () => {
    const mockError = { message: 'Invalid login credentials' };
    
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: mockError
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'wrong-password');
      expect(response.error).toEqual(mockError);
    });
  });
});
```

### 2. 認証保護コンポーネントのテスト

```typescript
// __tests__/with-auth.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { withAuth } from '../app/lib/with-auth';
import { AuthProvider } from '../app/lib/auth-context';

const TestComponent = () => <div>Protected Content</div>;
const ProtectedComponent = withAuth(TestComponent);

const renderWithAuth = (user: any = null, loading = false) => {
  const mockAuthValue = {
    user,
    session: user ? { user } : null,
    loading,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updateProfile: jest.fn(),
  };

  return render(
    <MemoryRouter>
      <AuthProvider value={mockAuthValue}>
        <ProtectedComponent />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('withAuth HOC', () => {
  it('認証済みユーザーにはコンテンツを表示', () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    renderWithAuth(mockUser);
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('未認証ユーザーにはログイン画面を表示', () => {
    renderWithAuth(null);
    
    expect(screen.getByText('認証が必要です')).toBeInTheDocument();
    expect(screen.getByText('ログインする')).toBeInTheDocument();
  });

  it('ローディング中はスピナーを表示', () => {
    renderWithAuth(null, true);
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });
});
```

### 3. E2Eテスト例

```typescript
// e2e/auth.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('ユーザー登録からログインまで', async ({ page }) => {
    // 新規登録
    await page.goto('/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.fill('[name="confirmPassword"]', 'password123');
    await page.click('button[type="submit"]');

    // 確認メッセージを確認
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=確認メールを送信しました')).toBeVisible();

    // ログイン
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // ログイン成功を確認
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=こんにちは、test@example.comさん')).toBeVisible();
  });

  test('保護されたページへのアクセス', async ({ page }) => {
    // 未認証で保護されたページにアクセス
    await page.goto('/instruments');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');
  });

  test('ログアウト機能', async ({ page, context }) => {
    // ログイン状態を作成（事前にログイン）
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // ログアウト
    await page.click('text=ログアウト');
    
    // ログアウト後の状態確認
    await expect(page.locator('text=ログイン')).toBeVisible();
  });
});
```

これらのコード例を参考に、認証システムの理解を深め、実際のプロジェクトに応用してください。各パターンは段階的に導入することができ、プロジェクトの要件に応じてカスタマイズ可能です。