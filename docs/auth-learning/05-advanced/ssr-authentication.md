# SSR認証

## 🎯 学習目標

- Server-Side Rendering環境での認証の課題を理解する
- React Router v7でのSSR認証実装を詳細に学ぶ
- ハイドレーション時の状態管理とセキュリティを理解する
- SEOとセキュリティを両立する方法を知る
- バケットリストアプリでの実装を詳細に分析する

## 🖥️ SSR認証とは

### 📝 基本概念

**SSR認証** は、サーバーサイドでページをレンダリングする際に、認証状態を適切に処理し、クライアントに安全に引き継ぐ仕組みです。

```mermaid
sequenceDiagram
    participant B as 🌐 ブラウザ
    participant S as 🖥️ SSRサーバー
    participant A as 🔐 認証API
    participant D as 💾 データベース

    Note over B,D: SSR認証の流れ
    B->>S: ページリクエスト（Cookie付き）
    S->>A: セッション検証
    A->>D: ユーザー情報取得
    D-->>A: ユーザーデータ
    A-->>S: 認証済みユーザー情報
    S->>S: HTMLレンダリング（認証状態含む）
    S-->>B: 完全なHTMLページ
    
    Note over B: クライアントサイドハイドレーション
    B->>B: JavaScript実行
    B->>B: 認証状態を引き継ぎ
    
    style S fill:#e8f5e8
    style A fill:#e3f2fd
```

### 🤔 なぜSSR認証が複雑なのか

#### 1. **サーバーとクライアントの状態同期**

```typescript
// ❌ 問題：サーバーとクライアントで異なる認証状態
function ProblematicAuth() {
  // サーバー側では認証済み → HTMLに「ログイン中」と表示
  // クライアント側では未認証 → ハイドレーション後に「ログアウト」表示
  // → ちらつき（Flash of Unauthenticated Content）が発生
  
  const [user, setUser] = useState(null); // クライアント側は null から開始
  
  return (
    <div>
      {user ? `こんにちは、${user.name}さん` : 'ログインしてください'}
    </div>
  );
}
```

#### 2. **SEOとセキュリティの両立**

```typescript
// SEO要件 vs セキュリティ要件
const challenges = {
  seo: {
    requirement: "検索エンジンにコンテンツを公開",
    solution: "サーバーサイドで完全なHTMLを生成",
    risk: "機密情報の意図しない露出"
  },
  security: {
    requirement: "認証が必要なコンテンツを保護",
    solution: "認証チェック後にのみコンテンツ表示",
    risk: "SEOでインデックスされない"
  }
};
```

## 🔧 React Router v7での実装

### 📊 バケットリストアプリでの実装分析

```typescript
// app/routes/_authenticated.tsx - 認証が必要なルートの保護
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { getSession } from "~/features/auth/lib/session.server";

// サーバーサイドでの認証チェック
export async function loader({ request }: LoaderFunctionArgs) {
  // 1. Cookieからセッション情報を取得
  const session = await getSession(request.headers.get("Cookie"));
  
  // 2. 認証状態をチェック
  if (!session?.user) {
    // 未認証の場合はログインページにリダイレクト
    throw redirect("/auth/signin");
  }
  
  // 3. 認証済みユーザー情報をクライアントに渡す
  return json({ 
    user: session.user,
    timestamp: Date.now() // キャッシュバスティング用
  });
}

// クライアントサイドでの状態管理
export default function AuthenticatedLayout() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <AuthProvider user={user}>
        <Outlet />
      </AuthProvider>
    </div>
  );
}
```

### 🔐 セッション管理の実装

