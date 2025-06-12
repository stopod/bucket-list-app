# 認証システム 実装ガイド

## 📋 概要
- **目的**: Supabase Auth を使用したセキュアな認証システムの実装
- **対象読者**: 開発者、セキュリティ担当者
- **前提知識**: React Router v7, TypeScript, Supabase Auth
- **推定作業時間**: 8-12時間

## 🏗 アーキテクチャ

### 設計思想
- **セキュリティファースト**: XSS/CSRF対策を重視
- **SSR対応**: サーバーサイドレンダリングでの認証状態管理
- **型安全性**: TypeScriptによる完全な型保護
- **ユーザビリティ**: シームレスな認証体験

### 主要コンポーネント
- **AuthContext**: 認証状態のグローバル管理
- **AuthGuard**: ルート保護コンポーネント
- **useAuth**: 認証操作用カスタムフック
- **Server-side Auth**: SSR用認証ユーティリティ

### データフロー
```
[ユーザー] → [Login Form] → [AuthContext] → [Supabase Auth]
                ↓                              ↓
        [認証状態更新] ← [JWT Cookie] ← [Session管理]
                ↓
        [Router Protection] → [Protected Routes]
```

## 💻 実装詳細

### 基本実装

#### 1. AuthContext の実装
```typescript
// app/features/auth/lib/auth-context.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase";

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
  error: AuthError | null;
  data?: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
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

#### 2. AuthGuard コンポーネント
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
  fallback = null, 
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
    return <div>Loading...</div>;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

#### 3. サーバーサイド認証
```typescript
// app/lib/auth-server.ts
import { createServerClient } from '@supabase/ssr';
import type { Request } from '@react-router/node';

export async function getServerAuth(request: Request) {
  const supabase = createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const cookies = request.headers.get('Cookie');
          if (!cookies) return undefined;
          
          const cookieValue = cookies
            .split(';')
            .find(c => c.trim().startsWith(`${name}=`))
            ?.split('=')[1];
          
          return cookieValue;
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  
  return {
    user,
    error,
    supabase,
  };
}
```

### 設定手順

#### 1. 環境変数設定
```bash
# .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # サーバーサイド用
```

#### 2. Supabase設定
```typescript
// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/shared/types/database';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

### 高度な実装

#### セキュリティ強化（Cookie使用）
```typescript
// セキュア実装
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',  // PKCE使用
    storage: {
      getItem: (key: string) => {
        // HttpOnly Cookieから取得
        return getCookie(key);
      },
      setItem: (key: string, value: string) => {
        // HttpOnly Cookieに保存
        setCookie(key, value, { 
          httpOnly: true, 
          secure: true, 
          sameSite: 'strict' 
        });
      },
      removeItem: (key: string) => {
        removeCookie(key);
      },
    },
  }
});
```

#### ロール基盤アクセス制御
```typescript
// RoleGuard コンポーネント
interface RoleGuardProps {
  requiredRole: 'admin' | 'user' | 'moderator';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ requiredRole, children, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role;

  if (userRole !== requiredRole) {
    return <>{fallback || <div>権限がありません</div>}</>;
  }

  return <>{children}</>;
}
```

## 🧪 テスト

### テスト戦略
- **ユニットテスト**: AuthContext、useAuth フック
- **統合テスト**: AuthGuard、認証フロー
- **E2Eテスト**: ログイン/ログアウト、認証保護

### サンプルコード
```typescript
// app/features/auth/__tests__/use-auth.test.ts
describe('useAuth', () => {
  it('ログイン情報が正しい場合、認証に成功すること', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    const { signIn } = result.current;
    const response = await signIn('test@example.com', 'password123');

    expect(response.error).toBeNull();
    expect(response.data.user).toBeDefined();
  });

  it('無効なログイン情報の場合、エラーが返されること', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    const { signIn } = result.current;
    const response = await signIn('invalid@example.com', 'wrongpassword');

    expect(response.error).toBeDefined();
    expect(response.error?.message).toContain('Invalid login credentials');
  });
});
```

## 🔧 トラブルシューティング

### よくある問題

#### 問題1: セッションが維持されない
**原因**: localStorage の設定問題やブラウザのプライベートモード
**解決方法**: 
```typescript
// デバッグ用ログ追加
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session);
});
```

#### 問題2: SSRでの認証状態不整合
**原因**: サーバーとクライアントでの認証状態の差異
**解決方法**:
```typescript
// ハイドレーション前の認証状態確認
useEffect(() => {
  const checkAuthState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
  };
  checkAuthState();
}, []);
```

#### 問題3: CORS エラー
**原因**: Supabase プロジェクトの許可ドメイン設定
**解決方法**: Supabase ダッシュボードで許可ドメインを追加

### デバッグ方法
```typescript
// 認証状態デバッグ
export function AuthDebugger() {
  const { user, session, loading } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div style={{ position: 'fixed', bottom: 0, right: 0, background: 'black', color: 'white', padding: '10px' }}>
      <div>Loading: {loading.toString()}</div>
      <div>User: {user?.email || 'none'}</div>
      <div>Session: {session ? 'active' : 'none'}</div>
    </div>
  );
}
```

## 📚 参考資料
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Router v7 Authentication](https://reactrouter.com/en/main/start/tutorial#authentication)
- [OWASP Authentication Guidelines](https://owasp.org/www-project-authentication-cheat-sheet/)

---
**更新履歴**
- 2025-01-11: 初版作成 (Development Team)
- 認証3ファイル統合による包括的ガイド化