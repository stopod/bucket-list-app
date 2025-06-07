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
│   ├── auth/                        # 認証機能
│   │   ├── components/
│   │   │   ├── login-form.tsx       # ログインフォーム
│   │   │   ├── register-form.tsx    # 登録フォーム
│   │   │   └── auth-guard.tsx       # 認証ガード（withAuth HOC）
│   │   ├── hooks/
│   │   │   └── use-auth.ts          # 認証フック
│   │   ├── lib/
│   │   │   ├── auth-context.tsx     # 認証コンテキスト
│   │   │   └── supabase.ts          # Supabase設定
│   │   └── index.ts                 # 再export
│   │
│   └── bucket-list/                 # やりたいことリスト機能
│       ├── components/
│       │   ├── item-card.tsx        # アイテムカード
│       │   ├── item-form.tsx        # アイテムフォーム
│       │   └── item-list.tsx        # アイテムリスト
│       ├── hooks/
│       │   └── use-bucket-list.ts   # リスト操作フック
│       ├── lib/
│       │   └── api.ts               # API呼び出し関数
│       ├── types.ts                 # 型定義
│       └── index.ts                 # 再export
│
├── shared/                          # 共通モジュール
│   ├── layouts/
│   │   ├── app-layout.tsx           # アプリケーション基本レイアウト
│   │   └── authenticated-layout.tsx # 認証必須レイアウト
│   ├── types/
│   │   ├── database.ts              # データベース型定義
│   │   └── index.ts                 # 共通型のexport
│   └── utils/
│       ├── cn.ts                    # クラス名ユーティリティ
│       └── index.ts                 # ユーティリティ関数
│
├── routes/                          # ページルート
│   ├── _index.tsx                   # ホームページ
│   ├── login/
│   │   └── index.tsx                # ログインページ
│   ├── register/
│   │   └── index.tsx                # 登録ページ
│   │
│   └── bucket-list/                 # やりたいことリスト
│       ├── index.tsx                # 一覧ページ
│       ├── loader.ts                # データ取得ロジック
│       ├── new/
│       │   ├── index.tsx            # 新規作成ページ
│       │   └── action.ts            # 作成アクション
│       ├── $id/
│       │   ├── index.tsx            # 詳細・編集ページ
│       │   └── action.ts            # 更新・削除アクション
│       ├── components/              # ページ固有コンポーネント
│       │   ├── list-header.tsx      # リストヘッダー
│       │   └── filter-bar.tsx       # フィルターバー
│       └── types.ts                 # ページ固有型定義
│
└── lib/                             # グローバルライブラリ
    ├── supabase.ts                  # Supabaseクライアント設定
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

### **Layout Level認証制御**

```typescript
// react-router.config.ts
export default {
  routes: [
    // 認証不要ルート
    { path: "/", element: <HomePage /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegisterPage /> },
    
    // 認証必須ルート（Layout Levelで制御）
    {
      path: "/app",
      element: <AuthenticatedLayout><Outlet /></AuthenticatedLayout>,
      children: [
        { 
          path: "bucket-list", 
          element: <Outlet />,
          children: [
            { index: true, element: <BucketListPage /> },
            { path: "new", element: <NewBucketListPage /> },
            { path: ":id", element: <BucketListDetailPage /> },
          ]
        }
      ]
    }
  ]
} satisfies Config;
```

**メリット**:
- 🛡️ **一括管理**: 認証制御の漏れがない
- 📝 **コード削減**: 各ページで認証コードを書く必要がない
- 🎨 **UI統一**: 認証後のレイアウトが自動で統一される

## 📊 データフェッチパターン

### **SSR-first データ取得**

```typescript
// routes/bucket-list/loader.ts
export async function loader({ request }: LoaderFunctionArgs) {
  // SSRでデータ取得
  const { data: items, error } = await supabase
    .from('bucket_list')
    .select('*');
    
  if (error) {
    throw new Response('Failed to load items', { status: 500 });
  }
  
  return json({ items });
}

// routes/bucket-list/index.tsx
export default function BucketListPage() {
  const { items } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <ItemList items={items} />
    </div>
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
// routes/bucket-list/types.ts
export interface BucketListItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
  user_id: string;
}

export interface BucketListFormData {
  title: string;
  description?: string;
}

// features/bucket-list/types.ts
export interface BucketListHookReturn {
  items: BucketListItem[];
  loading: boolean;
  createItem: (data: BucketListFormData) => Promise<void>;
  updateItem: (id: string, data: BucketListFormData) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
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
- [ ] `routes/` 下に適切なディレクトリ構造で配置
- [ ] 必要に応じて `loader.ts` / `action.ts` を分離
- [ ] 認証が必要な場合は `AuthenticatedLayout` 下に配置
- [ ] ページ固有のコンポーネントは `components/` フォルダに
- [ ] 型定義は使用場所近くの `types.ts` に

### **新規機能追加時**
- [ ] `features/` 下に機能フォルダを作成
- [ ] `components/`, `hooks/`, `types.ts`, `index.ts` を適切に配置
- [ ] ビジネスロジックはcontainer componentまたはhooksに分離
- [ ] 汎用的なコンポーネントは `components/ui/` への移動を検討

### **リファクタリング時**
- [ ] コンポーネントの責任が明確に分離されているか
- [ ] 型定義が適切な場所に配置されているか
- [ ] 不要な props drilling が発生していないか
- [ ] SSRとCSRの境界が適切に設定されているか

---

このアーキテクチャにより、**可読性が高く、保守しやすく、拡張性のあるSSRアプリケーション**を構築できます。新機能追加時や機能変更時は、この方針に従って実装することで、一貫性のあるコードベースを維持できます。