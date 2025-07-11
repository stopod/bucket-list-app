# バケットリスト アプリ

人生でやりたいことリストを管理する TypeScript/React アプリケーション

## 概要

このアプリケーションは、個人の目標や願望を管理し、達成をサポートするための Bucket List (バケットリスト) 管理システムです。

### 主な機能

- やりたいこと項目の作成・編集・削除
- カテゴリ、優先度、ステータス管理
- 達成状況の可視化とダッシュボード
- 検索・フィルター・ソート機能
- 公開リスト機能
- レスポンシブデザイン
- Supabase認証システム

## クイックスタート

### 前提条件

- Node.js 18.x 以上
- Docker & Docker Compose
- Supabase アカウント

### 開発環境セットアップ

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd bucket-list-app

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定
cp .env.example .env.local
# .env.local を編集して Supabase の設定を追加

# 4. データベースの起動（Docker）
docker compose -f compose.dev.yaml up -d

# 5. 開発サーバーの起動
npm run dev
```

### 本番環境デプロイ

```bash
# Docker を使用したデプロイ
docker compose up -d
```

## 📋 利用可能なスクリプト

### 開発・ビルド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
npm run typecheck    # TypeScript 型チェック
```

### テスト・品質管理

```bash
npm test             # テスト実行
npm run test:ui      # UI付きテスト実行
npm run test:coverage # テストカバレッジ測定
```

## アーキテクチャ

### 技術スタック

- **フロントエンド**: React Router v7 (SSR)、TailwindCSS、shadcn-ui
- **バックエンド**: Node.js with TypeScript
- **データベース**: Supabase
- **認証**: Supabase Auth
- **テスト**: Vitest、React Testing Library
- **デプロイ**: Docker、Docker Compose
- **アーキテクチャ**: 関数型プログラミング、Result型エラーハンドリング

### アーキテクチャパターン

- **Clean Architecture**: Repository Pattern + Service Layer
- **Dependency Injection**: 関数合成による DI
- **Type Safety**: TypeScript による型安全性
- **Functional Programming**: Result型による安全なエラーハンドリング
- **SSR**: React Router v7 による Server-Side Rendering
- **Code Quality**: hooks基底パターン統一による重複削除

### プロジェクト構成

```
app/
├── features/               # 機能別モジュール
│   └── bucket-list/
│       ├── components/     # UI コンポーネント
│       ├── services/       # ビジネスロジック（関数型）
│       ├── repositories/   # データアクセス層（関数型）
│       ├── lib/            # ビジネスロジック純粋関数
│       └── types.ts        # 型定義
├── shared/                 # 共通モジュール
│   ├── types/             # 共通型定義（Result型含む）
│   ├── utils/             # ユーティリティ
│   ├── hooks/             # 基底パターン統一hooks
│   └── layouts/           # レイアウト
├── components/ui/         # UI コンポーネント
└── routes/                # ページルーティング
```

## 設定

### 環境変数

```bash
# Supabase設定
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 環境設定
NODE_ENV=development|production
```

### データベース設定

主要テーブル：

- `profiles`: ユーザープロファイル
- `categories`: カテゴリマスター
- `bucket_items`: バケットリスト項目

詳細な設定は `CLAUDE.md` を参照してください。

## テスト

### テスト戦略

- **単体テスト**: 各関数・コンポーネントの動作確認
- **統合テスト**: サービス層の結合テスト
- **UI テスト**: コンポーネントのレンダリング・インタラクション
- **認証テスト**: 認証フローの包括テスト

### テスト実行

```bash
# 全てのテストを実行
npm test

# 特定のテストファイルを実行
npm test -- --grep "bucket-list"

# カバレッジ測定
npm run test:coverage
```

### テスト結果

- **テスト成功率**: 100% (118/118 tests)
- **カバレッジ**: Repository層、Service層、Business Logic層を完全カバー

## セキュリティ

### 認証・認可

- Supabase Auth による認証
- Row Level Security (RLS) によるデータ保護
- JWT トークンベースの認証
- SSR対応の認証フロー

### セキュリティ対策

- XSS 対策（入力値サニタイズ）
- CSRF 対策（SameSite Cookie）
- 適切なエラーハンドリング
- 環境変数による秘匿情報管理

## パフォーマンス

### 最適化施策

- **フロントエンド**: コンポーネントの再利用、状態管理最適化
- **バックエンド**: 適切なインデックス設計、N+1問題の回避
- **ビルド**: コード分割、バンドルサイズ最適化

### パフォーマンス指標

- **初回読み込み時間**: < 3秒
- **インタラクション応答時間**: < 500ms
- **バンドルサイズ**: gzip圧縮後 < 200KB

## コントリビューション

### 開発規約

1. **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/) 形式
2. **コード規約**: ESLint + Prettier による自動整形
3. **テスト**: 新機能には必ずテストを追加
4. **PR**: 機能単位での小さなPRを推奨

### 開発フロー

```bash
# 1. 機能ブランチの作成
git checkout -b feature/new-feature

# 2. 開発・テスト
npm run dev
npm test

# 3. コミット
git commit -m "feat: 新機能の追加"

# 4. PR作成
git push origin feature/new-feature
```

## 📚 ドキュメント

### 詳細ドキュメント

- **[CLAUDE.md](./CLAUDE.md)**: 開発ガイドライン・設定詳細
- **[docs/](./docs/)**: 技術仕様・アーキテクチャ詳細

### 学習リソース

- **React Router v7**: [公式ドキュメント](https://reactrouter.com/)
- **Supabase**: [公式ドキュメント](https://supabase.com/docs)
- **TypeScript**: [ハンドブック](https://www.typescriptlang.org/docs/)

## 🐛 トラブルシューティング

### よくある問題

1. **ビルドエラー**: `npm run typecheck` で型エラーを確認
2. **認証エラー**: 環境変数の設定を確認
3. **データベース接続エラー**: Docker コンテナの起動状態を確認

### ログ確認

```bash
# 開発サーバーのログ
npm run dev

# Docker コンテナのログ
docker compose logs -f
```

## 📄 ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## 🙏 謝辞

このプロジェクトは以下の技術・ライブラリを使用しています：

- [React Router](https://reactrouter.com/)
- [Supabase](https://supabase.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vitest](https://vitest.dev/)

---

**バージョン**: 1.0.0