```typescript
// app/features/auth/lib/session.server.ts
import { createCookieSessionStorage } from "@remix-run/node";

// セキュアなセッションストレージの設定
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "bucket-list-session",
    secure: process.env.NODE_ENV === "production", // HTTPS必須（本番環境）
    secrets: [process.env.SESSION_SECRET!], // 署名用の秘密鍵
    sameSite: "strict", // CSRF攻撃対策
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7日間
    httpOnly: true, // XSS攻撃対策
  },
});

// セッション取得
export async function getSession(cookieHeader: string | null) {
  const session = await sessionStorage.getSession(cookieHeader);
  
  // セッションの有効性をチェック
  const user = session.get("user");
  const expiresAt = session.get("expiresAt");
  
  if (!user || !expiresAt || Date.now() > expiresAt) {
    return null; // 無効なセッション
  }
  
  return { user, expiresAt };
}

// セッション作成
export async function createUserSession(
  user: User,
  redirectTo: string
): Promise<Response> {
  const session = await sessionStorage.getSession();
  
  // ユーザー情報とexpiration time をセッションに保存
  session.set("user", {
    id: user.id,
    email: user.email,
    name: user.name,
    // 機密情報は含めない（パスワードハッシュなど）
  });
  session.set("expiresAt", Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7日後
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}
```

### ⚡ ハイドレーション最適化

```typescript
// app/features/auth/lib/auth-context.tsx
import { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// SSR対応の認証プロバイダー
export function AuthProvider({ 
  children, 
  user: initialUser 
}: { 
  children: React.ReactNode;
  user: User | null;
}) {
  // サーバーから渡された初期ユーザー情報を使用
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // ハイドレーション完了を検知
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // サインアウト処理
  const signOut = async () => {
    setLoading(true);
    try {
      // 1. Supabase セッションをクリア
      await supabase.auth.signOut();

      // 2. ブラウザのCookieをクリア
      if (typeof window !== "undefined") {
        document.cookie.split(";").forEach((cookie) => {
          const [name] = cookie.split("=");
          if (name.trim().includes("supabase") || name.trim().includes("bucket-list")) {
            document.cookie = `${name.trim()}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=strict`;
          }
        });
      }

      // 3. 状態をクリア
      setUser(null);
      
      // 4. ログインページにリダイレクト
      window.location.href = "/auth/signin";
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ハイドレーション前は loading state を表示
  if (!isHydrated) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

## 🔒 セキュリティ考慮事項

### 🛡️ サーバーサイドでの認証チェック

```typescript
// 認証チェックのミドルウェア
export async function requireAuth(request: Request): Promise<User> {
  const session = await getSession(request.headers.get("Cookie"));
  
  if (!session?.user) {
    throw redirect("/auth/signin", {
      headers: {
        "X-Redirect-Reason": "authentication-required"
      }
    });
  }

  // 追加のセキュリティチェック
  const user = await validateUser(session.user.id);
  if (!user || user.status !== "active") {
    throw redirect("/auth/signin", {
      headers: {
        "X-Redirect-Reason": "account-inactive"
      }
    });
  }

  return user;
}

// 使用例
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  
  // この時点で user は確実に存在し、有効
  const bucketItems = await getBucketItemsForUser(user.id);
  
  return json({ user, bucketItems });
}
```

### 🔐 データの露出防止

```typescript
// サーバーサイドでのデータフィルタリング
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  // パスワードハッシュ、内部ID等は含めない
}

function sanitizeUserForClient(user: DatabaseUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar
    // 機密情報は意図的に除外
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  
  if (!session?.user) {
    throw redirect("/auth/signin");
  }

  // データベースから完全なユーザー情報を取得
  const fullUser = await getUserFromDatabase(session.user.id);
  
  // クライアントには安全な情報のみ送信
  const publicUser = sanitizeUserForClient(fullUser);
  
  return json({ user: publicUser });
}
```

## ⚡ パフォーマンス最適化

### 🚀 認証状態のキャッシュ

```typescript
// サーバーサイドでの認証キャッシュ
import { LRUCache } from "lru-cache";

interface CachedAuth {
  user: User;
  expiresAt: number;
}

// メモリキャッシュ（本番環境ではRedisを推奨）
const authCache = new LRUCache<string, CachedAuth>({
  max: 10000, // 最大10,000セッション
  ttl: 5 * 60 * 1000, // 5分間キャッシュ
});

