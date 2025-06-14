# 認証システム シーケンス図

## 📋 概要
このドキュメントは、バケットリストアプリケーションの認証システムにおける各種フローのシーケンス図を提供します。

## 🔐 認証フロー図

### 1. ログインフロー

```mermaid
sequenceDiagram
    participant U as User
    participant LF as LoginForm
    participant AC as AuthContext
    participant SU as SecurityUtils
    participant SB as Supabase
    participant CK as CookieManager
    participant R as Router

    Note over U,R: ユーザーログインプロセス
    U->>LF: email, password を入力
    LF->>AC: signIn(email, password)
    
    Note over AC,SU: 入力値検証フェーズ
    AC->>SU: sanitizeString(email)
    SU-->>AC: sanitized email
    AC->>SU: validateEmail(email)
    SU-->>AC: validation result
    AC->>SU: validatePassword(password)
    SU-->>AC: validation result
    
    alt 入力値が無効
        AC-->>LF: error: "無効な入力値"
        LF-->>U: エラー表示
    else 入力値が有効
        Note over AC,SB: Supabase 認証
        AC->>SB: signInWithPassword(email, password)
        SB-->>AC: { user, session, error }
        
        alt 認証失敗
            AC-->>LF: error: "認証エラー"
            LF-->>U: エラー表示
        else 認証成功
            Note over AC,CK: セッション管理
            AC->>CK: setAuthCookie(token)
            AC->>AC: setUser(user)
            AC->>AC: setSession(session)
            AC->>AC: updateActivity()
            AC-->>LF: success
            LF->>R: navigate to dashboard
            R-->>U: ダッシュボード画面表示
        end
    end
```

### 2. サーバーサイド認証チェック

```mermaid
sequenceDiagram
    participant B as Browser
    participant RL as RouteLoader
    participant AS as AuthServer
    participant CK as CookieParser
    participant SB as SupabaseServer
    participant DB as Database

    Note over B,DB: SSR での認証チェック
    B->>RL: GET /dashboard (with cookies)
    RL->>AS: getServerAuth(request)
    
    Note over AS,CK: Cookie 解析
    AS->>CK: parseCookies(request.headers)
    CK-->>AS: { 'supabase.auth.token': 'jwt_token' }
    
    Note over AS,SB: JWT 検証
    AS->>SB: createServerClient(SERVICE_ROLE_KEY)
    AS->>SB: supabase.auth.getUser()
    SB->>DB: ユーザー情報取得
    DB-->>SB: user data
    SB-->>AS: { user, error }
    
    alt 認証失敗
        AS-->>RL: { isAuthenticated: false }
        RL->>B: Response(302, Location: '/auth/login')
        B->>B: リダイレクト to ログイン画面
    else 認証成功
        AS-->>RL: { isAuthenticated: true, user }
        RL->>AS: createAuthenticatedSupabaseClient()
        AS-->>RL: authenticated supabase client
        RL->>DB: データ取得 (認証済み)
        DB-->>RL: dashboard data
        RL-->>B: ダッシュボード HTML + データ
    end
```

### 3. セッション管理とアクティビティ監視

```mermaid
sequenceDiagram
    participant U as User
    participant AC as AuthContext
    participant AM as ActivityMonitor
    participant SV as SessionValidator
    participant SB as Supabase
    participant CK as CookieManager

    Note over U,CK: セッション管理プロセス
    U->>AC: ページ読み込み/アクティビティ
    AC->>AM: updateActivity()
    AM->>AM: setLastActivity(Date.now())
    
    Note over AC,SV: 定期的なセッション検証 (1分毎)
    loop 毎分実行
        AC->>SV: validateSession(currentSession)
        
        Note over SV,SV: JWT 有効期限チェック
        SV->>SV: JWT payload 解析
        SV->>SV: exp < currentTime ?
        
        Note over SV,AM: アクティビティチェック
        SV->>AM: getLastActivity()
        AM-->>SV: lastActivity timestamp
        SV->>SV: (now - lastActivity) > 30min ?
        
        alt セッション有効
            SV-->>AC: valid = true
        else セッション無効
            SV-->>AC: valid = false
            AC->>SB: supabase.auth.signOut()
            AC->>CK: clearAllAuthCookies()
            AC->>AC: setUser(null)
            AC->>AC: setSession(null)
            AC->>U: リダイレクト to ログイン画面
        end
    end
    
    Note over U,AM: ユーザーアクティビティ監視
    U->>AM: mouse/keyboard/touch events
    AM->>AM: updateActivity()
```

