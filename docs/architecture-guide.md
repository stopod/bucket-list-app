# 🏗️ アプリケーションアーキテクチャガイド

このドキュメントでは、React Router v7 + Supabaseを使用したSSRアプリケーションのアーキテクチャ設計方針と実装パターンについて説明します。

## 🎯 設計方針

### **コア原則**
1. **📖 可読性重視**: シンプルで理解しやすいコード構成
2. **🚀 SSR-first**: サーバーサイドレンダリングを基本とし、必要に応じてクライアント機能を追加
3. **🔧 Feature-based**: 機能単位でのコンポーネント組織化
4. **🎯 Route-based**: ページ固有ロジックはルート近くに配置
5. **🛡️ Layout認証**: レイアウトレベルでの認証制御
6. **📦 最小依存**: 外部ライブラリへの依存を最小限に抑制

## 📁 ディレクトリ構造

```
app/
├── components/
│   └── ui/                           # 汎用UIコンポーネント
│       ├── button.tsx               # ボタンコンポーネント
│       ├── input.tsx                # インプットコンポーネント
│       └── index.ts                 # 再export用インデックス
│
├── features/                         # 機能別モジュール
│   └── auth/                        # 認証機能
│       ├── components/
│       │   └── auth-guard.tsx       # 認証ガード（withAuth HOC）
│       ├── hooks/
│       │   └── use-auth.ts          # 認証フック
│       ├── lib/
│       │   └── auth-context.tsx     # 認証コンテキスト
│       ├── types.ts                 # 認証関連型定義
│       └── index.ts                 # 再export
│
├── shared/                          # 共通モジュール
│   ├── layouts/
│   │   ├── app-layout.tsx           # アプリケーション基本レイアウト
│   │   ├── authenticated-layout.tsx # 認証必須レイアウト
│   │   └── index.ts                 # レイアウトのexport
│   ├── types/
│   │   ├── database.ts              # データベース型定義
│   │   └── index.ts                 # 共通型のexport
│   └── utils/
│       ├── cn.ts                    # クラス名ユーティリティ
│       └── index.ts                 # ユーティリティ関数
│
├── routes/                          # ページルート
│   ├── home.tsx                     # ホームページ
│   ├── login.tsx                    # ログインページ
│   ├── register.tsx                 # 登録ページ
│   ├── instruments.tsx              # 楽器一覧ページ
│   ├── instruments/
│   │   └── types.ts                 # 楽器関連型定義
│   ├── sample.tsx                   # サンプルページ
│   ├── sample/
│   │   └── types.ts                 # サンプル関連型定義
│   └── routes.ts                    # ルート設定
│
└── lib/                             # グローバルライブラリ
    ├── supabase.ts                  # Supabaseクライアント設定
    ├── auth-server.ts               # サーバーサイド認証ユーティリティ
    ├── security-utils.ts            # セキュリティユーティリティ
    └── utils.ts                     # 汎用ユーティリティ
```

## 🎭 コンポーネント分類基準

### **1. UI Components (`components/ui/`)**
```typescript
// ✅ 良い例：汎用的で再利用可能
export function Button({ variant, size, children, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(buttonVariants({ variant, size }))} 
      {...props}
    >
      {children}
    </button>
  );
}

// ❌ 悪い例：特定のビジネスロジックに依存
export function BucketListButton() {
  const { items } = useBucketList(); // ビジネスロジック依存
  return <button>Add Item ({items.length})</button>;
}
```

### **2. Feature Components (`features/*/components/`)**
```typescript
// ✅ 良い例：特定機能のビジネスロジックを含む
export function ItemCard({ item }: { item: BucketListItem }) {
  const { markAsComplete } = useBucketList();
  
  return (
    <Card>
      <CardTitle>{item.title}</CardTitle>
      <Button onClick={() => markAsComplete(item.id)}>
        Complete
      </Button>
    </Card>
  );
}
```

### **3. Page Components (`routes/*/components/`)**
```typescript
// ✅ 良い例：そのページでのみ使用される特殊なレイアウト
export function BucketListHeader() {
  const { user } = useAuth();
  return (
    <header>
      <h1>{user.name}'s Bucket List</h1>
      <CreateNewButton />
    </header>
  );
}
```

## 🔐 認証アーキテクチャ

### **SSR-based認証制御（推奨）**

現在の実装では、サーバーサイドでの認証チェックとクライアントサイドレイアウト制御を組み合わせています：

```typescript
// routes/instruments.tsx（認証必須ページ）
export async function loader({ request }: Route.LoaderArgs) {
  try {
    // サーバーサイド認証チェック
    const { getServerAuth } = await import("~/lib/auth-server");
    const authResult = await getServerAuth(request);
    
    if (!authResult.isAuthenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // 認証済みユーザーのみデータ取得
    const { supabase } = await import("~/lib/supabase");
    const { data: instruments, error } = await supabase
      .from("instruments")
      .select("*");

    return { instruments: instruments || [], error: null };
  } catch (error) {
    // エラーハンドリング
  }
}

export default function InstrumentsPage({ loaderData }: Route.ComponentProps) {
  return (
    <AuthenticatedLayout title="楽器一覧">
      {/* ページコンテンツ */}
    </AuthenticatedLayout>
  );
}
```

