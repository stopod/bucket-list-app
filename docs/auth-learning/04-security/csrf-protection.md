# CSRF攻撃対策

## 🎯 学習目標

- CSRF（クロスサイトリクエストフォージェリ）攻撃の仕組みを理解する
- CSRFトークンによる防御方法を学ぶ
- SameSite Cookieの効果的な活用を知る
- 実際の攻撃シナリオと対策を理解する
- バケットリストアプリでの実装を分析する

## 🎯 CSRF攻撃とは

### 📝 基本概念

**CSRF (Cross-Site Request Forgery)** は、ユーザーが意図しない操作を他のサイトから強制的に実行させる攻撃手法です。

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant B as 🏦 銀行サイト
    participant A as 🏴‍☠️ 攻撃サイト

    Note over U,A: CSRF攻撃の流れ
    U->>B: 正規ログイン
    B-->>U: 認証Cookie設定
    
    Note over U: 別タブで攻撃サイトにアクセス
    U->>A: 攻撃サイト閲覧
    A-->>U: 悪意のあるページ
    
    Note over U: 隠れた自動送信フォーム
    U->>B: 意図しない送金リクエスト（Cookie付き）
    B->>B: 正当なリクエストと判断 💀
    B-->>U: 送金実行
    
    style B fill:#ffcdd2
```

### 😱 実際のCSRF攻撃例

#### 🏦 悪意のある銀行振込

```html
<!-- 攻撃者のサイトに仕込まれた悪意のあるHTML -->
<html>
<head><title>面白い動画！</title></head>
<body>
  <h1>今話題の動画はこちら！</h1>
  
  <!-- 隠れたフォーム（ユーザーには見えない） -->
  <form id="hiddenForm" action="https://bank.com/transfer" method="POST" style="display:none;">
    <input name="to_account" value="attacker_account_123">
    <input name="amount" value="100000">
    <input name="memo" value="緊急支払い">
  </form>
  
  <script>
    // ページ読み込み時に自動送信
    window.onload = function() {
      document.getElementById('hiddenForm').submit();
    };
  </script>
</body>
</html>
```

#### 📧 SNSでの勝手な投稿

```html
<!-- ユーザーが気づかない間に投稿される -->
<img src="https://social.com/api/post" 
     style="display:none;"
     onload="
       fetch('https://social.com/api/post', {
         method: 'POST',
         credentials: 'include',  // Cookie を含める
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           message: 'このサイト最高！みんなもチェック！ http://malicious-site.com',
           public: true
         })
       });
     ">
