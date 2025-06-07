# 認証システム 学習課題とクイズ

このドキュメントでは、認証システムの理解を深めるための実践的な課題とクイズを提供します。

## 目次

1. [基礎知識クイズ](#基礎知識クイズ)
2. [実践課題](#実践課題)
3. [デバッグ練習](#デバッグ練習)
4. [発展課題](#発展課題)
5. [解答例](#解答例)

## 基礎知識クイズ

### Q1: 認証の基本概念
以下の説明で正しいものを選んでください：

A) 認証は「何ができるか」を決める仕組みである
B) 認可は「誰であるか」を確認する仕組みである  
C) JWTはサーバーサイドでセッション管理を行う仕組みである
D) 認証は「誰であるか」を確認し、認可は「何ができるか」を決める仕組みである

### Q2: JWTの構造
JWTは3つの部分で構成されています。正しい組み合わせを選んでください：

A) Header, Body, Footer
B) Header, Payload, Signature
C) Type, Data, Hash
D) Meta, Content, Checksum

### Q3: Supabaseの認証機能
Supabaseの認証で使用されるキーについて、正しい説明を選んでください：

A) anon keyは秘密鍵でサーバーサイドでのみ使用する
B) service_role keyはフロントエンドで使用する公開鍵である
C) anon keyは公開鍵でフロントエンドで使用できる
D) すべてのキーはフロントエンドで使用できる

### Q4: Row Level Security (RLS)
RLSについて正しい説明を選んでください：

A) テーブル全体へのアクセスを制御する機能
B) 行レベルでのアクセス制御を行う機能
C) カラムレベルでのアクセス制御を行う機能
D) データベース全体へのアクセスを制御する機能

### Q5: React Contextの使用理由
認証状態管理にReact Contextを使用する主な理由は：

A) パフォーマンスが向上するため
B) アプリ全体で認証状態を共有するため
C) メモリ使用量を削減するため
D) SEOが向上するため

## 実践課題

### 課題1: パスワードリセット機能の実装

**目標：** パスワードリセット機能を実装してください。

**要件：**
1. パスワードリセットページ（`/reset-password`）を作成
2. メールアドレス入力フォーム
3. Supabaseのパスワードリセット機能を使用
4. 適切なエラーハンドリング
5. 成功時のメッセージ表示

**ヒント：**
```typescript
// Supabaseのパスワードリセット
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'http://localhost:3000/update-password'
});
```

**実装してみよう：**

```typescript
// app/routes/reset-password.tsx
import { useState } from "react";
import { useAuth } from "~/lib/auth-context";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function ResetPassword() {
  // ここに実装を追加してください
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* フォームを実装してください */}
    </div>
  );
}
```

### 課題2: プロフィール編集機能

**目標：** ユーザープロフィール編集機能を実装してください。

**要件：**
1. 認証済みユーザーのみアクセス可能
2. 現在のメールアドレスを表示
3. 新しいメールアドレスの変更機能
4. パスワード変更機能
5. 変更内容の保存

**実装してみよう：**

```typescript
// app/routes/profile.tsx
import { useAuth } from "~/lib/auth-context";

function ProfileComponent() {
  const { user, updateProfile } = useAuth();
  
  // ここに実装を追加してください
  
  return (
    <div>
      {/* プロフィール編集フォームを実装してください */}
    </div>
  );
}

export default withAuth(ProfileComponent);
```

### 課題3: ログイン履歴の表示

**目標：** ユーザーのログイン履歴を表示する機能を実装してください。

**要件：**
1. Supabaseでログイン履歴テーブルを作成
2. ログイン時に履歴を記録
3. 履歴一覧ページの作成
4. 日時、IPアドレス、デバイス情報の表示

**データベーススキーマ例：**
```sql
CREATE TABLE login_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  login_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE
);

-- RLS設定
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history" ON login_history
FOR SELECT USING (auth.uid() = user_id);
```

### 課題4: アクティブセッション管理

**目標：** ユーザーがアクティブなセッションを管理できる機能を実装してください。

