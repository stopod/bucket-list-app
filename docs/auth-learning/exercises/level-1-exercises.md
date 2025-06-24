# Level 1 実習: 基礎概念

## 🎯 学習目標

- 認証と認可の違いを実際のコードで確認する
- JWT の構造を解析し、理解を深める
- セッション管理の基本的な仕組みを体験する
- バケットリストアプリの認証フローを分析する

## ⏱️ 想定時間

- **基本課題**: 30分
- **発展課題**: 30分
- **合計**: 1時間

## 📋 事前準備

```bash
# 開発サーバーが起動していることを確認
npm run dev

# ブラウザで http://localhost:3000 にアクセス
# ログイン/ログアウトができることを確認
```

---

## 🔍 課題 1-1: 認証と認可の違いを確認

### 📝 目標
バケットリストアプリで認証（Authentication）と認可（Authorization）がどのように実装されているかを確認する。

### 📂 対象ファイル
- `app/features/auth/lib/auth-context.tsx`
- `app/routes/_authenticated.tsx` 
- `app/features/auth/components/auth-guard.tsx`

### 🔧 手順

#### ステップ 1: 認証機能の確認
```typescript
// 1. app/features/auth/lib/auth-context.tsx を開く
// 2. signIn 関数を見つけて、以下の質問に答える

/**
 * Q1: signIn 関数は何を確認していますか？
 * Q2: 認証成功時に何が保存されますか？
 * Q3: 認証失敗時はどのような処理になりますか？
 */

// 3. 以下のコードブロックを見つけて、コメントを追加する
const signIn = async (email: string, password: string) => {
  try {
    // TODO: ここにコメントを追加 - この処理は認証？認可？
    if (!email || !password) {
      return { error: { message: "メールアドレスとパスワードは必須です" } };
    }

    // TODO: ここにコメントを追加 - この処理の目的は？
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    return { error };
  } catch (error) {
    // エラー処理
  }
};
```

#### ステップ 2: 認可機能の確認
```typescript
// 1. app/routes/_authenticated.tsx を開く
// 2. loader 関数を確認する

/**
 * Q4: この loader 関数は認証と認可のどちらを担当していますか？
 * Q5: 未認証ユーザーはどこにリダイレクトされますか？
 * Q6: 認証済みユーザーには何の情報が渡されますか？
 */

// 3. 以下のようなコメントを追加
export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: この処理の分類を記入 (認証 or 認可)
  const session = await getSession(request.headers.get("Cookie"));
  
  // TODO: この判定は何をチェックしている？
  if (!session?.user) {
    throw redirect("/auth/signin");
  }
  
  // TODO: この戻り値の意味は？
  return json({ user: session.user });
}
```

#### ステップ 3: 実際の動作確認
```bash
# 1. ブラウザでアプリを開く
# 2. 未認証状態で /dashboard にアクセス
# 3. ログイン後に /dashboard にアクセス
# 4. 開発者ツールのネットワークタブでリクエストを確認
```

### ✅ 確認ポイント
- [ ] 認証と認可の違いをコードで説明できる
- [ ] 未認証時のリダイレクト動作を確認できた
- [ ] 認証情報がどこに保存されるかを理解した

---

## 🔍 課題 1-2: JWT の構造解析

### 📝 目標
実際のJWTトークンを解析して、ヘッダー・ペイロード・署名の構造を理解する。

### 🔧 手順

#### ステップ 1: JWT の取得
```typescript
// 1. ログイン後、ブラウザの開発者ツールを開く
// 2. Application タブ → Cookies を確認
// 3. supabase 関連の Cookie を見つける

// 4. または、以下のコードを一時的に追加してコンソールに出力
// app/features/auth/lib/auth-context.tsx の signIn 関数内に追加

const signIn = async (email: string, password: string) => {
  try {
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    // 🔍 JWT 確認用（実習後は削除）
    if (data?.session?.access_token) {
      console.log('JWT Token:', data.session.access_token);
      console.log('Expires at:', data.session.expires_at);
    }

    return { error };
  } catch (error) {
    // エラー処理
  }
};
```

#### ステップ 2: JWT の手動解析
```javascript
// ブラウザのコンソールで以下を実行

// 1. JWT を3つの部分に分割
const jwtToken = "YOUR_JWT_TOKEN_HERE"; // 上記で取得したトークンを入力
const parts = jwtToken.split('.');

console.log('JWT Parts:', {
  header: parts[0],
  payload: parts[1], 
  signature: parts[2]
});

// 2. ヘッダーをデコード
const header = JSON.parse(atob(parts[0]));
console.log('Header:', header);

// 3. ペイロードをデコード
const payload = JSON.parse(atob(parts[1]));
console.log('Payload:', payload);

// 4. 署名は暗号化されているので表示のみ
console.log('Signature (base64):', parts[2]);
```

