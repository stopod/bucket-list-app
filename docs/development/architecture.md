# アプリケーションアーキテクチャガイド

このドキュメントでは、React Router v7 + Supabaseを使用したSSRアプリケーションのアーキテクチャ設計方針と実装パターンについて説明します。

## 設計方針

### **コア原則**

1. **可読性重視**: シンプルで理解しやすいコード構成
2. **SSR-first**: サーバーサイドレンダリングを基本とし、必要に応じてクライアント機能を追加
3. **Feature-based**: 機能単位でのコンポーネント組織化
4. **Route-based**: ページ固有ロジックはルート近くに配置
5. **Layout認証**: レイアウトレベルでの認証制御
6. **最小依存**: 外部ライブラリへの依存を最小限に抑制
7. **Type-safe Error Handling**: Result型による予測可能なエラーハンドリング
8. **Functional Programming**: 純粋関数とResult型による関数型アプローチ

## ディレクトリ構造

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
│   │   │   └── auth-guard.tsx       # 認証ガード（withAuth HOC）
│   │   ├── hooks/
│   │   │   └── use-auth.ts          # 認証フック
│   │   ├── lib/
│   │   │   └── auth-context.tsx     # 認証コンテキスト
│   │   ├── types.ts                 # 認証関連型定義
│   │   └── index.ts                 # 再export
│   │
│   └── bucket-list/                 # バケットリスト機能
│       ├── services/
│       │   └── bucket-list.service.ts          # 関数型Service（Result型）
│       ├── lib/
│       │   ├── business-logic.ts    # 純粋なビジネスロジック関数
│       │   └── service-factory.ts     # 関数合成DIファクトリ
│       └── types.ts                 # バケットリスト関連型定義
│
├── shared/                          # 共通モジュール
│   ├── layouts/
│   │   ├── app-layout.tsx           # アプリケーション基本レイアウト
│   │   ├── authenticated-layout.tsx # 認証必須レイアウト
│   │   └── index.ts                 # レイアウトのexport
│   ├── types/
│   │   ├── database.ts              # データベース型定義
│   │   ├── result.ts                # Result<T, E>型定義
│   │   ├── errors.ts                # ドメイン別エラー型
│   │   └── index.ts                 # 共通型のexport
│   ├── utils/
│   │   ├── cn.ts                    # クラス名ユーティリティ
│   │   ├── result-helpers.ts        # Result操作ヘルパー関数
│   │   └── index.ts                 # ユーティリティ関数
│   └── hooks/
│       ├── use-operation-base.ts    # 非同期操作基底パターン
│       ├── use-result-operation.ts  # Result対応hooks
│       └── use-async-operation.ts   # 非同期操作hooks
│
├── routes/                          # ページルート
│   ├── auth/                        # 認証関連ページ
│   │   ├── login.tsx                # ログインページ
│   │   └── register.tsx             # 登録ページ
│   ├── home.tsx                     # ホームページ
│   ├── bucket-list/             # バケットリスト機能ページ
│   ├── dashboard/               # ダッシュボードページ
│   └── public/                  # 公開リストページ
│
└── lib/                             # グローバルライブラリ
    ├── supabase.ts                  # Supabaseクライアント設定
    ├── auth-server.ts               # サーバーサイド認証ユーティリティ
    └── security-utils.ts            # セキュリティユーティリティ
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
// routes/instruments/instruments.tsx（認証必須ページ）
export async function loader({ request }: Route.LoaderArgs) {
  try {
    // サーバーサイド認証チェック
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

    if (error) {
      throw new Response("Failed to load instruments", {
        status: 500,
        statusText: error.message,
      });
    }

    return {
      instruments: instruments || [],
      user: authResult.user
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Loader error:", error);
    throw new Response("Server error", { status: 500 });
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
// routes/instruments/instruments.tsx
export async function loader({ request }: Route.LoaderArgs) {
  try {
    // サーバーサイド認証チェック
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
      throw new Response("Failed to load instruments", {
        status: 500,
        statusText: error.message,
      });
    }

    return {
      instruments: instruments || [],
      user: authResult.user
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Loader error:", error);
    throw new Response("Server error", { status: 500 });
  }
}

export default function InstrumentsPage({ loaderData }: Route.ComponentProps) {
  const { instruments } = loaderData;

  return (
    <AuthenticatedLayout title="楽器一覧">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">楽器一覧</h1>
        {instruments.length > 0 ? (
          <div className="max-w-2xl mx-auto">
            <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow">
              {instruments.map((instrument) => (
                <li key={instrument.id} className="p-4 hover:bg-gray-50">
                  <div className="text-lg font-medium text-gray-900">
                    {instrument.name} (ID: {instrument.id})
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              楽器が登録されていません。
            </p>
          </div>
        )}
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
  const title = formData.get("title") as string;

  const { error } = await supabase
    .from("bucket_list")
    .insert({ title, user_id: getCurrentUserId() });

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  // シンプルなページリロードでデータを更新
  return redirect("/app/bucket-list");
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
// features/bucket-list/types.ts
import type { Tables } from "~/shared/types/database";

export type BucketItem = Tables<"bucket_items">;
export type Category = Tables<"categories">;

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
// ✅ データ取得：loader（Result型）
export async function loader() {
  const result = await getUserBucketItems(repository)('user-id');

  if (isFailure(result)) {
    throw new Response('Failed to load items', {
      status: 500,
      statusText: result.error.message
    });
  }

  return json({ items: result.data });
}

// ✅ データ更新：action（Result型）
export async function action({ request }) {
  const formData = await request.formData();
  const result = await createBucketItem(repository)(formData);

  if (isFailure(result)) {
    return json({ error: result.error.message }, { status: 400 });
  }

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
    .from("bucket_list")
    .select("id, title, completed") // 一覧では詳細不要
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

# Result型関連ファイル
✅ result.ts: Result型定義
✅ errors.ts: エラー型定義
✅ result-helpers.ts: Result操作関数
✅ bucket-list.service.ts: 関数型Service
✅ bucket-list.repository.ts: 関数型Repository
✅ business-logic.ts: 純粋関数群
✅ use-operation-base.ts: hooks基底クラス
```

### **2. Import/Export規則**

```typescript
// ✅ 良い例：re-export用index.ts
// features/bucket-list/index.ts
export { BucketListItem } from "./components/item-card";
export { useBucketList } from "./hooks/use-bucket-list";
export type { BucketListItem } from "./types";

// 使用側
import { BucketListItem, useBucketList } from "@/features/bucket-list";
```

### **3. エラーハンドリング**

#### **関数型アプローチ（Result型）**

```typescript
// ✅ Result型によるエラーハンドリング
export async function loader() {
  const result = await getUserBucketItems(repository)("user-id");

  if (isFailure(result)) {
    // 型安全なエラー処理
    switch (result.error.type) {
      case "DatabaseError":
        throw new Response("Database error", { status: 500 });
      case "AuthenticationError":
        throw new Response("Unauthorized", { status: 401 });
      default:
        throw new Response("Server error", { status: 500 });
    }
  }

  return json({ items: result.data });
}

// ✅ 関数型Service関数
const createBucketItem =
  (repository: BucketListRepository) =>
  async (
    data: BucketItemInsert,
  ): Promise<Result<BucketItem, BucketListError>> => {
    // バリデーション
    const validationResult = validateBucketItemInsert(data);
    if (isFailure(validationResult)) {
      return validationResult;
    }

    // データベース操作をResult型でラップ
    return wrapAsync(
      () => repository.create(validationResult.data),
      (error: unknown) => handleRepositoryError(error, "createBucketItem"),
    );
  };
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
type EmailService = {
  send: (to: string, subject: string, body: string) => Promise<Result<void, EmailError>>;
};

// 関数型EmailService作成関数
const createSupabaseEmailService = (supabaseClient: SupabaseClient): EmailService => ({
  send: async (to: string, subject: string, body: string) => {
    // Supabase実装 with Result型
    return wrapAsync(
      () => supabaseClient.functions.invoke('send-email', { body: { to, subject, body } }),
      (error) => createEmailError('SEND_FAILED', error)
    );
  }
});

// 将来的に他のサービスに変更可能
const createSendGridEmailService = (apiKey: string): EmailService => ({
  send: async (to: string, subject: string, body: string) => {
    // SendGrid実装 with Result型
    return wrapAsync(
      () => sendGridApi.send({ to, subject, body }),
      (error) => createEmailError('SEND_FAILED', error)
    );
  }
});

// 関数合成による依存性注入
const createEmailServiceFactory = () => ({
  supabase: createSupabaseEmailService,
  sendgrid: createSendGridEmailService
});
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
- [ ] **関数型アプローチ**: 機能はResult型とビジネスロジック関数で実装
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
- [ ] **Result型移行検討**: 既存機能の関数型アプローチへの段階的移行
- [ ] **純粋関数抽出**: ビジネスロジックの`business-logic.ts`への分離
- [ ] セキュリティホールが発生していないか
- [ ] パフォーマンスに悪影響がないか

## 関数型プログラミング詳細

### Result型によるエラーハンドリング

#### Result型の定義

```typescript
// shared/types/result.ts
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly success: true;
  readonly data: T;
}

export interface Failure<E> {
  readonly success: false;
  readonly error: E;
}

// Type Guards
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> =>
  result.success === true;

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> =>
  result.success === false;

// Constructors
export const success = <T>(data: T): Success<T> => ({
  success: true,
  data,
});

export const failure = <E>(error: E): Failure<E> => ({
  success: false,
  error,
});
```

#### エラー型の定義

```typescript
// shared/types/errors.ts
export interface DomainError {
  readonly type: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ValidationError extends DomainError {
  readonly type: 'ValidationError';
  readonly field?: string;
}

export interface NotFoundError extends DomainError {
  readonly type: 'NotFoundError';
  readonly resource: string;
  readonly id: string;
}

export interface DatabaseError extends DomainError {
  readonly type: 'DatabaseError';
  readonly operation: string;
}

// Error Constructors
export const validationError = (
  message: string,
  field?: string,
  details?: Record<string, unknown>
): ValidationError => ({
  type: 'ValidationError',
  message,
  field,
  details,
});

export const notFoundError = (
  resource: string,
  id: string,
  message?: string
): NotFoundError => ({
  type: 'NotFoundError',
  resource,
  id,
  message: message || `${resource} with id ${id} not found`,
});

export const databaseError = (
  operation: string,
  message: string,
  details?: Record<string, unknown>
): DatabaseError => ({
  type: 'DatabaseError',
  operation,
  message,
  details,
});
```

### Repository Pattern実装

#### Repository Interface

```typescript
// features/bucket-list/repositories/bucket-list-repository.ts
import { Result } from '../../../shared/types/result';
import { DomainError } from '../../../shared/types/errors';
import { BucketItem, BucketItemCreate, BucketItemUpdate } from '../types';

export interface BucketListRepository {
  findAll(userId: string): Promise<Result<BucketItem[], DomainError>>;
  findById(id: string, userId: string): Promise<Result<BucketItem, DomainError>>;
  create(item: BucketItemCreate): Promise<Result<BucketItem, DomainError>>;
  update(id: string, item: BucketItemUpdate): Promise<Result<BucketItem, DomainError>>;
  delete(id: string, userId: string): Promise<Result<void, DomainError>>;
}
```

#### Concrete Implementation

```typescript
// features/bucket-list/repositories/supabase-bucket-list-repository.ts
import { supabase } from '../../../lib/supabase';
import { BucketListRepository } from './bucket-list-repository';
import { success, failure } from '../../../shared/types/result';
import { databaseError, notFoundError } from '../../../shared/types/errors';

export class SupabaseBucketListRepository implements BucketListRepository {
  async findAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('bucket_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return failure(databaseError('findAll', error.message));
      }

      return success(data || []);
    } catch (error) {
      return failure(databaseError('findAll', String(error)));
    }
  }
  
  // 他のメソッドも同様にResult型を返すよう実装
}
```

### 関数型Serviceの実装パターン

#### カリー化された関数でのService実装

```typescript
// 高階関数：Repository依存のService関数を生成
export const createBucketItem = (repository: BucketListRepository) => 
  async (data: Partial<BucketItemCreate>): Promise<Result<BucketItem, DomainError>> => {
    // バリデーション
    const validationResult = validateBucketItemCreate(data);
    if (!validationResult.success) {
      return failure(validationResult.error);
    }

    // リポジトリ操作
    return await repository.create(validationResult.data);
  };

// 関数型Service作成関数（実際の実装パターン）
export const createFunctionalBucketListService = (
  repository: FunctionalBucketListRepository
) => ({
  createBucketItem: createBucketItem(repository),
  updateBucketItem: updateBucketItem(repository),
  deleteBucketItem: deleteBucketItem(repository),
  getUserBucketItems: getUserBucketItems(repository),
  getBucketItemById: getBucketItemById(repository),
});
```

#### 純粋関数でのビジネスロジック

```typescript
// lib/business-logic.ts - 純粋関数
export const validateBucketItemCreate = (
  data: Partial<BucketItemCreate>
): Result<BucketItemCreate, ValidationError> => {
  if (!data.title?.trim()) {
    return failure(validationError('Title is required', 'title'));
  }

  if (data.title.length > 200) {
    return failure(validationError('Title must be 200 characters or less', 'title'));
  }

  return success({
    title: data.title.trim(),
    description: data.description?.trim() || '',
    category_id: data.category_id!,
    priority: data.priority || 'medium',
    status: data.status || 'not_started',
    is_public: data.is_public || false,
    due_date: data.due_date || null,
    due_type: data.due_type || 'unspecified',
    user_id: data.user_id!,
  });
};

// 純粋関数：統計計算
export const calculateAchievementStats = (items: BucketItem[]) => {
  const total = items.length;
  const completed = items.filter(item => item.status === 'completed').length;
  const inProgress = items.filter(item => item.status === 'in_progress').length;
  const notStarted = items.filter(item => item.status === 'not_started').length;
  
  return {
    total,
    completed,
    inProgress,
    notStarted,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

// 純粋関数：フィルタリング
export const filterBucketItems = (
  items: BucketItem[],
  filters: {
    category?: string;
    status?: Status;
    priority?: Priority;
    search?: string;
  }
) => {
  return items.filter(item => {
    if (filters.category && item.category_id !== filters.category) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
};
```

### React Integration

#### Result型対応Custom Hook

```typescript
// shared/hooks/use-result-operation.ts
import { useState, useCallback } from 'react';
import { Result, isSuccess, isFailure } from '../types/result';

export interface UseResultOperationState<T, E> {
  data: T | null;
  error: E | null;
  loading: boolean;
}

export const useResultOperation = <T, E>() => {
  const [state, setState] = useState<UseResultOperationState<T, E>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(
    async (operation: () => Promise<Result<T, E>>) => {
      setState({ data: null, error: null, loading: true });

      try {
        const result = await operation();

        if (isSuccess(result)) {
          setState({ data: result.data, error: null, loading: false });
          return result.data;
        } else {
          setState({ data: null, error: result.error, loading: false });
          throw result.error;
        }
      } catch (error) {
        const errorValue = error as E;
        setState({ data: null, error: errorValue, loading: false });
        throw error;
      }
    },
    []
  );

  return {
    ...state,
    execute,
    isLoading: state.loading,
    hasError: state.error !== null,
    hasData: state.data !== null,
  };
};
```

### Dependency Injection

#### 関数型Service Factory（実際の実装）

```typescript
// features/bucket-list/lib/service-factory.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import { createFunctionalBucketListRepository } from "../repositories/bucket-list.repository";
import { createFunctionalBucketListService } from "../services/bucket-list.service";

// 認証済みクライアント用のRepository作成関数
export function createAuthenticatedBucketListRepository(
  supabase: SupabaseClient<Database>
) {
  return createFunctionalBucketListRepository(supabase);
}

// 認証済みクライアント用のサービス作成関数
export function createAuthenticatedBucketListService(
  supabase: SupabaseClient<Database>
) {
  const repository = createFunctionalBucketListRepository(supabase);
  return createFunctionalBucketListService(repository);
}
```

#### 関数型Repository実装

```typescript
// features/bucket-list/repositories/bucket-list.repository.ts
// 関数型アプローチによるRepository作成関数
export const createFunctionalBucketListRepository = (
  supabase: SupabaseClient<Database>
): FunctionalBucketListRepository => ({
  // Result型を返す全メソッド
  getUserBucketItems: async (profileId, filters, sort) => {
    try {
      // Supabaseクエリの実行
      const { data, error } = await supabase
        .from('bucket_items')
        .select('*')
        .eq('profile_id', profileId);
      
      if (error) {
        return failure(createDatabaseError('getUserBucketItems', error));
      }
      
      return success(data || []);
    } catch (error) {
      return failure(createDatabaseError('getUserBucketItems', error));
    }
  },
  // 他のメソッドも同様にResult型で実装...
});
```

#### 関数型Service実装

```typescript
// services/bucket-list.service.ts
// 関数型Service作成関数（実際の実装）
export const createFunctionalBucketListService = (
  repository: FunctionalBucketListRepository
) => ({
  // Result型を返すService関数群
  getUserBucketItems: async (profileId: string, filters?, sort?) => {
    return await repository.getUserBucketItems(profileId, filters, sort);
  },
  
  createBucketItem: async (data: BucketItemInsert) => {
    // バリデーション
    const validationResult = validateBucketItemInsert(data);
    if (isFailure(validationResult)) {
      return validationResult;
    }
    
    // Repository呼び出し
    return await repository.createBucketItem(validationResult.data);
  },
  
  // 他のメソッドも同様にResult型で実装...
});
```

#### 使用例

```typescript
// コンポーネントでの使用例
import { supabase } from '~/lib/supabase';
import { createAuthenticatedBucketListService } from '~/features/bucket-list/lib/service-factory';

export function BucketListPage() {
  const bucketListService = createAuthenticatedBucketListService(supabase);
  
  const handleLoadItems = async (profileId: string) => {
    const result = await bucketListService.getUserBucketItems(profileId);
    
    if (isSuccess(result)) {
      console.log('取得成功:', result.data);
    } else {
      console.error('取得失敗:', result.error);
    }
  };
  
  // ...
}
```

---

このアーキテクチャにより、**可読性が高く、保守しやすく、拡張性のあるSSRアプリケーション**を構築できます。新機能追加時や機能変更時は、この方針に従って実装することで、一貫性のあるコードベースを維持できます。