### **認証アーキテクチャの構成要素**

```typescript
// lib/auth-server.ts - サーバーサイド認証
export async function getServerAuth(request: Request): Promise<ServerAuthResult> {
  // Cookie-based JWT認証チェック
  // Supabase認証状態の検証
  // ユーザー情報の取得
}

// shared/layouts/authenticated-layout.tsx - クライアントサイドレイアウト
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth();
  
  // SSRで認証済みなので、クライアントサイドでは主にUI制御
  return (
    <div className="min-h-screen bg-gray-50">
      <nav>
        {/* 認証済みユーザー向けナビゲーション */}
      </nav>
      <main>{children}</main>
    </div>
  );
}

// features/auth/lib/auth-context.tsx - 認証状態管理
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // クライアントサイド認証状態の管理
  // Supabaseセッション同期
  // セキュリティ強化機能
}
```

**メリット**:
- 🛡️ **完全なセキュリティ**: サーバーサイドで認証チェック、クライアントサイドでは表示のみ
- ⚡ **高性能**: SSRで認証済みページを直接配信
- 🔒 **Ultra-Secure**: Cookie-based JWT + 多層セキュリティ
- 🎨 **柔軟なUI**: ページごとに適切なレイアウトを選択可能

## 📊 データフェッチパターン

### **SSR-first データ取得**

```typescript
// routes/instruments.tsx
export async function loader({ request }: Route.LoaderArgs) {
  try {
    // サーバーサイド認証チェック
    const { getServerAuth } = await import("~/lib/auth-server");
    const authResult = await getServerAuth(request);
    
    if (!authResult.isAuthenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }

    // SSRでデータ取得
    const { supabase } = await import("~/lib/supabase");
    const { data: instruments, error } = await supabase
      .from("instruments")
      .select("*");

    if (error) {
      console.error("Failed to load instruments:", error.message);
      return {
        instruments: [],
        error: error.message,
      };
    }

    return {
      instruments: instruments || [],
      error: null,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Loader error:", error);
    return {
      instruments: [],
      error: "Server error",
    };
  }
}

export default function InstrumentsPage({ loaderData }: Route.ComponentProps) {
  const { instruments, error } = loaderData;
  
  return (
    <AuthenticatedLayout title="楽器一覧">
      <div className="container mx-auto px-4 py-8">
        {/* コンテンツ */}
      </div>
    </AuthenticatedLayout>
  );
}
```

### **CRUD操作とRevalidation**

```typescript
// routes/bucket-list/new/action.ts
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const title = formData.get('title') as string;
  
  const { error } = await supabase
    .from('bucket_list')
    .insert({ title, user_id: getCurrentUserId() });
    
  if (error) {
    return json({ error: error.message }, { status: 400 });
  }
  
  // シンプルなページリロードでデータを更新
  return redirect('/app/bucket-list');
}
```

**方針**:
- ✅ **作成後**: `redirect()` でリスト画面に戻る
- ✅ **更新後**: `redirect()` でページリロード
- ✅ **削除後**: `redirect()` で一覧に戻る
- ❌ **複雑なキャッシュ**: 使用しない（シンプルさ優先）

## 🏷️ 型定義管理

### **使用場所近接の原則**

```typescript
// ✅ 良い例：使用場所の近くに定義
// routes/instruments/types.ts
import type { Tables } from "~/shared/types/database";

export type Instrument = Tables<"instruments">;

// routes/sample/types.ts  
import type { Tables } from "~/shared/types/database";

export type Profile = Tables<"profiles">;

// features/auth/types.ts
import type { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export interface AuthFormData {
  email: string;
  password: string;
}
```

### **共通型は最小限に**

```typescript
// shared/types/index.ts - 本当に共通なもののみ
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
```

## 🎨 コンポーネント設計パターン

### **Presentation vs Container分離**

```typescript
// ❌ 悪い例：ロジックと見た目が混在
export function BucketListItem({ item }: { item: BucketListItem }) {
  const [loading, setLoading] = useState(false);
  
  const handleComplete = async () => {
    setLoading(true);
    await supabase.from('bucket_list').update({ completed: true });
    setLoading(false);
  };
  
  return (
    <div className={loading ? 'opacity-50' : ''}>
      <h3>{item.title}</h3>
      <button onClick={handleComplete}>Complete</button>
    </div>
  );
}

// ✅ 良い例：ロジックと見た目を分離
// Presentation Component
export function BucketListItemView({ 
  item, 
  loading, 
  onComplete 
}: BucketListItemViewProps) {
  return (
    <div className={loading ? 'opacity-50' : ''}>
      <h3>{item.title}</h3>
      <Button onClick={onComplete} disabled={loading}>
        Complete
      </Button>
    </div>
  );
}

// Container Component (hooks使用)
export function BucketListItem({ item }: { item: BucketListItem }) {
  const { completeItem, loading } = useBucketList();
  
  return (
    <BucketListItemView
      item={item}
      loading={loading}
      onComplete={() => completeItem(item.id)}
    />
  );
}
```