### 4. ルート保護メカニズム

```mermaid
sequenceDiagram
    participant U as User
    participant R as Router
    participant AG as AuthGuard
    participant AC as AuthContext
    participant HOC as withAuthHOC
    participant C as Component

    Note over U,C: ルート保護フロー
    U->>R: navigate to /protected-route
    R->>AG: <AuthGuard>
    AG->>AC: useAuth()
    AC-->>AG: { user, loading }
    
    alt loading = true
        AG-->>U: Loading画面表示
    else user = null
        AG->>R: navigate('/auth/login')
        R-->>U: ログイン画面表示
    else user = authenticated
        AG->>HOC: withAuth(Component)
        HOC->>AC: useAuth()
        AC-->>HOC: { user, loading }
        
        alt loading = true
            HOC-->>U: Loading画面表示
        else user = null
            HOC->>R: navigate('/auth/login')
            R-->>U: ログイン画面表示
        else user = authenticated
            HOC->>C: render Component
            C-->>U: 保護されたページ表示
        end
    end
```

### 5. ログアウトフロー

```mermaid
sequenceDiagram
    participant U as User
    participant UI as UserInterface
    participant AC as AuthContext
    participant SB as Supabase
    participant CK as CookieManager
    participant LS as LocalStorage
    participant R as Router

    Note over U,R: ログアウトプロセス
    U->>UI: ログアウトボタンクリック
    UI->>AC: signOut()
    
    Note over AC,SB: Supabase セッション削除
    AC->>SB: supabase.auth.signOut()
    SB-->>AC: success
    
    Note over AC,CK: Cookie クリア
    AC->>CK: clearAllAuthCookies()
    CK->>CK: document.cookie = "supabase.auth.token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    CK->>CK: document.cookie = "supabase.auth.refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    
    Note over AC,LS: LocalStorage クリア (フォールバック)
    AC->>LS: localStorage.removeItem('supabase.auth.token')
    AC->>LS: localStorage.removeItem('supabase.auth.refreshToken')
    
    Note over AC,AC: 状態リセット
    AC->>AC: setUser(null)
    AC->>AC: setSession(null)
    
    Note over AC,R: リダイレクト
    AC->>R: navigate('/auth/login')
    R-->>U: ログイン画面表示
```

### 6. 認証エラーハンドリング

```mermaid
sequenceDiagram
    participant U as User
    participant AC as AuthContext
    participant SB as Supabase
    participant EH as ErrorHandler
    participant UI as UserInterface
    participant R as Router

    Note over U,R: 認証エラー処理フロー
    U->>AC: 認証が必要な操作
    AC->>SB: Supabase API call
    
    alt JWT 期限切れ
        SB-->>AC: error: "JWT expired"
        AC->>EH: handleAuthError(error)
        EH->>AC: signOut()
        AC->>UI: showError("セッションが期限切れです")
        AC->>R: navigate('/auth/login')
        R-->>U: ログイン画面 + エラーメッセージ
    else ネットワークエラー
        SB-->>AC: error: "Network error"
        AC->>EH: handleAuthError(error)
        EH->>UI: showError("ネットワークエラーが発生しました")
        UI-->>U: エラーメッセージ表示
    else 権限エラー
        SB-->>AC: error: "Insufficient permissions"
        AC->>EH: handleAuthError(error)
        EH->>UI: showError("権限がありません")
        UI-->>U: エラーメッセージ表示
    else 無効なトークン
        SB-->>AC: error: "Invalid token"
        AC->>EH: handleAuthError(error)
        EH->>AC: signOut()
        AC->>R: navigate('/auth/login')
        R-->>U: ログイン画面表示
    end
```