```

## 🛡️ CSRF対策の手法

### 1. 🎫 CSRFトークン（最も重要）

```typescript
// CSRFトークンの生成と検証
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;

  // トークン生成
  static generateToken(): string {
    const array = new Uint8Array(this.TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // セッションにトークンを保存
  static setTokenInSession(sessionId: string, token: string): void {
    // サーバーサイドのセッションストレージに保存
    sessionStorage.set(`csrf_token_${sessionId}`, token);
  }

  // フォームにトークンを埋め込み
  static injectTokenToForm(formElement: HTMLFormElement, token: string): void {
    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'csrf_token';
    tokenInput.value = token;
    formElement.appendChild(tokenInput);
  }

  // API リクエストにトークンを追加
  static addTokenToHeaders(token: string): Record<string, string> {
    return {
      'X-CSRF-Token': token,
      'Content-Type': 'application/json'
    };
  }

  // トークン検証
  static verifyToken(sessionToken: string, requestToken: string): boolean {
    if (!sessionToken || !requestToken) {
      return false;
    }
    
    // タイミング攻撃対策（定数時間比較）
    return this.constantTimeEquals(sessionToken, requestToken);
  }

  // 定数時間での文字列比較（タイミング攻撃対策）
  private static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}
```

### 2. 🍪 SameSite Cookie（バケットリストアプリで実装済み）

```typescript
// app/features/auth/lib/auth-context.tsx より
const signOut = async () => {
  try {
    await supabase.auth.signOut();

    // セキュリティ強化：セッション情報の完全クリア
    if (typeof window !== "undefined") {
      try {
        // 🔐 Cookie削除（SameSite=strict 設定）
        document.cookie.split(";").forEach((cookie) => {
          const [name] = cookie.split("=");
          if (name.trim().includes("supabase")) {
            document.cookie = `${name.trim()}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=strict`;
          }
        });
      } catch (error) {
        console.warn("Failed to clear session data:", error);
      }
    }
  } catch (error) {
    console.error("Unexpected sign out error:", error);
  }
};
```

#### SameSite の3つの設定値

```typescript
// SameSite Cookie の設定例
export class SecureCookieManager {
  // 最も厳格（CSRF完全防止、ただし外部リンクで問題になる場合あり）
  static setStrictCookie(name: string, value: string): void {
    document.cookie = `${name}=${value}; SameSite=Strict; Secure; HttpOnly; Path=/`;
  }

  // バランス型（一般的な推奨設定）
  static setLaxCookie(name: string, value: string): void {
    document.cookie = `${name}=${value}; SameSite=Lax; Secure; HttpOnly; Path=/`;
  }

  // 緩い設定（クロスサイトでも送信、CSRF対策効果なし）
  static setNoneCookie(name: string, value: string): void {
    document.cookie = `${name}=${value}; SameSite=None; Secure; HttpOnly; Path=/`;
  }
}
```

### 3. 🔍 Referrer チェック

```typescript
// Referrer ヘッダーによる検証
export class ReferrerChecker {
  static isValidReferrer(
    requestReferrer: string | null,
    allowedOrigins: string[]
  ): boolean {
    if (!requestReferrer) {
      // Referrer がない場合は拒否（セキュリティ優先）
      return false;
    }

    try {
      const referrerURL = new URL(requestReferrer);
      const referrerOrigin = referrerURL.origin;
      
      return allowedOrigins.includes(referrerOrigin);
    } catch (error) {
      // 無効なURL形式の場合は拒否
      return false;
    }
  }

  // Express.js でのミドルウェア例
  static createReferrerMiddleware(allowedOrigins: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      // GET リクエストは通す（読み取り専用）
      if (req.method === 'GET') {
        return next();
      }

      const referrer = req.get('Referer');
      
      if (!this.isValidReferrer(referrer, allowedOrigins)) {
        return res.status(403).json({
          error: 'Invalid referrer',
          message: 'このリクエストは許可されていません'
        });
      }

      next();
    };
  }
}
```

### 4. 🎯 Origin ヘッダーチェック

```typescript
// Origin ヘッダーによる検証
export class OriginChecker {
  static isValidOrigin(
    requestOrigin: string | null,
    allowedOrigins: string[]
  ): boolean {
    if (!requestOrigin) {
      // Origin がない場合は許可（一部のブラウザで正常なリクエストでも送信されない）
      return true;
    }

    return allowedOrigins.includes(requestOrigin);
  }

  // より厳格なOriginチェック
  static strictOriginCheck(
    requestOrigin: string | null,
    allowedOrigins: string[]
  ): boolean {
    if (!requestOrigin) {
      // Origin がない場合は拒否（より厳格）
      return false;
    }

    return allowedOrigins.includes(requestOrigin);
  }
}
```

## 🔧 実装例

### 🎫 CSRFトークンを使った保護

```typescript
// フロントエンド: CSRFトークンの管理
export class CSRFManager {
  private static token: string | null = null;

  // ページロード時にトークンを取得
  static async initializeToken(): Promise<void> {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const data = await response.json();
      this.token = data.csrfToken;
      
      // メタタグにも設定（後で取得できるように）
      const metaTag = document.createElement('meta');
      metaTag.name = 'csrf-token';
      metaTag.content = this.token;
      document.head.appendChild(metaTag);
    } catch (error) {
      console.error('CSRF token initialization failed:', error);
    }
  }

  // 現在のトークンを取得
  static getToken(): string | null {
    if (this.token) {
      return this.token;
    }

    // メタタグから取得を試行
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  }

  // 保護されたAPIリクエスト
  static async protectedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('CSRF token not available');
    }

    const headers = {
      'X-CSRF-Token': token,
      'Content-Type': 'application/json',
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  }

  // フォーム送信時の保護
  static protectForm(formElement: HTMLFormElement): void {
    const token = this.getToken();
    
    if (!token) {
      console.error('CSRF token not available for form protection');
      return;
    }

    // 既存のCSRFトークン入力を削除
    const existingTokenInput = formElement.querySelector('input[name="csrf_token"]');
    if (existingTokenInput) {
      existingTokenInput.remove();
    }

    // 新しいCSRFトークン入力を追加
    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'csrf_token';
    tokenInput.value = token;
    formElement.appendChild(tokenInput);
  }
}