export async function getCachedAuth(sessionId: string): Promise<User | null> {
  // キャッシュから取得を試行
  const cached = authCache.get(sessionId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }

  // キャッシュミス：データベースから取得
  const user = await getUserFromDatabase(sessionId);
  if (user) {
    authCache.set(sessionId, {
      user,
      expiresAt: Date.now() + (5 * 60 * 1000)
    });
  }

  return user;
}
```

### 📊 プリロードと最適化

```typescript
// 認証状態のプリロード
export function AuthPreloader({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    // 認証が必要そうなページを事前にプリロード
    const authRequiredPaths = [
      "/dashboard",
      "/bucket-list",
      "/profile"
    ];

    authRequiredPaths.forEach(path => {
      // React Router のプリロード機能を使用
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = path;
      document.head.appendChild(link);
    });

    return () => {
      // クリーンアップ
      const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
      prefetchLinks.forEach(link => link.remove());
    };
  }, []);

  return <>{children}</>;
}
```

## 🎯 ハイドレーション戦略

### 💡 段階的ハイドレーション

```typescript
// 重要な認証コンポーネントを優先的にハイドレーション
export function ProgressiveAuthHydration() {
  const [authHydrated, setAuthHydrated] = useState(false);
  const [contentHydrated, setContentHydrated] = useState(false);

  useEffect(() => {
    // 1. 認証コンポーネントを最初にハイドレーション
    setAuthHydrated(true);
    
    // 2. 少し遅れてメインコンテンツをハイドレーション
    const timer = setTimeout(() => {
      setContentHydrated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {authHydrated ? (
        <AuthenticatedHeader />
      ) : (
        <div className="h-16 bg-gray-100 animate-pulse" /> // スケルトン
      )}
      
      {contentHydrated ? (
        <MainContent />
      ) : (
        <ContentSkeleton />
      )}
    </div>
  );
}
```

### 🔄 認証状態の同期

```typescript
// サーバーとクライアント間の状態同期
export function useAuthSync(initialUser: User | null) {
  const [user, setUser] = useState(initialUser);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    // 定期的にサーバーと認証状態を同期
    const syncAuth = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          credentials: "include"
        });

        if (response.ok) {
          const { user: serverUser } = await response.json();
          
          // サーバーとクライアントの状態が異なる場合は更新
          if (JSON.stringify(user) !== JSON.stringify(serverUser)) {
            setUser(serverUser);
          }
        } else if (response.status === 401) {
          // サーバー側で認証が無効になった場合
          setUser(null);
          window.location.href = "/auth/signin";
        }
      } catch (error) {
        console.error("Auth sync error:", error);
        setSyncError("認証状態の同期に失敗しました");
      }
    };

    // 初回同期
    syncAuth();

    // 5分ごとに同期（本番環境では適切な間隔に調整）
    const interval = setInterval(syncAuth, 5 * 60 * 1000);
    
    // ページフォーカス時にも同期
    const handleFocus = () => syncAuth();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  return { user, syncError };
}
```

## 🌐 SEOとセキュリティの両立

### 📈 検索エンジン最適化

```typescript
// SEOフレンドリーな認証ページ
export function SEOOptimizedAuth() {
  const { user } = useAuth();
  
  return (
    <>
      <Head>
        <title>{user ? "ダッシュボード" : "ログイン"} - バケットリストアプリ</title>
        <meta 
          name="description" 
          content={user 
            ? "あなたの人生でやりたいことリストを管理" 
            : "ログインして人生でやりたいことリストを作成しましょう"
          } 
        />
        {!user && (
          <meta name="robots" content="index, follow" />
        )}
        {user && (
          <meta name="robots" content="noindex, nofollow" />
        )}
      </Head>
      
      {user ? (
        <AuthenticatedContent />
      ) : (
        <PublicContent />
      )}
    </>
  );
}
```

### 🔒 条件付きレンダリング

```typescript
// 機密情報を含むコンテンツの適切な処理
export function ConditionalContent() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // サーバーサイドでは機密情報を出力しない
  if (!isClient) {
    return (
      <div>
        <h1>バケットリストアプリ</h1>
        <p>ログインして、あなたの人生でやりたいことリストを作成しましょう。</p>
        {/* 機密情報は含まない */}
      </div>
    );
  }

  // クライアントサイドでのみ認証が必要なコンテンツを表示
  return (
    <div>
      <h1>バケットリストアプリ</h1>
      {user ? (
        <div>
          <h2>こんにちは、{user.name}さん</h2>
          <PrivateBucketList />
        </div>
      ) : (
        <div>
          <p>ログインして、あなたの人生でやりたいことリストを作成しましょう。</p>
          <LoginForm />
        </div>
      )}
    </div>
  );
}
```

## 🔍 デバッグとトラブルシューティング

### 🐛 一般的な問題と解決策

```typescript
// SSR認証でよくある問題の診断ツール
export class SSRAuthDiagnostics {
  static async diagnose(request: Request): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      issues: [],
      recommendations: []
    };

    // 1. Cookie の確認
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) {
      report.issues.push("Cookie header is missing");
      report.recommendations.push("Check if cookies are being sent by the client");
    }

    // 2. セッションの確認
    try {
      const session = await getSession(cookieHeader);
      if (!session) {
        report.issues.push("Session is invalid or expired");
        report.recommendations.push("Check session storage configuration and expiration");
      } else {
        report.issues.push("Session is valid");
      }
    } catch (error) {
      report.issues.push(`Session validation error: ${error.message}`);
      report.recommendations.push("Check session secret and cookie configuration");
    }

    // 3. User-Agent の確認
    const userAgent = request.headers.get("User-Agent");
    if (!userAgent || userAgent.includes("bot")) {
      report.issues.push("Request appears to be from a bot or crawler");
      report.recommendations.push("Consider implementing bot-specific handling");
    }

    return report;
  }

  static logAuthEvent(event: string, data: any) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[SSR Auth] ${event}:`, data);
    }
  }
}
```