## 🔄 認証状態の同期

### クライアント・サーバー間での認証状態同期

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant SB as Supabase
    participant CK as Cookies

    Note over C,CK: 認証状態同期プロセス
    
    Note over C,SB: クライアントサイド認証
    C->>SB: supabase.auth.getSession()
    SB-->>C: { session, user }
    C->>CK: setAuthCookie(session.access_token)
    
    Note over S,CK: サーバーサイド認証
    S->>CK: parseCookies(request)
    CK-->>S: { 'supabase.auth.token': 'jwt_token' }
    S->>SB: createServerClient + getUser()
    SB-->>S: { user, error }
    
    Note over C,S: 状態同期チェック
    alt クライアント認証済み && サーバー認証済み
        Note over C,S: 正常な状態
    else クライアント認証済み && サーバー未認証
        S->>CK: Cookie 更新要求
        CK->>C: 新しい認証Cookie設定
        C->>SB: セッション再検証
    else クライアント未認証 && サーバー認証済み
        C->>SB: セッション復元
        SB-->>C: { session, user }
        C->>C: 認証状態更新
    else 両方未認証
        Note over C,S: ログイン画面へリダイレクト
    end
```

## 📊 認証メトリクス

### 認証システムの監視ポイント

```mermaid
sequenceDiagram
    participant U as User
    participant AC as AuthContext
    participant M as Metrics
    participant L as Logger
    participant A as Analytics

    Note over U,A: 認証メトリクス収集
    
    U->>AC: signIn()
    AC->>M: recordAuthAttempt('login')
    M->>L: log('auth_attempt', { type: 'login', timestamp })
    
    alt 認証成功
        AC->>M: recordAuthSuccess('login')
        M->>A: track('login_success', { user_id, timestamp })
        M->>L: log('auth_success', { user_id, timestamp })
    else 認証失敗
        AC->>M: recordAuthFailure('login', error)
        M->>A: track('login_failure', { error, timestamp })
        M->>L: log('auth_failure', { error, timestamp })
    end
    
    Note over AC,M: セッション管理メトリクス
    AC->>M: recordSessionActivity()
    M->>A: track('session_activity', { user_id, timestamp })
    
    Note over AC,M: タイムアウト監視
    AC->>M: recordSessionTimeout()
    M->>A: track('session_timeout', { user_id, duration })
    M->>L: log('session_timeout', { user_id, duration })
```

## 🎯 パフォーマンス最適化

### 認証チェックの最適化フロー

```mermaid
sequenceDiagram
    participant C as Client
    participant Cache as AuthCache
    participant AC as AuthContext
    participant SB as Supabase

    Note over C,SB: 認証チェック最適化
    
    C->>Cache: getCachedAuthState()
    
    alt キャッシュ有効
        Cache-->>C: { user, session, lastChecked }
        C->>C: 認証状態利用
    else キャッシュ無効/期限切れ
        C->>AC: 認証状態確認
        AC->>SB: supabase.auth.getSession()
        SB-->>AC: { session, user }
        AC->>Cache: setCachedAuthState(user, session)
        AC-->>C: 認証状態返却
    end
    
    Note over C,Cache: 定期的なキャッシュ更新
    loop 5分毎
        C->>Cache: invalidateCache()
        C->>AC: 認証状態再確認
    end
```

## 📚 関連ドキュメント
- [認証システム実装ガイド](./authentication.md)
- [セキュリティガイドライン](../security/security-guidelines.md)
- [Supabase Auth API Reference](https://supabase.com/docs/reference/javascript/auth-api)

---
**更新履歴**
- 2025-06-14: 初版作成 - 認証システムの全フローシーケンス図を追加