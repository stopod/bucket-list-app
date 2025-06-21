# プロジェクト設定テンプレート

このテンプレートは、Claude Codeが新規プロジェクトを開始する際に、高品質な関数型TypeScriptアプリケーションを即座に構築するためのコンプリートガイドです。実証済みの設定とベストプラクティスを提供します。

## 🚀 プロジェクト初期化チェックリスト

### 即座実行コマンド

Claude Codeは新規プロジェクト作成時に以下を**順番通り**に実行してください：

```bash
# 1. プロジェクト作成
npm create vite@latest my-app -- --template react-ts
cd my-app

# 2. 基本依存関係のインストール
npm install

# 3. 開発用依存関係の追加
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D vitest jsdom
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
npm install -D eslint-plugin-unused-imports eslint-plugin-import
npm install -D @types/node

# 4. UI・スタイリング関連
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install lucide-react class-variance-authority clsx tailwind-merge

# 5. 機能関連の依存関係
npm install react-router-dom@7  # React Router v7
npm install @supabase/supabase-js  # Supabase (必要に応じて)

# 6. 型定義関連
npm install -D @types/react @types/react-dom
```

## 📁 ディレクトリ構造テンプレート

### 標準ディレクトリ構成

```bash
# ディレクトリ構造を作成
mkdir -p app/{components/ui,features,lib,routes,shared/{hooks,layouts,types,utils}}
mkdir -p docs/{guide,development,project}
mkdir -p public
```

### 完全なディレクトリ構造

```
project-root/
├── app/
│   ├── components/
│   │   └── ui/                    # shadcn-ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       └── index.ts
│   ├── features/
│   │   └── [feature-name]/
│   │       ├── components/        # Feature-specific components
│   │       │   ├── __tests__/
│   │       │   └── index.ts
│   │       ├── services/          # Business logic layer
│   │       │   ├── __tests__/
│   │       │   ├── [feature]-service.ts           # Traditional service
│   │       │   ├── functional-[feature]-service.ts # Functional service
│   │       │   └── index.ts
│   │       ├── repositories/      # Data access layer
│   │       │   ├── __tests__/
│   │       │   ├── [feature]-repository.ts
│   │       │   ├── mock-[feature]-repository.ts
│   │       │   └── index.ts
│   │       ├── lib/               # Pure functions & utilities
│   │       │   ├── __tests__/
│   │       │   ├── business-logic.ts
│   │       │   ├── schemas.ts
│   │       │   ├── repository-factory.ts
│   │       │   └── index.ts
│   │       ├── hooks/             # Custom React hooks
│   │       │   ├── __tests__/
│   │       │   └── index.ts
│   │       └── types.ts           # Feature-specific types
│   ├── lib/                       # Global utilities
│   │   ├── supabase.ts           # Database client
│   │   └── utils.ts              # Utility functions
│   ├── routes/                    # Page components
│   │   ├── _layout.tsx           # Root layout
│   │   ├── _index.tsx            # Home page
│   │   └── [feature]/
│   │       ├── index.tsx
│   │       └── [id].tsx
│   ├── shared/                    # Shared modules
│   │   ├── hooks/
│   │   │   ├── __tests__/
│   │   │   ├── use-async-operation.ts
│   │   │   ├── use-result-operation.ts
│   │   │   └── index.ts
│   │   ├── layouts/
│   │   │   ├── app-layout.tsx
│   │   │   ├── authenticated-layout.tsx
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── result.ts         # Result<T, E> type
│   │   │   ├── errors.ts         # Error types
│   │   │   ├── database.ts       # Database schema types
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── result-helpers.ts # Result operation helpers
│   │       ├── cn.ts            # Class name utility
│   │       └── index.ts
│   ├── root.tsx                   # Root component
│   └── routes.ts                  # Route configuration
├── docs/                          # Documentation
│   ├── guide/                     # Development guides
│   │   ├── development-workflow.md
│   │   ├── functional-typescript-architecture.md
│   │   ├── test-driven-development.md
│   │   ├── cleanup-automation.md
│   │   └── project-setup-template.md
│   ├── development/               # Technical documentation
│   │   ├── architecture.md
│   │   ├── database.md
│   │   └── testing.md
│   └── project/                   # Project management
│       ├── requirements.md
│       ├── roadmap.md
│       └── status.md
├── public/                        # Static assets
│   └── favicon.ico
├── CLAUDE.md                      # Claude Code instructions
├── README.md                      # Project documentation
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite configuration
├── vitest.config.ts              # Test configuration
├── eslint.config.js              # ESLint configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── prettier.config.js             # Prettier configuration
└── test-setup.ts                  # Test setup file
```

## 📄 必須設定ファイル

### package.json

```json
{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "start": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^7.0.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.0.1",
    "eslint-plugin-unused-imports": "^3.0.0",
    "eslint-plugin-import": "^2.29.0",
    "prettier": "^3.1.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"],
      "~/*": ["./app/*"]
    }
  },
  "include": ["app", "vite.config.ts", "vitest.config.ts", "test-setup.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### eslint.config.js

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
      'unused-imports': unusedImports,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'prettier/prettier': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test-setup.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '~': path.resolve(__dirname, './app'),
    },
  },
})
```

### test-setup.ts

```typescript
import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// テスト終了後のクリーンアップ
afterEach(() => {
  cleanup()
})

// カスタムマッチャーの追加
expect.extend({
  toBeInTheDocument: (received) => {
    const pass = received != null
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass,
    }
  },
})
```

### prettier.config.js

