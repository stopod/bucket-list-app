# 認証システム完全ガイド

このドキュメントでは、React Router v7 + Supabaseで実装した認証システムについて、初心者でも理解できるよう詳しく解説します。

## 目次

1. [認証の基本概念](#認証の基本概念)
2. [システム構成](#システム構成)
3. [実装されている認証フロー](#実装されている認証フロー)
4. [シーケンス図](#シーケンス図)
5. [コード解説](#コード解説)
6. [セキュリティについて](#セキュリティについて)
7. [トラブルシューティング](#トラブルシューティング)

## 認証の基本概念

### 認証（Authentication）とは
**認証**は「あなたが誰であるかを証明すること」です。
- 例：メールアドレスとパスワードでログイン
- 目的：本人確認

### 認可（Authorization）とは
**認可**は「あなたが何をできるかを決めること」です。
- 例：管理者のみが設定画面にアクセス可能
- 目的：権限管理

### JWT（JSON Web Token）とは
JWTは認証情報を安全に伝達するためのトークンです。

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**構造：**
- Header（ヘッダー）：トークンの種類と暗号化方式
- Payload（ペイロード）：ユーザー情報と有効期限
- Signature（署名）：改ざん防止のための署名

## システム構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │    │   Supabase      │    │   PostgreSQL    │
│   (React Router) │    │   (Auth Server) │    │   (Database)    │
│                 │    │                 │    │                 │
│ ・ログイン画面    │◄──►│ ・JWT発行       │◄──►│ ・ユーザーデータ  │
│ ・認証状態管理    │    │ ・セッション管理  │    │ ・RLSポリシー   │
│ ・保護されたページ │    │ ・パスワード暗号化│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 実装されている認証フロー

### 1. 新規登録フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant R as React App
    participant S as Supabase
    participant DB as Database
    participant E as Email Service

    U->>R: 新規登録画面を開く
    U->>R: メール・パスワード入力
    R->>R: バリデーション実行
    R->>S: supabase.auth.signUp()
    S->>DB: ユーザー情報保存
    S->>E: 確認メール送信
    S->>R: 登録成功レスポンス
    R->>U: 確認メール送信完了画面
    
    Note over U,E: ユーザーはメールを確認してアカウントを有効化
```

### 2. ログインフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant R as React App
    participant S as Supabase
    participant DB as Database

    U->>R: ログイン画面を開く
    U->>R: メール・パスワード入力
    R->>R: バリデーション実行
    R->>S: supabase.auth.signInWithPassword()
    S->>DB: ユーザー認証
    S->>S: JWT生成
    S->>R: JWT + ユーザー情報
    R->>R: AuthContext更新
    R->>R: ホームページにリダイレクト
    R->>U: ログイン完了
```

### 3. 保護されたページアクセスフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant R as React App
    participant HOC as withAuth HOC
    participant AC as AuthContext
    participant S as Supabase
    participant DB as Database

    U->>R: /instrumentsにアクセス
    R->>HOC: withAuth()でコンポーネントをラップ
    HOC->>AC: 現在の認証状態を確認
    
    alt 認証済みの場合
        AC->>HOC: user情報を返す
        HOC->>R: 元のコンポーネントを表示
        R->>S: データ取得リクエスト
        S->>DB: RLSチェック + データ取得
        DB->>S: データ返却
        S->>R: データ返却
        R->>U: ページ表示
    else 未認証の場合
        AC->>HOC: user = null
        HOC->>R: ログインページにリダイレクト
        R->>U: ログイン画面表示
    end
```

### 4. ログアウトフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant R as React App
    participant AC as AuthContext
    participant S as Supabase

    U->>R: ログアウトボタンクリック
    R->>AC: signOut()実行
    AC->>S: supabase.auth.signOut()
    S->>S: JWTを無効化
    S->>AC: ログアウト完了
    AC->>R: user = null, session = null
    R->>R: ホームページにリダイレクト
    R->>U: ログアウト完了画面
```

### 5. セッション復元フロー（ページリロード時）

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant R as React App
    participant AC as AuthContext
    participant S as Supabase
    participant LS as LocalStorage

    U->>R: ページリロード
    R->>AC: AuthProvider初期化
    AC->>S: onAuthStateChange()リスナー登録
    S->>LS: 保存されたセッション確認
    
    alt 有効なセッションがある場合
        LS->>S: セッション情報
        S->>S: JWTの有効性確認
        S->>AC: セッション復元完了
        AC->>R: user情報更新
        R->>U: ログイン状態でページ表示
    else セッションがない/無効な場合
        S->>AC: user = null
        AC->>R: 未認証状態更新
        R->>U: ログアウト状態でページ表示
    end
```

## コード解説

### 1. Supabaseクライアント初期化（`app/lib/supabase.ts`）

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**解説：**
- `createClient`：Supabaseとの接続を確立
- `VITE_SUPABASE_URL`：Supabaseプロジェクトのエンドポイント
- `VITE_SUPABASE_ANON_KEY`：公開用の匿名キー（フロントエンドで使用可能）
- `Database`型：TypeScriptでのデータベーススキーマ型定義

### 2. 認証状態管理（`app/lib/auth-context.tsx`）

```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ...認証メソッド
}
```

**解説：**
- **React Context**：アプリ全体で認証状態を共有
- **onAuthStateChange**：Supabaseの認証状態変化を監視
- **useState**：ユーザー情報、セッション、ローディング状態を管理
- **useEffect**：コンポーネントマウント時にリスナーを設定

### 3. 認証保護HOC（`app/lib/with-auth.tsx`）

```typescript
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: WithAuthOptions = {}
) {
  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !user) {
        navigate(redirectTo);  // 未認証の場合リダイレクト
      }
    }, [user, loading, navigate]);

    if (!user) {
      return <LoginPrompt />; // ログイン促進画面
    }

    return <Component {...props} />; // 認証済みの場合、元のコンポーネントを表示
  };
}
```

**解説：**
- **Higher-Order Component**：コンポーネントを別のコンポーネントでラップする手法
- **認証チェック**：ユーザーがログインしているかを確認
- **自動リダイレクト**：未認証時は自動的にログインページへ
- **再利用性**：どのコンポーネントでも簡単に認証保護を追加可能

### 4. 新規登録処理（`app/routes/register.tsx`）

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  // パスワード確認
  if (password !== confirmPassword) {
    setError("パスワードが一致しません");
    return;
  }

  // Supabaseで新規登録
  const { error } = await signUp(email, password);

  if (error) {
    setError(error.message);
  } else {
    // 成功時はログインページへリダイレクト
    navigate("/login", { 
      state: { message: "確認メールを送信しました" }
    });
  }
  
  setLoading(false);
};
```

**解説：**
- **フォームバリデーション**：パスワード確認、必須項目チェック
- **エラーハンドリング**：Supabaseからのエラーを適切に表示
- **ユーザビリティ**：ローディング状態とメッセージ表示

## セキュリティについて

### 1. 実装されているセキュリティ機能

#### a) JWT（JSON Web Token）による認証
- **自動期限切れ**：一定時間で無効になる
- **改ざん防止**：署名により改ざんを検出
- **ステートレス**：サーバー側でセッション管理不要

#### b) Row Level Security（RLS）
Supabaseのデータベースレベルでアクセス制御：

```sql
-- 例：ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can only see own data" ON instruments
FOR ALL USING (auth.uid() = user_id);
```

#### c) パスワード暗号化
- Supabaseが自動的にパスワードをハッシュ化
- bcryptアルゴリズムを使用

#### d) HTTPS通信
- 本番環境では必ずHTTPS使用
- 通信内容の暗号化

### 2. セキュリティベストプラクティス

#### 環境変数の管理
```bash
# 開発環境
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# 本番環境では機密情報管理サービス使用
```

#### パスワードポリシー
```typescript
if (password.length < 6) {
  setError("パスワードは6文字以上である必要があります");
  return;
}
```

#### XSS対策
- Reactが自動的にエスケープ処理
- `dangerouslySetInnerHTML`は使用禁止

#### CSRF対策
- SameSiteクッキー使用
- CORS設定

### 3. 注意すべきポイント

#### JWTの取り扱い
```typescript
// ❌ 悪い例：JWTをlocalStorageに平文保存
localStorage.setItem('token', jwt);

// ✅ 良い例：Supabaseが自動的に安全に管理
// 開発者は直接JWTを扱わない
```

#### 認証状態の確認
```typescript
// ❌ 悪い例：クライアントサイドのみで認証チェック
if (user) {
  // 機密データ表示
}

// ✅ 良い例：サーバーサイドでもRLSで保護
// データベースレベルでアクセス制御
```

## Row Level Security（RLS）の詳細

### RLSとは
データベースの行レベルでアクセス制御を行う仕組みです。

### 設定例

#### 1. テーブル作成時のRLS有効化
```sql
-- instrumentsテーブル作成
CREATE TABLE instruments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
```

#### 2. ポリシー設定
```sql
-- 読み取りポリシー：認証済みユーザーのみ自分のデータを見る
CREATE POLICY "Users can view own instruments" ON instruments
FOR SELECT USING (auth.uid() = user_id);

-- 挿入ポリシー：認証済みユーザーのみデータ作成
CREATE POLICY "Users can insert own instruments" ON instruments
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 更新ポリシー：認証済みユーザーのみ自分のデータを更新
CREATE POLICY "Users can update own instruments" ON instruments
FOR UPDATE USING (auth.uid() = user_id);

-- 削除ポリシー：認証済みユーザーのみ自分のデータを削除
CREATE POLICY "Users can delete own instruments" ON instruments
FOR DELETE USING (auth.uid() = user_id);
```

### RLSの動作
```typescript
// フロントエンドから以下のクエリを実行
const { data } = await supabase
  .from('instruments')
  .select('*');

// 実際のSQL（RLS適用後）
// SELECT * FROM instruments WHERE user_id = '現在のユーザーID';
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 「読み込み中」から進まない
**原因：** 環境変数が正しく設定されていない

**解決方法：**
```bash
# .envファイルを確認
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 2. ログイン後すぐログアウトされる
**原因：** JWTの有効期限切れ、または不正なキー

**解決方法：**
```typescript
// Supabaseプロジェクトの設定確認
// 1. プロジェクトURL
// 2. anon/public key
// 3. JWT設定
```

#### 3. データが取得できない
**原因：** RLSポリシーが正しく設定されていない

**解決方法：**
```sql
-- Supabaseダッシュボードでポリシー確認
-- テーブルのRLS有効化確認
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

#### 4. 「process is not defined」エラー
**原因：** ブラウザ環境で`process.env`を使用

**解決方法：**
```typescript
// ❌ 悪い例
const url = process.env.VITE_SUPABASE_URL;

// ✅ 良い例
const url = import.meta.env.VITE_SUPABASE_URL;
```

### デバッグ方法

#### 1. ブラウザ開発者ツール
```javascript
// コンソールで認証状態確認
console.log(supabase.auth.getUser());
console.log(supabase.auth.getSession());
```

#### 2. Supabaseダッシュボード
- Authentication > Users：ユーザー一覧確認
- Database > Policies：RLSポリシー確認
- API > Logs：エラーログ確認

#### 3. ネットワークタブ
- HTTPリクエスト/レスポンス確認
- 401/403エラーの詳細確認

## まとめ

この認証システムの特徴：

### ✅ 良い点
1. **セキュア**：JWT + RLSによる多層防御
2. **使いやすい**：HOCによる簡単な認証保護
3. **保守しやすい**：Context APIによる状態管理
4. **スケーラブル**：Supabaseのインフラ活用

### 🔧 改善できる点
1. **SSR対応**：サーバーサイドでの認証チェック
2. **多要素認証**：SMS、TOTPなど
3. **ソーシャルログイン**：Google、GitHubなど
4. **監査ログ**：ログイン履歴の記録

### 📚 学習の次のステップ
1. **OAuth 2.0**：外部サービス連携
2. **RBAC**：ロールベースアクセス制御
3. **セッション管理**：Redis使用
4. **セキュリティ監査**：penetration testing

この実装を基に、より高度な認証機能を段階的に追加していくことができます。