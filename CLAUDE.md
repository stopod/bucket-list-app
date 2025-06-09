# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 必須コマンド

### 開発

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバーを起動
- `npm run typecheck` - TypeScript型チェックを実行

### Docker開発ワークフロー

```bash
# 開発時（DBのみDocker、アプリはローカル）
docker compose -f compose.dev.yaml up -d
npm run dev

# 本番時（全部Docker）
docker compose up -d
```

## アーキテクチャ概要

これは以下のスタックを使用したReact Router v7アプリケーションです：

- **フロントエンド**: React Router v7（SSR有効）、スタイリングにTailwindCSS、コンポーネントにshadcn-ui
- **バックエンド**: Node.js
- **データベース**: Supabase
- **デプロイ**: Dockerコンテナ化

### データベースアーキテクチャ

- **データベース**: Supabase管理PostgreSQL
- **型定義**: `app/shared/types/database.ts`にSupabase TypeScript型定義
- **認証**: `getServerAuth`パターンによるSSR統合認証システム

### 主要設定

- `react-router.config.ts`でSSR有効なReact Router設定
- Vite設定にTailwindCSSとTypeScriptパス解決を含む
- 環境変数: `SUPABASE_URL`、`SUPABASE_ANON_KEY`

### 開発時の注意点

- Docker Composeは開発用（`compose.dev.yaml`）と本番用（`compose.yaml`）で別々の設定

## バケットリストアプリ仕様

### データベース設計制約

- **ユーザー参照**: `auth.users`ではなく`profiles`テーブルのIDを使用（auth.users参照は非推奨）
- **日時更新**: データベーストリガーではなくアプリケーション側で処理（DB差し替え対応）
- **RLS設定**: 必須（データセキュリティ確保）
- **profiles同期**: auth.users登録時にprofilesテーブルへ自動登録済みを前提

### アプリケーション仕様

- **カテゴリ**: 事前定義（旅行・観光、スキル習得・学習、体験・チャレンジ、人間関係、健康・フィットネス、創作・芸術、キャリア・仕事、狂気、その他）
- **優先度**: 高・中・低の3段階
- **期限設定**: 具体的日付、未定、年内、来年中
- **ステータス**: 未着手、進行中、完了
- **公開設定**: デフォルト公開、設定で非公開可能
- **表示形式**: カード形式、カテゴリ別グループ表示
- **機能**: 検索・フィルタ・ソート、達成率表示、他ユーザーリスト閲覧（作成者名マスク）