```javascript
export default {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  arrowParens: 'avoid',
  bracketSpacing: true,
  bracketSameLine: false,
  quoteProps: 'as-needed',
}
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

## 🧩 必須コンポーネントテンプレート

### Result型定義

```typescript
// app/shared/types/result.ts
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

### エラー型定義

```typescript
// app/shared/types/errors.ts
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

### Result操作ヘルパー

```typescript
// app/shared/utils/result-helpers.ts
import { Result, Success, Failure, isSuccess, isFailure, success, failure } from '../types/result';

// Map operation for Result
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (isSuccess(result)) {
    return success(fn(result.data));
  }
  return result;
};

// FlatMap operation for Result
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (isSuccess(result)) {
    return fn(result.data);
  }
  return result;
};

// Error mapping
export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (isFailure(result)) {
    return failure(fn(result.error));
  }
  return result;
};

// Combine multiple Results
export const combine = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  
  for (const result of results) {
    if (isFailure(result)) {
      return result;
    }
    values.push(result.data);
  }
  
  return success(values);
};

// Execute async operation and wrap in Result
export const fromPromise = async <T>(
  promise: Promise<T>
): Promise<Result<T, Error>> => {
  try {
    const data = await promise;
    return success(data);
  } catch (error) {
    return failure(error as Error);
  }
};
```

### Result対応React Hook

```typescript
// app/shared/hooks/use-result-operation.ts
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

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.loading,
    hasError: state.error !== null,
    hasData: state.data !== null,
  };
};
```

## 🎨 UI コンポーネントテンプレート

### Button Component

```typescript
// app/components/ui/button.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

## 🔄 初期化後の必須実行手順

### Step 1: プロジェクト構造の確認

```bash
# ディレクトリ構造の確認
tree app/ -I node_modules

# 設定ファイルの確認
ls -la *.config.* *.json *.md
```

### Step 2: 品質チェック

```bash
# TypeScript型チェック
npm run typecheck

# ESLint実行
npm run lint

# Prettier確認
npm run format:check

# テスト実行
npm test
```

### Step 3: 開発サーバー起動

```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:5173 にアクセス
```

### Step 4: ビルド確認

```bash
# 本番ビルド
npm run build

# ビルド結果確認
ls -la dist/
```

## 📋 CLAUDE.md テンプレート

新規プロジェクトには以下のCLAUDE.mdを配置してください：

```markdown
# CLAUDE.md

このファイルは、関数型TypeScriptアプリケーションの開発ガイドラインを提供します。

## 必須コマンド

### 開発
- `npm run dev` - 開発サーバーを起動  
- `npm run build` - 本番用ビルド
- `npm run typecheck` - TypeScript型チェックを実行

### テスト・品質管理
- `npm test` - テスト実行
- `npm run test:ui` - UI付きテスト実行  
- `npm run test:coverage` - カバレッジ測定
- `npm run lint` - ESLint実行
- `npm run format` - Prettier実行

## 開発ガイドライン

### 必須開発フロー
1. **ブランチ作成**: `git checkout -b feature/機能名`
2. **テストファースト開発**: 実装前にテストコード作成
3. **関数型アプローチ**: Result型とpure functionsを使用
4. **品質チェック**: コミット前に `npm run typecheck && npm test && npm run lint`
5. **絶対禁止**: `git push` は実行しない

### アーキテクチャ原則
- **Result型**: すべての操作でResult<T, E>を使用
- **Repository Pattern**: データアクセス層の抽象化
- **Pure Functions**: ビジネスロジックは純粋関数で実装
- **TDD**: テスト駆動開発を強制

## 関連ドキュメント
- `docs/guide/development-workflow.md`: 開発フロー詳細
- `docs/guide/functional-typescript-architecture.md`: アーキテクチャ設計
- `docs/guide/test-driven-development.md`: TDD実践方法
- `docs/guide/cleanup-automation.md`: 品質管理プロセス
```

## 🚀 プロジェクト開始後の推奨作業

### 1. 最初の機能実装

```bash
# 1. 機能ブランチ作成
git checkout -b feature/初期機能

# 2. テストファイル作成
touch app/features/sample/services/__tests__/sample-service.test.ts

# 3. TDDでテストから開始
npm test -- --watch
```

### 2. CI/CD設定

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint  
      - run: npm test
      - run: npm run build
```

### 3. 環境変数設定

```bash
# .env.example
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# .env.local (実際の値)
cp .env.example .env.local
```

## 📚 テンプレート活用方法

### 新規機能追加時

1. `app/features/[feature-name]/` ディレクトリ作成
2. テンプレート構造に従ってファイル配置
3. テストファーストで実装開始
4. Result型とRepository Patternを使用

### 既存プロジェクトへの適用

1. `docs/guide/cleanup-automation.md` に従って段階的移行
2. 新機能は完全にこのテンプレートに準拠
3. 既存機能は段階的にリファクタリング

## 🔧 カスタマイズポイント

### プロジェクト固有の調整

- **データベース**: Supabase以外を使用する場合の設定変更
- **認証**: 認証プロバイダーに応じた設定
- **デプロイ**: デプロイ先に応じたビルド設定
- **スタイリング**: デザインシステムに応じたコンポーネント調整

### 依存関係の調整

```bash
# データベース変更例（Prisma使用の場合）
npm install prisma @prisma/client
npm install -D prisma

# 状態管理追加例（Zustand使用の場合）  
npm install zustand
```

---

**重要**: このテンプレートは実際のプロジェクトで実証済みです。Claude Codeは必ずこの構成に従ってプロジェクトを初期化し、高品質な関数型TypeScriptアプリケーションを構築してください。