#### ステップ 3: JWT 解析ツールの作成
```typescript
// 新しいファイル: app/utils/jwt-analyzer.ts を作成

/**
 * JWT解析ユーティリティ（学習用）
 */
export interface JWTAnalysis {
  header: any;
  payload: any;
  signature: string;
  isExpired: boolean;
  expiresAt?: Date;
  issuedAt?: Date;
}

export function analyzeJWT(token: string): JWTAnalysis {
  try {
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // ヘッダーデコード
    const header = JSON.parse(atob(parts[0]));
    
    // ペイロードデコード
    const payload = JSON.parse(atob(parts[1]));
    
    // 有効期限チェック
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;
    
    return {
      header,
      payload,
      signature: parts[2],
      isExpired,
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
      issuedAt: payload.iat ? new Date(payload.iat * 1000) : undefined
    };
  } catch (error) {
    throw new Error(`JWT analysis failed: ${error.message}`);
  }
}

// 使用例
export function logJWTAnalysis(token: string): void {
  try {
    const analysis = analyzeJWT(token);
    
    console.group('🔍 JWT Analysis');
    console.log('Header:', analysis.header);
    console.log('Payload:', analysis.payload);
    console.log('Signature:', analysis.signature);
    console.log('Is Expired:', analysis.isExpired);
    console.log('Expires At:', analysis.expiresAt);
    console.log('Issued At:', analysis.issuedAt);
    console.groupEnd();
  } catch (error) {
    console.error('JWT Analysis Error:', error.message);
  }
}
```

### 📊 分析レポート作成
```typescript
// 以下の質問に答えて、JWTの理解を深める

/**
 * JWT分析レポート
 * 
 * Q1: ヘッダーには何の情報が含まれていますか？
 * A1: [ここに回答]
 * 
 * Q2: ペイロードに含まれる主要なクレーム（claims）は何ですか？
 * A2: [ここに回答]
 * 
 * Q3: exp (expiration time) の値は何を表していますか？
 * A3: [ここに回答]
 * 
 * Q4: sub (subject) クレームには何が設定されていますか？
 * A4: [ここに回答]
 * 
 * Q5: このJWTはどのくらいの期間有効ですか？
 * A5: [ここに回答]
 */
```

### ✅ 確認ポイント
- [ ] JWT の3つの部分（ヘッダー、ペイロード、署名）を理解した
- [ ] ペイロードに含まれる情報を確認できた
- [ ] 有効期限の仕組みを理解した
- [ ] 手動でJWTを解析できるようになった

---

## 🔍 課題 1-3: セッション管理の体験

### 📝 目標
ブラウザでの認証状態の保存・復元・削除の仕組みを理解する。

### 🔧 手順

#### ステップ 1: 認証状態の確認
```typescript
// 1. app/features/auth/lib/auth-context.tsx を確認
// 2. 認証状態がどのように管理されているかを調べる

// 3. 以下のデバッグ用コードを一時的に追加
export function AuthProvider({ children, user: initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false);

  // 🔍 デバッグ: 認証状態の変化をログ出力
  useEffect(() => {
    console.log('🔐 Auth State Changed:', {
      user: user ? { id: user.id, email: user.email } : null,
      loading,
      timestamp: new Date().toISOString()
    });
  }, [user, loading]);

  // 残りの実装...
}
```

#### ステップ 2: Cookie と localStorage の確認
```javascript
// ブラウザのコンソールで実行

// 1. Cookie の確認
console.log('🍪 All Cookies:', document.cookie);

// 2. localStorage の確認  
console.log('💾 localStorage:', {
  length: localStorage.length,
  keys: Object.keys(localStorage),
  supabaseKeys: Object.keys(localStorage).filter(key => key.includes('supabase'))
});

// 3. sessionStorage の確認
console.log('📝 sessionStorage:', {
  length: sessionStorage.length,
  keys: Object.keys(sessionStorage)
});
```

#### ステップ 3: 認証状態の操作実験
```typescript
// 新しいファイル: app/components/auth-debugger.tsx を作成（学習用）

import { useState } from 'react';
import { useAuth } from '~/features/auth/lib/auth-context';

export function AuthDebugger() {
  const { user, loading, signOut } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkAuthState = () => {
    addLog(`User: ${user ? user.email : 'Not authenticated'}`);
    addLog(`Loading: ${loading}`);
    addLog(`Cookies: ${document.cookie.split(';').length} items`);
    addLog(`localStorage keys: ${Object.keys(localStorage).length}`);
  };

  const clearStorages = () => {
    localStorage.clear();
    sessionStorage.clear();
    addLog('Cleared localStorage and sessionStorage');
  };

  const forceSignOut = async () => {
    try {
      await signOut();
      addLog('Force sign out completed');
    } catch (error) {
      addLog(`Sign out error: ${error.message}`);
    }
  };

  // 本番環境では表示しない
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="font-bold mb-2">🔍 Auth Debugger</h3>
      
      <div className="space-y-2 mb-4">
        <button 
          onClick={checkAuthState}
          className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
        >
          Check Auth State
        </button>
        
        <button 
          onClick={clearStorages}
          className="bg-yellow-500 text-white px-2 py-1 rounded text-sm ml-2"
        >
          Clear Storages
        </button>
        
        <button 
          onClick={forceSignOut}
          className="bg-red-500 text-white px-2 py-1 rounded text-sm ml-2"
        >
          Force Sign Out
        </button>
      </div>

      <div className="bg-gray-100 p-2 rounded text-xs h-32 overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
}
```

