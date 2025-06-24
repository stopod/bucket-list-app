# OAuth統合

## 🎯 学習目標

- OAuth 2.0とOpenID Connectの詳細な仕組みを理解する
- 認可コードフローとPKCEの実装を学ぶ
- 複数の認証プロバイダーとの統合方法を知る
- セキュリティリスクと対策を理解する
- バケットリストアプリでの実装を詳細に分析する

## 🔐 OAuth 2.0とOpenID Connect

### 📝 基本概念

**OAuth 2.0** は認可フレームワーク、**OpenID Connect** は OAuth 2.0 上に構築された認証レイヤーです。

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant C as 💻 クライアント<br/>(バケットリストアプリ)
    participant A as 🔐 認可サーバー<br/>(GitHub/Google)
    participant R as 📊 リソースサーバー<br/>(GitHub API/Google API)

    Note over U,R: OAuth 2.0 認可コードフロー + OIDC
    U->>C: ログインボタンクリック
    C->>A: 認可要求 (+ PKCE Challenge)
    A-->>U: ログインページ表示
    U->>A: 認証・認可許可
    A->>C: 認可コード返却
    
    Note over C,A: バックチャネル通信
    C->>A: 認可コード + PKCE Verifier
    A->>A: コード・PKCE検証
    A-->>C: アクセストークン + IDトークン
    
    Note over C: ID トークン検証
    C->>C: JWT署名検証・ペイロード確認
    C->>R: APIアクセス (Bearer Token)
    R-->>C: ユーザー情報
    C-->>U: ログイン完了
    
    style A fill:#e8f5e8
    style C fill:#e3f2fd
```

### 🔑 OAuth 2.0 vs OpenID Connect

```typescript
// OAuth 2.0 と OpenID Connect の違い
const oauthVsOidc = {
  oauth2: {
    purpose: "認可 (Authorization)",
    what: "第三者アプリにリソースアクセスを許可",
    tokens: ["access_token", "refresh_token"],
    useCase: "GitHubのリポジトリアクセス許可",
    example: "Aアプリが GitHub API でユーザーのリポジトリ一覧を取得"
  },
  
  openIdConnect: {
    purpose: "認証 (Authentication)", 
    what: "ユーザーの身元確認",
    tokens: ["access_token", "id_token", "refresh_token"],
    useCase: "Googleアカウントでログイン",
    example: "ユーザーが Google アカウントでバケットリストアプリにログイン"
  }
};

// ID Token の構造（OpenID Connect）
interface IDToken {
  // 標準クレーム
  iss: string;          // 発行者 (e.g., "https://accounts.google.com")
  sub: string;          // ユーザーID (e.g., "12345...")
  aud: string;          // 対象アプリケーション
  exp: number;          // 有効期限
  iat: number;          // 発行時刻
  nonce?: string;       // CSRF対策用

  // ユーザー情報
  email?: string;       // メールアドレス
  email_verified?: boolean;
  name?: string;        // 表示名
  picture?: string;     // プロフィール画像
  given_name?: string;  // 名
  family_name?: string; // 姓
  locale?: string;      // ロケール
}
```

## 🔧 PKCE (Proof Key for Code Exchange)

### 🛡️ PKCEの必要性と実装

```typescript
// PKCE実装 - セキュリティ強化のための仕組み
export class PKCEManager {
  // Code Verifier生成 (43-128文字のランダム文字列)
  generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  // Code Challenge生成 (Code VerifierのSHA256ハッシュ)
  async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  }

  private base64URLEncode(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // OAuth認可URLの生成
  async generateAuthURL(config: OAuthConfig): Promise<{ url: string; codeVerifier: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID(); // CSRF対策

    // セッションに保存（後で検証用）
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authURL = `${config.authorizationEndpoint}?${params.toString()}`;
    
    return { url: authURL, codeVerifier };
  }
}

// 使用例
const pkceManager = new PKCEManager();