// 使用例
async function createBucketItem(itemData: BucketItem) {
  try {
    const response = await CSRFManager.protectedFetch('/api/bucket-items', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });

    if (!response.ok) {
      throw new Error('Failed to create bucket item');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating bucket item:', error);
    throw error;
  }
}
```

### 🛡️ サーバーサイドでのCSRF検証

```typescript
// Express.js でのCSRF保護ミドルウェア
export class CSRFMiddleware {
  private sessionStore: Map<string, string> = new Map();

  // CSRFトークン生成エンドポイント
  generateTokenEndpoint = (req: Request, res: Response) => {
    const sessionId = req.sessionID || this.generateSessionId();
    const csrfToken = CSRFProtection.generateToken();
    
    // セッションにトークンを保存
    this.sessionStore.set(sessionId, csrfToken);
    
    res.json({ csrfToken });
  };

  // CSRF保護ミドルウェア
  protect = (req: Request, res: Response, next: NextFunction) => {
    // GET, HEAD, OPTIONS は通す（読み取り専用）
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const sessionId = req.sessionID;
    const requestToken = req.headers['x-csrf-token'] as string || req.body.csrf_token;
    
    if (!sessionId) {
      return res.status(403).json({
        error: 'No session found',
        message: 'セッションが見つかりません'
      });
    }

    const sessionToken = this.sessionStore.get(sessionId);
    
    if (!CSRFProtection.verifyToken(sessionToken || '', requestToken || '')) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        message: 'CSRFトークンが無効です'
      });
    }

    next();
  };

  private generateSessionId(): string {
    return crypto.randomUUID();
  }
}

// 使用例
const app = express();
const csrfMiddleware = new CSRFMiddleware();

// CSRFトークン取得
app.get('/api/csrf-token', csrfMiddleware.generateTokenEndpoint);