#### ステップ 4: 実験手順
```bash
# 以下の手順で認証状態の変化を観察

1. ログイン前の状態確認
   - "Check Auth State" ボタンをクリック
   - 出力を記録

2. ログイン
   - 通常通りログイン
   - 再度 "Check Auth State" をクリック
   - 変化を記録

3. ページリロード
   - F5 でページをリロード
   - 認証状態が維持されるかチェック

4. ストレージクリア実験
   - "Clear Storages" ボタンをクリック
   - ページをリロード
   - 認証状態への影響を確認

5. 手動ログアウト
   - "Force Sign Out" ボタンをクリック
   - 状態変化を確認
```

### 📊 観察レポート
```typescript
/**
 * セッション管理観察レポート
 * 
 * Q1: ログイン前後でどのような情報が保存されましたか？
 * A1: [観察結果を記入]
 * 
 * Q2: ページリロード後も認証状態は維持されましたか？
 * A2: [結果を記入]
 * 
 * Q3: localStorage をクリアすると何が起こりましたか？
 * A3: [結果を記入]
 * 
 * Q4: Cookie のみを削除した場合はどうなりましたか？
 * A4: [結果を記入]
 * 
 * Q5: 認証状態はどの仕組みで永続化されていますか？
 * A5: [結論を記入]
 */
```

### ✅ 確認ポイント
- [ ] 認証状態がどこに保存されるかを理解した
- [ ] ページリロード時の状態復元を確認した
- [ ] ストレージクリアの影響を理解した
- [ ] 手動での状態操作ができるようになった

---

## 🚀 発展課題

### 💡 課題 1-4: 認証フロー図の作成

#### 📝 目標
バケットリストアプリの認証フローを図に整理し、理解を深める。

#### 🔧 手順
1. **フロー図の作成**
   - ログイン〜ログアウトまでの一連の流れを図にする
   - 各ステップでのデータの流れを明記
   - Cookie、localStorage、State の変化を記載

2. **実装の確認**
   - 実際のコードと図を照らし合わせる
   - 不明な点があれば調査・確認

3. **改善案の検討**
   - 現在の実装で改善できる点を考える
   - セキュリティ上の課題があるか検討

### 💡 課題 1-5: 簡易認証システムの実装

#### 📝 目標
学習内容を定着させるため、簡単な認証システムを自分で実装する。

#### 🔧 実装要件
```typescript
// app/features/auth/simple-auth.ts を作成

/**
 * 簡易認証システム（学習用）
 * 
 * 要件:
 * 1. メールアドレス + パスワードでログイン
 * 2. ダミーのユーザーデータベース
 * 3. 成功時はユーザー情報を返す
 * 4. 失敗時は適切なエラーメッセージ
 * 5. セッション管理（localStorage使用）
 */

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class SimpleAuthSystem {
  // ダミーユーザーデータ
  private users: User[] = [
    { id: '1', email: 'test@example.com', name: 'Test User' },
    { id: '2', email: 'admin@example.com', name: 'Admin User' }
  ];

  async signIn(email: string, password: string): Promise<AuthResult> {
    // TODO: 実装してください
    // ヒント: パスワードは "password123" で固定でOK
  }

  signOut(): void {
    // TODO: 実装してください
  }

  getCurrentUser(): User | null {
    // TODO: 実装してください
  }

  isAuthenticated(): boolean {
    // TODO: 実装してください
  }
}
```

### ✅ 発展課題の確認ポイント
- [ ] 認証フローを図で説明できる
- [ ] 簡易認証システムを実装できた
- [ ] 実装の課題と改善点を理解した

---

## 🎯 Level 1 完了チェック

### 📋 理解度確認

以下の質問にすべて答えられれば Level 1 完了です：

1. **認証と認可の違いを説明できますか？**
   - 認証（Authentication）は本人確認
   - 認可（Authorization）は権限確認

2. **JWT の3つの部分とその役割を説明できますか？**
   - Header: アルゴリズム情報
   - Payload: ユーザー情報とクレーム
   - Signature: 改ざん検知用の署名

3. **バケットリストアプリではどこに認証情報が保存されますか？**
   - [あなたの調査結果]

4. **ページリロード後も認証状態が維持される仕組みは？**
   - [あなたの理解]

5. **セキュリティ上、注意すべき点は何ですか？**
   - [あなたの考え]

### 🎉 次のステップ

Level 1 が完了したら、**[Level 2 実習: 認証実装](./level-2-exercises.md)** に進みましょう！

Level 2 では実際にログイン機能を改良し、より深い認証の実装を学習します。