// GitHub OAuth設定
const githubConfig: OAuthConfig = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  redirectUri: 'https://bucket-list.com/auth/callback/github',
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  scope: ['user:email', 'read:user']
};
```

## 🌐 複数プロバイダーの統合

### 🔧 統一的なOAuth実装

```typescript
// 複数のOAuthプロバイダーを統一的に扱う
export interface OAuthProvider {
  name: string;
  config: OAuthConfig;
  exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse>;
  getUserInfo(accessToken: string): Promise<UserInfo>;
}

// GitHub プロバイダー実装
export class GitHubOAuthProvider implements OAuthProvider {
  name = 'github';
  
  config: OAuthConfig = {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: process.env.GITHUB_REDIRECT_URI!,
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    scope: ['user:email', 'read:user']
  };

  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret!,
      code: code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier // PKCE
    });

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.statusText}`);
    }

    const tokenData = await response.json();
    
    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description}`);
    }

    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope
    };
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    // 基本ユーザー情報取得
    const userResponse = await fetch(this.config.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`GitHub user info failed: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    // メールアドレス取得（別エンドポイント）
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const emails = emailResponse.ok ? await emailResponse.json() : [];
    const primaryEmail = emails.find((e: any) => e.primary && e.verified)?.email || userData.email;

    return {
      id: userData.id.toString(),
      email: primaryEmail,
      name: userData.name || userData.login,
      picture: userData.avatar_url,
      verified: true,
      provider: 'github',
      providerAccountId: userData.id.toString()
    };
  }
}

// Google プロバイダー実装
export class GoogleOAuthProvider implements OAuthProvider {
  name = 'google';
  
  config: OAuthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: ['openid', 'email', 'profile']
  };

  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret!,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier
    });

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const tokenData = await response.json();

    if (!response.ok || tokenData.error) {
      throw new Error(`Google token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    return tokenData;
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(this.config.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google user info failed: ${response.statusText}`);
    }

    const userData = await response.json();

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      verified: userData.verified_email,
      provider: 'google',
      providerAccountId: userData.id
    };
  }
}

// プロバイダー管理
export class OAuthProviderManager {
  private providers: Map<string, OAuthProvider> = new Map();

  constructor() {
    this.providers.set('github', new GitHubOAuthProvider());
    this.providers.set('google', new GoogleOAuthProvider());
  }

  getProvider(name: string): OAuthProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`OAuth provider '${name}' not supported`);
    }
    return provider;
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

## 🛡️ セキュリティ実装

### 🔒 JWT ID Token検証

```typescript
// OpenID Connect ID Token の検証
export class IDTokenValidator {
  private jwksCache: Map<string, any> = new Map();
  private readonly cacheTimeout = 60 * 60 * 1000; // 1時間

  async validateIDToken(idToken: string, issuer: string, audience: string): Promise<IDToken> {
    // 1. JWT形式の検証
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // 2. ヘッダーとペイロードの取得
    const header = JSON.parse(this.base64UrlDecode(parts[0]));
    const payload = JSON.parse(this.base64UrlDecode(parts[1]));

    // 3. 基本的なクレーム検証
    this.validateBasicClaims(payload, issuer, audience);

    // 4. 署名検証
    await this.verifySignature(idToken, header, issuer);

    return payload as IDToken;
  }

  private validateBasicClaims(payload: any, expectedIssuer: string, expectedAudience: string): void {
    const now = Math.floor(Date.now() / 1000);

    // issuer検証
    if (payload.iss !== expectedIssuer) {
      throw new Error(`Invalid issuer: expected ${expectedIssuer}, got ${payload.iss}`);
    }

    // audience検証
    if (payload.aud !== expectedAudience) {
      throw new Error(`Invalid audience: expected ${expectedAudience}, got ${payload.aud}`);
    }

    // 有効期限検証
    if (!payload.exp || payload.exp < now) {
      throw new Error('Token has expired');
    }

    // 発行時刻検証（5分の誤差を許容）
    if (!payload.iat || payload.iat > now + 300) {
      throw new Error('Token issued in the future');
    }

    // nbf (not before) 検証
    if (payload.nbf && payload.nbf > now) {
      throw new Error('Token not yet valid');
    }
  }

  private async verifySignature(idToken: string, header: any, issuer: string): Promise<void> {
    if (header.alg === 'none') {
      throw new Error('Unsigned tokens are not allowed');
    }

    // JWKS取得
    const jwks = await this.getJWKS(issuer);
    const key = jwks.keys.find((k: any) => k.kid === header.kid);
    
    if (!key) {
      throw new Error(`Key ID ${header.kid} not found in JWKS`);
    }

    // RSA公開鍵での署名検証
    if (key.kty === 'RSA' && header.alg === 'RS256') {
      const publicKey = await this.importRSAKey(key);
      const isValid = await this.verifyRS256Signature(idToken, publicKey);
      
      if (!isValid) {
        throw new Error('Invalid token signature');
      }
    } else {
      throw new Error(`Unsupported key type or algorithm: ${key.kty}/${header.alg}`);
    }
  }

  private async getJWKS(issuer: string): Promise<any> {
    const cacheKey = `jwks:${issuer}`;
    const cached = this.jwksCache.get(cacheKey);
    
    if (cached && cached.timestamp + this.cacheTimeout > Date.now()) {
      return cached.jwks;
    }

    // Well-known JWKS エンドポイントから取得
    const jwksUri = `${issuer}/.well-known/jwks.json`;
    const response = await fetch(jwksUri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS from ${jwksUri}`);
    }

    const jwks = await response.json();
    
    // キャッシュに保存
    this.jwksCache.set(cacheKey, {
      jwks,
      timestamp: Date.now()
    });

    return jwks;
  }

  private async importRSAKey(jwk: any): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    );
  }

  private async verifyRS256Signature(token: string, publicKey: CryptoKey): Promise<boolean> {
    const parts = token.split('.');
    const header = parts[0];
    const payload = parts[1];
    const signature = parts[2];

    const data = new TextEncoder().encode(`${header}.${payload}`);
    const signatureBytes = this.base64UrlDecodeToBuffer(signature);

    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBytes,
      data
    );
  }

  private base64UrlDecode(base64url: string): string {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return atob(padded);
  }

  private base64UrlDecodeToBuffer(base64url: string): ArrayBuffer {
    const base64 = this.base64UrlDecode(base64url);
    const bytes = new Uint8Array(base64.length);
    for (let i = 0; i < base64.length; i++) {
      bytes[i] = base64.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
```

### 🔐 State パラメータとNonce

```typescript
// CSRF攻撃とリプレイ攻撃の対策
export class OAuthSecurityManager {
  private stateStore: Map<string, StateData> = new Map();
  private nonceStore: Map<string, NonceData> = new Map();

  // State生成（CSRF対策）
  generateState(userId?: string): string {
    const state = crypto.randomUUID();
    const stateData: StateData = {
      value: state,
      userId: userId,
      timestamp: Date.now(),
      expires: Date.now() + (10 * 60 * 1000) // 10分間有効
    };

    this.stateStore.set(state, stateData);
    
    // 古いstateのクリーンアップ
    this.cleanupExpiredStates();
    
    return state;
  }

  // State検証
  validateState(state: string, userId?: string): boolean {
    const stateData = this.stateStore.get(state);
    
    if (!stateData) {
      return false; // state not found
    }

    if (Date.now() > stateData.expires) {
      this.stateStore.delete(state);
      return false; // expired
    }

    if (userId && stateData.userId !== userId) {
      return false; // user mismatch
    }

    // 使用済みstateは削除（リプレイ攻撃対策）
    this.stateStore.delete(state);
    return true;
  }

  // Nonce生成（IDトークン用）
  generateNonce(): string {
    const nonce = crypto.randomUUID();
    const nonceData: NonceData = {
      value: nonce,
      timestamp: Date.now(),
      expires: Date.now() + (10 * 60 * 1000)
    };

    this.nonceStore.set(nonce, nonceData);
    this.cleanupExpiredNonces();
    
    return nonce;
  }

  // Nonce検証
  validateNonce(nonce: string): boolean {
    const nonceData = this.nonceStore.get(nonce);
    
    if (!nonceData) {
      return false;
    }

    if (Date.now() > nonceData.expires) {
      this.nonceStore.delete(nonce);
      return false;
    }

    // 使用済みnonceは削除
    this.nonceStore.delete(nonce);
    return true;
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [key, data] of this.stateStore.entries()) {
      if (now > data.expires) {
        this.stateStore.delete(key);
      }
    }
  }

  private cleanupExpiredNonces(): void {
    const now = Date.now();
    for (const [key, data] of this.nonceStore.entries()) {
      if (now > data.expires) {
        this.nonceStore.delete(key);
      }
    }
  }
}

interface StateData {
  value: string;
  userId?: string;
  timestamp: number;
  expires: number;
}

interface NonceData {
  value: string;
  timestamp: number;
  expires: number;
}
```

## 🔧 バケットリストアプリでの実装

### 📝 OAuth認証フローの統合

```typescript
// app/routes/auth/oauth/$provider.tsx - OAuth開始エンドポイント
import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const provider = params.provider;
  
  if (!provider || !['github', 'google'].includes(provider)) {
    throw new Response("Unsupported OAuth provider", { status: 400 });
  }

  const oauthManager = new OAuthProviderManager();
  const pkceManager = new PKCEManager();
  const securityManager = new OAuthSecurityManager();

  try {
    // PKCE + State + Nonce 生成
    const oauthProvider = oauthManager.getProvider(provider);
    const { url, codeVerifier } = await pkceManager.generateAuthURL(oauthProvider.config);
    const state = securityManager.generateState();
    const nonce = securityManager.generateNonce();

    // セッションに保存
    const session = await getSession(request.headers.get("Cookie"));
    session.set("oauth_code_verifier", codeVerifier);
    session.set("oauth_state", state);
    session.set("oauth_nonce", nonce);
    session.set("oauth_provider", provider);

    // URLにstate/nonceを追加
    const finalURL = new URL(url);
    finalURL.searchParams.set('state', state);
    if (provider === 'google') {
      finalURL.searchParams.set('nonce', nonce);
    }

    return redirect(finalURL.toString(), {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session)
      }
    });

  } catch (error) {
    console.error(`OAuth ${provider} initiation error:`, error);
    return redirect("/auth/signin?error=oauth_init_failed");
  }
}

// app/routes/auth/callback/$provider.tsx - OAuth コールバック
export async function loader({ params, request }: LoaderFunctionArgs) {
  const provider = params.provider;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error(`OAuth ${provider} error:`, error);
    return redirect(`/auth/signin?error=oauth_${error}`);
  }

  if (!code || !state) {
    return redirect("/auth/signin?error=missing_oauth_params");
  }

  try {
    const session = await getSession(request.headers.get("Cookie"));
    const codeVerifier = session.get("oauth_code_verifier");
    const savedState = session.get("oauth_state");
    const nonce = session.get("oauth_nonce");
    const savedProvider = session.get("oauth_provider");

    // セキュリティ検証
    const securityManager = new OAuthSecurityManager();
    if (!securityManager.validateState(savedState) || savedState !== state) {
      throw new Error("Invalid state parameter");
    }

    if (savedProvider !== provider) {
      throw new Error("Provider mismatch");
    }

    // OAuth処理
    const oauthManager = new OAuthProviderManager();
    const oauthProvider = oauthManager.getProvider(provider);
    
    // トークン交換
    const tokens = await oauthProvider.exchangeCodeForTokens(code, codeVerifier);
    
    // ID Token検証（OpenID Connect）
    if (tokens.id_token) {
      const idTokenValidator = new IDTokenValidator();
      const idToken = await idTokenValidator.validateIDToken(
        tokens.id_token,
        oauthProvider.config.issuer!,
        oauthProvider.config.clientId
      );

      // Nonce検証
      if (nonce && idToken.nonce !== nonce) {
        throw new Error("Invalid nonce");
      }
    }

    // ユーザー情報取得
    const userInfo = await oauthProvider.getUserInfo(tokens.access_token);
    
    // ユーザー作成/更新
    const user = await createOrUpdateOAuthUser(userInfo);
    
    // セッション作成
    return createUserSession(user, "/dashboard");

  } catch (error) {
    console.error(`OAuth ${provider} callback error:`, error);
    return redirect("/auth/signin?error=oauth_callback_failed");
  }
}

// OAuth ユーザーの作成/更新
async function createOrUpdateOAuthUser(userInfo: UserInfo): Promise<User> {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', userInfo.email)
    .single();

  if (existingUser) {
    // 既存ユーザーの更新
    const { data: updatedUser } = await supabase
      .from('users')
      .update({
        name: userInfo.name,
        avatar: userInfo.picture,
        last_sign_in: new Date().toISOString()
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    // OAuth プロバイダー情報の更新
    await supabase
      .from('oauth_accounts')
      .upsert({
        user_id: existingUser.id,
        provider: userInfo.provider,
        provider_account_id: userInfo.providerAccountId,
        updated_at: new Date().toISOString()
      });

    return updatedUser;
  } else {
    // 新規ユーザー作成
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.picture,
        email_verified: userInfo.verified,
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString()
      })
      .select()
      .single();

    // OAuth プロバイダー情報の保存
    await supabase
      .from('oauth_accounts')
      .insert({
        user_id: newUser.id,
        provider: userInfo.provider,
        provider_account_id: userInfo.providerAccountId,
        created_at: new Date().toISOString()
      });

    return newUser;
  }
}
```

### 🎨 フロントエンド統合

```typescript
// app/features/auth/components/oauth-buttons.tsx
export function OAuthButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: string) => {
    setLoading(provider);
    try {
      // OAuth フローを開始
      window.location.href = `/auth/oauth/${provider}`;
    } catch (error) {
      console.error(`OAuth ${provider} error:`, error);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => handleOAuthSignIn('github')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === 'github' ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
        ) : (
          <GitHubIcon className="h-5 w-5 mr-2" />
        )}
        GitHub でログイン
      </button>

      <button
        onClick={() => handleOAuthSignIn('google')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === 'google' ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
        ) : (
          <GoogleIcon className="h-5 w-5 mr-2" />
        )}
        Google でログイン
      </button>
    </div>
  );
}

// OAuth エラーハンドリング
export function OAuthErrorHandler() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages = {
    oauth_init_failed: 'OAuth認証の開始に失敗しました。',
    oauth_callback_failed: 'OAuth認証の完了に失敗しました。',
    oauth_access_denied: 'OAuth認証が拒否されました。',
    missing_oauth_params: '必要なパラメータが不足しています。',
    invalid_state: 'セキュリティエラーが発生しました。再度お試しください。'
  };

  if (!error || !errorMessages[error]) {
    return null;
  }

  return (
    <div className="mb-4 p-4 border border-red-300 rounded-md bg-red-50">
      <div className="flex">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            認証エラー
          </h3>
          <div className="mt-2 text-sm text-red-700">
            {errorMessages[error]}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 🔍 高度な機能

### 🔄 リフレッシュトークン管理

```typescript
// リフレッシュトークンによる自動トークン更新
export class TokenRefreshManager {
  private refreshTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async scheduleTokenRefresh(userId: string, refreshToken: string, expiresIn: number): Promise<void> {
    // 期限の80%経過時点で更新をスケジュール
    const refreshTime = expiresIn * 0.8 * 1000;
    
    const timeout = setTimeout(async () => {
      try {
        await this.refreshAccessToken(userId, refreshToken);
      } catch (error) {
        console.error('Token refresh failed:', error);
        // リフレッシュ失敗時はユーザーに再ログインを促す
        await this.handleRefreshFailure(userId);
      }
    }, refreshTime);

    // 既存のタイムアウトをクリア
    const existingTimeout = this.refreshTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    this.refreshTimeouts.set(userId, timeout);
  }

  private async refreshAccessToken(userId: string, refreshToken: string): Promise<void> {
    // OAuth プロバイダーのリフレッシュエンドポイントを呼び出し
    const response = await fetch('https://oauth.provider.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.OAUTH_CLIENT_ID!,
        client_secret: process.env.OAUTH_CLIENT_SECRET!
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokenData = await response.json();

    // 新しいトークンを保存
    await this.updateUserTokens(userId, tokenData);

    // 次回の更新をスケジュール
    if (tokenData.refresh_token && tokenData.expires_in) {
      await this.scheduleTokenRefresh(userId, tokenData.refresh_token, tokenData.expires_in);
    }
  }

  private async handleRefreshFailure(userId: string): Promise<void> {
    // リフレッシュトークンを無効化
    await supabase
      .from('oauth_accounts')
      .update({ refresh_token: null })
      .eq('user_id', userId);

    // ユーザーセッションを無効化
    await this.invalidateUserSessions(userId);
  }
}
```

### 🔗 アカウント連携

```typescript
// 複数のOAuthアカウントの連携
export class AccountLinkingManager {
  async linkOAuthAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    tokens: TokenResponse
  ): Promise<void> {
    // 既存の連携を確認
    const { data: existingLink } = await supabase
      .from('oauth_accounts')
      .select('*')
      .eq('provider', provider)
      .eq('provider_account_id', providerAccountId)
      .single();

    if (existingLink && existingLink.user_id !== userId) {
      throw new Error('This account is already linked to another user');
    }

    // アカウント連携を保存
    await supabase
      .from('oauth_accounts')
      .upsert({
        user_id: userId,
        provider: provider,
        provider_account_id: providerAccountId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in ? 
          new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      });
  }

  async unlinkOAuthAccount(userId: string, provider: string): Promise<void> {
    // 他の認証方法があることを確認
    const authMethods = await this.getUserAuthMethods(userId);
    
    if (authMethods.length <= 1) {
      throw new Error('Cannot unlink the only authentication method');
    }

    // アカウント連携を削除
    await supabase
      .from('oauth_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);
  }

  async getUserLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    const { data: accounts } = await supabase
      .from('oauth_accounts')
      .select('provider, created_at, updated_at')
      .eq('user_id', userId);

    return accounts || [];
  }
}
```

## 🎯 重要なポイント

### ✅ OAuth統合のベストプラクティス

1. **PKCE実装**: すべてのOAuthフローでPKCEを使用
2. **状態検証**: State パラメータによるCSRF対策
3. **ID Token検証**: OpenID ConnectのID Tokenは必ず検証
4. **適切なスコープ**: 必要最小限のスコープのみ要求
5. **エラーハンドリング**: ユーザーフレンドリーなエラー表示

### ❌ 避けるべき落とし穴

```typescript
// ❌ 悪い例
const badOAuthImplementation = {
  // PKCEなしの実装（セキュリティリスク）
  noPKCE: "認可コード横取り攻撃に脆弱",
  
  // State検証なし（CSRF脆弱性）
  noStateValidation: "クロスサイトリクエストフォージェリ攻撃",
  
  // ID Token検証なし
  noIDTokenValidation: "偽造されたトークンを受け入れる",
  
  // 過剰なスコープ要求
  excessiveScopes: "ユーザーの不信とプライバシー侵害"
};

// ✅ 良い例
const goodOAuthImplementation = {
  // PKCE + State + Nonce
  secureFlow: "完全なセキュリティ対策",
  
  // 適切な検証
  properValidation: "すべてのトークンとパラメータを検証",
  
  // 最小スコープ
  minimalScopes: "必要な情報のみ要求",
  
  // エラー処理
  robustErrorHandling: "適切なエラー表示とログ"
};
```

## 🚀 次のステップ

OAuth統合について理解できたら、次は **[最新トレンド](./security-trends.md)** で、最新のセキュリティ技術と将来展望について学びましょう。

WebAuthn/FIDO2、パスキー、ゼロトラストアーキテクチャなどの最先端技術を詳しく学習します。