// 保護されたエンドポイント
app.post('/api/bucket-items', csrfMiddleware.protect, async (req, res) => {
  // CSRF検証を通過したリクエストのみがここに到達
  try {
    const newItem = await createBucketItem(req.body);
    res.json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 🎯 バケットリストアプリでの実装状況

### 🔍 現在の対策

バケットリストアプリでは以下のCSRF対策が実装されています：

```typescript
// 1. SameSite=Strict Cookie 設定
document.cookie = `${name}=...; SameSite=strict; Secure; HttpOnly`;

// 2. Supabase による自動的なCSRF保護
// Supabase は内部的にCSRF対策を実装している

// 3. セキュアな認証フロー
const { error } = await supabase.auth.signInWithPassword({
  email: email.toLowerCase().trim(),
  password,
});
```

### 🔧 追加可能な対策

```typescript
// より厳格なCSRF対策を追加する場合
export class EnhancedCSRFProtection {
  // ダブルサブミット Cookie パターン
  static setDoubleSubmitCookie(): string {
    const token = CSRFProtection.generateToken();
    
    // Cookie に設定
    document.cookie = `csrf_token=${token}; SameSite=Strict; Secure; Path=/`;
    
    // フォームやAjaxリクエストでも同じ値を送信
    return token;
  }

  // カスタムヘッダーによる検証
  static addCustomHeader(): Record<string, string> {
    return {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Custom-Header': 'bucket-list-app'
    };
  }

  // 時間制限付きトークン
  static generateTimestampedToken(): string {
    const timestamp = Date.now();
    const randomPart = CSRFProtection.generateToken();
    return `${timestamp}.${randomPart}`;
  }

  static verifyTimestampedToken(token: string, maxAge: number = 3600000): boolean {
    try {
      const [timestampStr, randomPart] = token.split('.');
      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      
      // 時間制限チェック
      if (now - timestamp > maxAge) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}
```

## 🚨 CSRF攻撃のテスト

### 🧪 攻撃シミュレーション

```html
<!-- CSRF攻撃のテスト用HTML（テスト環境でのみ使用） -->
<!DOCTYPE html>
<html>
<head>
    <title>CSRF Attack Test</title>
</head>
<body>
    <h1>CSRF攻撃テスト</h1>
    
    <!-- テスト1: 隠れたフォーム送信 -->
    <form id="hiddenAttack" action="http://localhost:3000/api/bucket-items" method="POST" style="display:none;">
        <input name="title" value="攻撃者が追加した項目">
        <input name="category" value="悪意のあるカテゴリ">
    </form>
    
    <!-- テスト2: JavaScriptでのFetch攻撃 -->
    <script>
        // CSRF攻撃のシミュレーション
        function testCSRFAttack() {
            fetch('http://localhost:3000/api/bucket-items', {
                method: 'POST',
                credentials: 'include', // Cookie を含める
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'CSRF攻撃テスト',
                    category: 'test'
                })
            })
            .then(response => {
                if (response.ok) {
                    console.log('❌ CSRF攻撃が成功しました（脆弱性あり）');
                } else if (response.status === 403) {
                    console.log('✅ CSRF攻撃が防がれました（対策有効）');
                }
            })
            .catch(error => {
                console.log('⚠️ CORS エラー（一部の攻撃は防がれる）');
            });
        }
        
        // ページ読み込み時に攻撃を実行
        window.onload = function() {
            testCSRFAttack();
        };
    </script>
</body>
</html>
```

### 🔍 防御の検証

```typescript
// CSRF対策の有効性をテストする関数
export class CSRFTester {
  static async testCSRFProtection(targetUrl: string): Promise<CSRFTestResult> {
    const results: CSRFTestResult = {
      sameSiteProtection: false,
      customHeaderProtection: false,
      tokenProtection: false,
      originProtection: false
    };

    // 1. SameSite Cookie テスト
    try {
      const response1 = await fetch(targetUrl, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ test: 'sameSite' })
      });
      results.sameSiteProtection = response1.status === 403;
    } catch (error) {
      results.sameSiteProtection = true; // CORS エラーも保護効果
    }

    // 2. カスタムヘッダーテスト
    try {
      const response2 = await fetch(targetUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'customHeader' })
      });
      results.customHeaderProtection = response2.status === 403;
    } catch (error) {
      results.customHeaderProtection = true;
    }

    return results;
  }
}

interface CSRFTestResult {
  sameSiteProtection: boolean;
  customHeaderProtection: boolean;
  tokenProtection: boolean;
  originProtection: boolean;
}
```

## 🎯 重要なポイント

### ✅ CSRF対策のベストプラクティス

1. **SameSite=Strict Cookie**: 最も効果的で実装が簡単
2. **CSRFトークン**: 高いセキュリティレベルが必要な場合
3. **Origin/Referrer チェック**: 追加の防御層として
4. **カスタムヘッダー**: 簡単な攻撃を防ぐ補助的手段

### ❌ よくある実装ミス

```typescript
// ❌ 悪い例
function badCSRFImplementation() {
  // Cookie を SameSite=None で設定（CSRF攻撃が可能）
  document.cookie = "session=abc123; SameSite=None; Secure";
  
  // CSRFトークンをクライアントサイドで生成（予測可能）
  const badToken = Date.now().toString();
  
  // GET リクエストで重要な操作を実行（CSRF攻撃が容易）
  app.get('/api/delete-user/:id', deleteUser);
  
  // Referrer チェックなし
  app.post('/api/transfer', transferMoney);
}

// ✅ 良い例
function goodCSRFImplementation() {
  // SameSite=Strict で設定
  document.cookie = "session=abc123; SameSite=Strict; Secure; HttpOnly";
  
  // サーバーサイドで暗号学的に安全なトークンを生成
  const goodToken = crypto.randomBytes(32).toString('hex');
  
  // 重要な操作は POST/PUT/DELETE のみ
  app.post('/api/delete-user', csrfProtection, deleteUser);
  
  // 複数の防御層を組み合わせ
  app.post('/api/transfer', [
    csrfTokenCheck,
    originCheck,
    referrerCheck,
    transferMoney
  ]);
}
```

### 🔧 防御の優先順位

1. **SameSite Cookie** (最優先・最も効果的)
2. **CSRFトークン** (高セキュリティ要求時)
3. **Origin ヘッダーチェック** (補助的)
4. **Referrer ヘッダーチェック** (補助的)
5. **カスタムヘッダー** (基本的な攻撃防止)

## 🚀 次のステップ

CSRF攻撃対策について理解できたら、次は **[レート制限](./rate-limiting.md)** で、ブルートフォース攻撃やDDoS攻撃への対策について学びましょう。

レート制限のアルゴリズム、実装方法、パフォーマンスへの影響などを詳しく学習します。