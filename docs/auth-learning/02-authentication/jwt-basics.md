# JWT の基礎

## 🎯 学習目標

- JWT (JSON Web Token) の構造と仕組みを理解する
- なぜ JWT が Web アプリケーションで使われるのかを知る
- JWT のメリット・デメリットを理解する
- バケットリストアプリでの JWT の使用方法を学ぶ

## 🎫 JWT とは何か

### 📝 基本概念

**JWT (JSON Web Token)** は、情報を安全に送信するためのコンパクトで自己完結型のトークン形式です。

```
簡単に言うと...
🎫 映画のチケット のようなもの

映画のチケット = 映画館への入場権 + 座席情報 + 有効期限
JWT = アプリへのアクセス権 + ユーザー情報 + 有効期限
```

### 🔍 JWT の構造

JWT は **3つの部分** で構成されています：

```
xxxxx.yyyyy.zzzzz
  ↓     ↓     ↓
Header.Payload.Signature
```

#### 実際の JWT の例

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

## 🧩 JWT の3つの部分

### 1. 📄 Header（ヘッダー）

**トークンのタイプと暗号化アルゴリズムを指定**

```json
{
  "alg": "HS256",  // 暗号化アルゴリズム
  "typ": "JWT"     // トークンタイプ
}
```

これが Base64 でエンコードされて：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

### 2. 📦 Payload（ペイロード）

**ユーザー情報や権限などの実際のデータ**

```json
{
  "sub": "1234567890",        // Subject（ユーザーID）
  "name": "John Doe",         // ユーザー名
  "email": "john@example.com", // メールアドレス
  "iat": 1516239022,          // 発行時刻
  "exp": 1516242622           // 有効期限
}
```

これが Base64 でエンコードされて：
```
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
```

### 3. 🔐 Signature（署名）

**トークンが改ざんされていないことを証明**

```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + 
  base64UrlEncode(payload),
  secret  // サーバーだけが知っている秘密鍵
)
```

これにより：
```
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

## 🔄 JWT の動作フロー

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant C as 💻 クライアント
    participant S as 🛡️ サーバー
    participant DB as 💾 データベース

    Note over U,DB: 1. ログイン
    U->>C: ID・パスワード入力
    C->>S: 認証情報送信
    S->>DB: ユーザー確認
    DB-->>S: ユーザー情報
    S->>S: JWT 作成
    S-->>C: JWT 返却

    Note over U,DB: 2. 認証が必要なリクエスト
    U->>C: 保護されたページにアクセス
    C->>S: リクエスト + JWT
    S->>S: JWT 検証
    alt JWT が有効
        S-->>C: データ返却
        C-->>U: ページ表示
    else JWT が無効
        S-->>C: 認証エラー
        C-->>U: ログインページにリダイレクト
    end
```

## 🎯 バケットリストアプリでの JWT 使用

### 🔍 Supabase での JWT 実装

私たちのプロジェクトでは **Supabase** が JWT を自動的に管理しています：

```typescript
// app/features/auth/lib/auth-context.tsx より
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (data.session) {
    // Supabase が自動的に JWT を生成
    const jwtToken = data.session.access_token;
    console.log("JWT Token:", jwtToken);
    
    // JWT をCookie に保存
    setAuthCookie('supabase.auth.token', jwtToken);
  }

  return { error };
};
```

### 🍪 JWT の保存方法

バケットリストアプリでは JWT を **Cookie** に保存しています：

```typescript
// app/features/auth/lib/auth-context.tsx より
const signOut = async () => {
  try {
    await supabase.auth.signOut();

    // Cookie から JWT を削除
    document.cookie.split(";").forEach((cookie) => {
      const [name] = cookie.split("=");
      if (name.trim().includes("supabase")) {
        document.cookie = `${name.trim()}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=strict`;
      }
    });
  } catch (error) {
    console.error("Sign out error:", error);
  }
};
```

### 🛡️ サーバーサイドでの JWT 検証

```typescript
// app/lib/auth-server.ts より
export async function getServerAuth(request: Request): Promise<ServerAuthResult> {
  try {
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = parseCookies(cookieHeader);

    // Cookie から JWT を取得
    const { access_token } = extractSupabaseTokens(cookies);
    
    if (!access_token) {
      return { user: null, isAuthenticated: false, session: null };
    }

    // JWT を検証してユーザー情報を取得
    const user = await validateJwtToken(access_token);
    
    if (!user) {
      return { user: null, isAuthenticated: false, session: null };
    }

    return { user, isAuthenticated: true, session: {...} };
  } catch (error) {
    return { user: null, isAuthenticated: false, session: null };
  }
}
```

## 💡 JWT のメリット・デメリット

### ✅ メリット