**要件：**
1. 現在のアクティブセッション一覧
2. 他のデバイスからのセッション終了機能
3. セッション情報（デバイス、場所、最終アクセス時刻）の表示

## デバッグ練習

### 問題1: 無限リダイレクトループ

以下のコードで無限リダイレクトが発生しています。原因と修正方法を説明してください：

```typescript
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (loading) return <div>Loading...</div>;
  
  return <div>Protected Content</div>;
}
```

### 問題2: JWTエラー

ユーザーが「JWT expired」エラーでアクセスできなくなっています。どのような原因が考えられ、どう対処しますか？

### 問題3: RLSポリシーエラー

以下のエラーが発生しています。原因と修正方法を説明してください：

```
new row violates row-level security policy for table "instruments"
```

使用しているコード：
```typescript
const { data, error } = await supabase
  .from('instruments')
  .insert({ name: 'Guitar' });
```

## 発展課題

### 課題1: 多要素認証（MFA）の実装

**目標：** TOTP（Time-based One-Time Password）を使用した多要素認証を実装してください。

**要件：**
1. QRコード生成
2. 認証アプリでの設定
3. ログイン時の2段階認証
4. バックアップコードの生成

### 課題2: ソーシャルログインの実装

**目標：** Google OAuth を使用したソーシャルログインを実装してください。

**要件：**
1. Google OAuth設定
2. ソーシャルログインボタン
3. アカウント連携機能
4. 既存アカウントとの統合

### 課題3: 管理者ダッシュボード

**目標：** 管理者用のユーザー管理ダッシュボードを実装してください。

**要件：**
1. ロールベースアクセス制御
2. ユーザー一覧表示
3. ユーザーの有効/無効切り替え
4. ログイン履歴の確認

### 課題4: セキュリティ監査ログ

**目標：** セキュリティイベントの監査ログ機能を実装してください。

**要件：**
1. 失敗したログイン試行の記録
2. 疑わしいアクティビティの検出
3. アラート機能
4. レポート生成

## 解答例

### 基礎知識クイズ解答

**Q1: D** - 認証は「誰であるか」を確認し、認可は「何ができるか」を決める仕組みです。

**Q2: B** - JWTはHeader、Payload、Signatureの3つの部分で構成されています。

**Q3: C** - anon keyは公開鍵でフロントエンドで使用できます。service_role keyは秘密鍵でサーバーサイドでのみ使用します。

**Q4: B** - RLSは行レベルでのアクセス制御を行う機能です。

**Q5: B** - アプリ全体で認証状態を共有するためにReact Contextを使用します。

### 課題1解答例: パスワードリセット機能

```typescript
// app/routes/reset-password.tsx
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/lib/auth-context";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message);
      } else {
        setMessage("パスワードリセットメールを送信しました。メールを確認してください。");
        setEmail("");
      }
    } catch (err) {
      setError("予期しないエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            パスワードリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            メールアドレスを入力してください
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <Input
              type="email"
              required
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center">{message}</div>
          )}

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "送信中..." : "リセットメールを送信"}
            </Button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-500">
              ログインページに戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### デバッグ練習解答

**問題1解答：**
無限リダイレクトの原因は、`loading`状態がtrueの間もリダイレクトが実行されることです。

**修正版：**
```typescript
useEffect(() => {
  if (!loading && !user) {  // loadingがfalseになってから判定
    navigate('/login');
  }
}, [user, loading, navigate]);
```

**問題2解答：**
JWT期限切れの対処法：
1. Supabaseが自動的にトークンを更新
2. ユーザーに再ログインを促す
3. リフレッシュトークンの確認

**問題3解答：**
RLSポリシーエラーの原因：
1. `user_id`カラムが設定されていない
2. 適切なINSERTポリシーが設定されていない

**修正版：**
```typescript
const { data, error } = await supabase
  .from('instruments')
  .insert({ 
    name: 'Guitar',
    user_id: user.id  // ユーザーIDを明示的に設定
  });
```

これらの課題を通じて、認証システムの実装スキルを段階的に向上させることができます。各課題は実際のプロジェクトでよく遭遇する問題に基づいています。