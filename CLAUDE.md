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
- **フロントエンド**: React Router v7（SSR有効）、スタイリングにTailwindCSS
- **バックエンド**: Node.js
- **データベース**: Supabase
- **デプロイ**: Dockerコンテナ化

### データベースアーキテクチャ
- **データベース**: Supabase管理PostgreSQL
- **型定義**: `app/supabase.ts`にSupabase TypeScript型定義

### 主要設定
- `react-router.config.ts`でSSR有効なReact Router設定
- Vite設定にTailwindCSSとTypeScriptパス解決を含む
- 環境変数: `SUPABASE_URL`、`SUPABASE_ANON_KEY`

### 開発時の注意点
- Docker Composeは開発用（`compose.dev.yaml`）と本番用（`compose.yaml`）で別々の設定