### 📊 パフォーマンス監視

```typescript
// SSR認証のパフォーマンス測定
export function useSSRAuthMetrics() {
  useEffect(() => {
    // ハイドレーション時間を測定
    const hydrationStart = performance.now();
    
    const measureHydration = () => {
      const hydrationEnd = performance.now();
      const hydrationTime = hydrationEnd - hydrationStart;
      
      // メトリクスを送信（開発環境では console.log）
      if (process.env.NODE_ENV === "development") {
        console.log(`SSR Auth Hydration Time: ${hydrationTime.toFixed(2)}ms`);
      } else {
        // 本番環境では分析ツールに送信
        analytics.track("ssr_auth_hydration", {
          duration: hydrationTime,
          timestamp: Date.now()
        });
      }
    };

    // DOM準備完了時に測定
    if (document.readyState === "complete") {
      measureHydration();
    } else {
      window.addEventListener("load", measureHydration);
      return () => window.removeEventListener("load", measureHydration);
    }
  }, []);
}
```

## 🎯 重要なポイント

### ✅ SSR認証のベストプラクティス

1. **サーバー優先**: 認証チェックは必ずサーバーサイドで実行
2. **状態同期**: サーバーとクライアントの認証状態を一致させる
3. **セキュリティ**: 機密情報はクライアントに送信しない
4. **パフォーマンス**: 適切なキャッシュとプリロード戦略
5. **ユーザー体験**: ハイドレーション時のちらつきを防ぐ

### ❌ 避けるべき落とし穴

```typescript
// ❌ 悪い例
function BadSSRAuth() {
  // クライアントサイドでのみ認証チェック（危険）
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    checkAuth().then(setUser); // サーバーサイドで実行されない
  }, []);

  if (!user) return <div>Loading...</div>; // 無限ローディング

  return <ProtectedContent />;
}

// ✅ 良い例
export async function loader({ request }: LoaderFunctionArgs) {
  // サーバーサイドで認証チェック
  const user = await requireAuth(request);
  return json({ user });
}

function GoodSSRAuth() {
  const { user } = useLoaderData<typeof loader>();
  // この時点で user は確実に存在
  return <ProtectedContent user={user} />;
}
```

## 🚀 次のステップ

SSR認証の実装について理解できたら、次は **[マイクロサービス認証](./microservices-auth.md)** で、分散システムでの認証設計について学びましょう。

マイクロサービスアーキテクチャでのJWT共有、サービス間認証、分散セッション管理などを詳しく学習します。