## 🔄 State Management方針

### **React Router標準機能のみ使用**

```typescript
// ✅ データ取得：loader
export async function loader() {
  return json({ items: await getItems() });
}

// ✅ データ更新：action
export async function action({ request }) {
  const result = await updateItem(request);
  return redirect('/app/bucket-list'); // revalidate
}

// ✅ フォーム状態：React標準
export function ItemForm() {
  const [title, setTitle] = useState('');
  const navigate = useNavigate();
  
  return (
    <Form method="post">
      <input 
        name="title" 
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
    </Form>
  );
}
```

**避けるもの**:
- ❌ Zustand, Redux などの状態管理ライブラリ
- ❌ React Query, SWR などのキャッシュライブラリ  
- ❌ 複雑なクライアントサイド状態管理

## 🚀 パフォーマンス戦略

### **SSR最適化**

```typescript
// ✅ 必要最小限のデータ取得
export async function loader() {
  // ページ表示に必要な最小限のデータのみ
  const { data: items } = await supabase
    .from('bucket_list')
    .select('id, title, completed') // 一覧では詳細不要
    .limit(50); // ページネーション
    
  return json({ items });
}
```

### **レスポンシブ対応**

```typescript
// ✅ 同一ページでのレスポンシブ対応
export function BucketListPage() {
  return (
    <div className="container mx-auto px-4">
      {/* モバイル：縦並び、デスクトップ：グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

## 📚 ベストプラクティス

### **1. ファイル命名規則**
```
✅ kebab-case: bucket-list-item.tsx
✅ PascalCase: BucketListItem.tsx (どちらでも可)
❌ snake_case: bucket_list_item.tsx
❌ camelCase: bucketListItem.tsx
```

### **2. Import/Export規則**
```typescript
// ✅ 良い例：re-export用index.ts
// features/bucket-list/index.ts
export { BucketListItem } from './components/item-card';
export { useBucketList } from './hooks/use-bucket-list';
export type { BucketListItem } from './types';

// 使用側
import { BucketListItem, useBucketList } from '@/features/bucket-list';
```

### **3. エラーハンドリング**
```typescript
// ✅ SSRでのエラーハンドリング
export async function loader() {
  try {
    const { data, error } = await supabase.from('bucket_list').select('*');
    
    if (error) {
      throw new Response('Database error', { 
        status: 500,
        statusText: error.message 
      });
    }
    
    return json({ items: data });
  } catch (error) {
    console.error('Loader error:', error);
    throw new Response('Server error', { status: 500 });
  }
}
```

## 🔮 将来の拡張性

### **機能追加時のパターン**

```typescript
// 新機能追加例：カテゴリ機能
features/
├── bucket-list/         # 既存
└── categories/          # 新規追加
    ├── components/
    ├── hooks/
    ├── types.ts
    └── index.ts

routes/
└── app/
    ├── bucket-list/     # 既存
    └── categories/      # 新規追加
        ├── index.tsx
        └── loader.ts
```

### **外部ライブラリ追加時の方針**

```typescript
// ✅ インターフェース経由で依存を抽象化
// lib/email-service.ts
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

class SupabaseEmailService implements EmailService {
  async send(to: string, subject: string, body: string) {
    // Supabase実装
  }
}

// 将来的に他のサービスに変更可能
class SendGridEmailService implements EmailService {
  async send(to: string, subject: string, body: string) {
    // SendGrid実装
  }
}
```

## 📋 実装チェックリスト

### **新規ページ作成時**
- [ ] `routes/` 下に適切な`.tsx`ファイルとして配置
- [ ] 認証が必要な場合はloaderで`getServerAuth()`チェック実装
- [ ] 認証必須ページは`AuthenticatedLayout`、公開ページは`AppLayout`を使用
- [ ] ページ固有の型定義は同名フォルダ内の `types.ts` に配置
- [ ] SSR-firstでデータ取得ロジックを実装

### **新規機能追加時**
- [ ] `features/` 下に機能フォルダを作成
- [ ] `components/`, `hooks/`, `lib/`, `types.ts`, `index.ts` を適切に配置
- [ ] ビジネスロジックはhooksまたはcontextに分離
- [ ] 汎用的なコンポーネントは `components/ui/` への移動を検討
- [ ] 適切なre-exportで外部からのアクセスを制御

### **認証関連実装時**
- [ ] サーバーサイド認証チェックを`lib/auth-server.ts`で実装
- [ ] クライアントサイド認証状態を`features/auth/`で管理
- [ ] Cookie-based JWT認証を適切に実装
- [ ] セキュリティベストプラクティスに従った実装

### **リファクタリング時**
- [ ] SSR-first原則に従っているか
- [ ] 認証チェックがサーバーサイドで適切に実装されているか
- [ ] 型定義が使用場所近接の原則に従っているか
- [ ] セキュリティホールが発生していないか
- [ ] パフォーマンスに悪影響がないか

---

このアーキテクチャにより、**可読性が高く、保守しやすく、拡張性のあるSSRアプリケーション**を構築できます。新機能追加時や機能変更時は、この方針に従って実装することで、一貫性のあるコードベースを維持できます。