#### 1. **ステートレス**
```
従来のセッション方式:
サーバー: 「ユーザーAのセッション情報を覚えておこう」
↓ サーバーがダウンすると...
サーバー: 「あれ？ユーザーA って誰だっけ？」

JWT 方式:
ユーザー: 「私は○○です（JWT を提示）」
サーバー: 「JWT を確認します... はい、本人ですね」
↓ サーバーがダウンして復旧しても...
サーバー: 「JWT を確認します... はい、本人ですね」（継続利用可能）
```

#### 2. **クロスドメイン対応**
```
example.com でログイン → JWT 取得
api.example.com にアクセス → 同じ JWT で認証可能
```

#### 3. **情報の自己完結性**
```
JWT の中にユーザー情報が含まれている
→ データベースにアクセスしなくてもユーザーを特定可能
→ パフォーマンス向上
```

### ❌ デメリット

#### 1. **トークンの無効化が困難**
```
問題のシナリオ:
1. ユーザーがログイン → JWT 発行
2. JWT が盗まれる
3. 管理者が「このユーザーを即座にブロックしたい」
4. しかし、JWT は有効期限まで使用可能 😱

対策:
- 短い有効期限設定（1時間など）
- リフレッシュトークンの仕組み
- ブラックリスト管理
```

#### 2. **トークンサイズが大きい**
```
Cookie: session_id=abc123 (小さい)
JWT: eyJhbGciOiJIUzI1NiIs... (大きい、ユーザー情報含む)

→ リクエストごとに大きなデータを送信
→ 通信量増加
```

#### 3. **セキュリティリスク**
```
JWT は署名されているが暗号化されていない
→ Base64 デコードすれば中身が見える
→ 機密情報は含めてはいけない

❌ 悪い例: JWT にクレジットカード番号を含める
✅ 良い例: JWT にはユーザーID のみ含める
```

## 🔍 JWT の中身を見てみよう

### 🧪 実際のデコード例

バケットリストアプリで発行される JWT を見てみましょう：

```typescript
// 開発者ツールのコンソールで実行可能
function decodeJWT(token: string) {
  const parts = token.split('.');
  
  // Header をデコード
  const header = JSON.parse(atob(parts[0]));
  console.log('Header:', header);
  
  // Payload をデコード
  const payload = JSON.parse(atob(parts[1]));
  console.log('Payload:', payload);
  
  // Signature は秘密鍵なしでは検証できない
  console.log('Signature:', parts[2]);
}

// 使用例
const jwt = localStorage.getItem('supabase.auth.token');
if (jwt) {
  decodeJWT(jwt);
}
```

#### 実際の出力例

```javascript
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "aud": "authenticated",
  "exp": 1640995200,      // 有効期限（UNIX タイムスタンプ）
  "sub": "12345678-1234-1234-1234-123456789012",  // ユーザーID
  "email": "user@example.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {},
  "role": "authenticated",
  "aal": "aal1",
  "amr": [{"method": "password", "timestamp": 1640991600}],
  "session_id": "87654321-4321-4321-4321-210987654321"
}

Signature: "HqzF8FKf2QT5fwpMeJf36POk6yJV_adQssw5c..."
```

## 🛡️ JWT のセキュリティ対策

### 1. **有効期限の設定**

```typescript
// バケットリストアプリでの期限チェック
const validateSession = useCallback((session: Session | null): boolean => {
  if (!session) return false;

  // JWT の有効期限チェック
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at < now) {
    console.warn("Session expired");
    return false;
  }

  return true;
}, []);
```

### 2. **安全な保存**

```typescript
// セキュアな Cookie 設定
document.cookie = `supabase.auth.token=${token}; Path=/; Expires=${expires}; SameSite=strict; Secure; HttpOnly`;
```

### 3. **定期的な検証**

```typescript
// 定期的なセッションチェック（5分ごと）
useEffect(() => {
  const interval = setInterval(async () => {
    if (session) {
      const isValid = await validateSession(session);
      if (!isValid) {
        await signOut();
      }
    }
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, [session, validateSession]);
```

## 🎯 重要なポイント

### ✅ 覚えておくべきこと

1. **JWT は自己完結型**: ユーザー情報がトークン内に含まれる
2. **署名で改ざん検出**: Signature で真正性を保証
3. **有効期限が重要**: 適切な期限設定でセキュリティを保つ
4. **機密情報は含めない**: JWT は暗号化されていない

### ❌ よくある間違い

```typescript
// ❌ 悪い例: 機密情報を JWT に含める
const payload = {
  userId: "123",
  creditCard: "1234-5678-9012-3456",  // 危険！
  password: "secret123"                 // 危険！
};

// ✅ 良い例: 最小限の情報のみ
const payload = {
  userId: "123",
  email: "user@example.com",
  role: "user",
  exp: Math.floor(Date.now() / 1000) + 3600  // 1時間後に期限切れ
};
```

## 🚀 次のステップ

JWT の基礎が理解できたら、次は **[セッション管理](./session-management.md)** で、JWT を使ったセッション管理の実装について詳しく学びましょう。

ログイン状態をどのように管理し、セキュリティを保つかを具体的に学習します。