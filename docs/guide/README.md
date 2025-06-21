# 開発ガイド集

このディレクトリには、Claude Codeが高品質な関数型TypeScriptアプリケーションを構築するための完全なガイドセットが含まれています。

## 📚 ガイド一覧

### 🚀 [開発ワークフローガイド](./development-workflow.md)
- **目的**: 開発プロセス全体の標準化
- **内容**: ブランチ戦略、コミット規約、テスト駆動開発の強制
- **適用タイミング**: プロジェクト開始時から継続的に使用

### 🏗️ [関数型TypeScriptアーキテクチャガイド](./functional-typescript-architecture.md) 
- **目的**: アーキテクチャ設計の統一
- **内容**: Result型、Repository Pattern、関数型Service層の実装
- **適用タイミング**: 新機能実装時、リファクタリング時

### 🧪 [テスト駆動開発ガイド](./test-driven-development.md)
- **目的**: 品質保証とテスト戦略の統一
- **内容**: TDDサイクル、日本語テストケース記述、Result型テスト
- **適用タイミング**: 全機能実装時（絶対遵守）

### 🔧 [コードクリーンアップ自動化ガイド](./cleanup-automation.md)
- **目的**: 既存プロジェクトの品質向上
- **内容**: 段階的改善手法、自動化ツール活用、品質メトリクス
- **適用タイミング**: 既存プロジェクトの改善時

### 📋 [プロジェクト設定テンプレート](./project-setup-template.md)
- **目的**: 新規プロジェクトの即座立ち上げ
- **内容**: 設定ファイル、ディレクトリ構造、必須コンポーネント
- **適用タイミング**: プロジェクト初期化時

## 🎯 Claude Code利用者向け指針

### 新規プロジェクト開始時

1. **[プロジェクト設定テンプレート](./project-setup-template.md)** を読んで初期設定
2. **[開発ワークフローガイド](./development-workflow.md)** を読んで開発プロセスを理解
3. **[関数型TypeScriptアーキテクチャガイド](./functional-typescript-architecture.md)** を読んで設計方針を把握
4. **[テスト駆動開発ガイド](./test-driven-development.md)** を読んでTDD手法を確認

### 既存プロジェクト改善時

1. **[コードクリーンアップ自動化ガイド](./cleanup-automation.md)** を読んで段階的改善を実施
2. **[開発ワークフローガイド](./development-workflow.md)** に従って開発プロセスを標準化
3. 新機能は **[関数型TypeScriptアーキテクチャガイド](./functional-typescript-architecture.md)** に完全準拠

### 日常開発時

1. **[開発ワークフローガイド](./development-workflow.md)** の手順を厳守
2. **[テスト駆動開発ガイド](./test-driven-development.md)** のTDDサイクルを実践
3. **[関数型TypeScriptアーキテクチャガイド](./functional-typescript-architecture.md)** の設計パターンを適用

## ⚡ クイックリファレンス

### 必須実行コマンド

```bash
# 開発開始前の必須チェック
npm run typecheck && npm test && npm run lint && npm run build

# 新機能ブランチ作成
git checkout -b feature/機能名

# TDDサイクル
npm test -- --watch  # 常時実行推奨

# 品質チェック（コミット前必須）
npm run typecheck && npm test && npm run lint
```

### 絶対禁止事項

- ❌ テストなしの実装
- ❌ `git push` の実行
- ❌ 英語でのテストケース記述
- ❌ Result型を使わないエラーハンドリング

### 推奨パターン

- ✅ Result<T, E>による型安全なエラーハンドリング
- ✅ Repository Patternによるデータアクセス層抽象化
- ✅ 純粋関数でのビジネスロジック実装
- ✅ テストファーストの関数型TDD

## 🔄 ガイド更新について

これらのガイドは実際のプロジェクト経験に基づいて継続的に改善されます：

- **実証済み**: 全ての手法は実際のプロジェクトで検証済み
- **実用性重視**: 理論よりも実際の開発効率を優先
- **Claude Code最適化**: Claude Codeが理解・実行しやすい形式

## 📞 サポート

### トラブルシューティング

各ガイド内の「🚨 トラブルシューティング」セクションを参照してください。

### 関連ドキュメント

- `../development/`: 技術的な詳細仕様
- `../project/`: プロジェクト管理関連
- `../../CLAUDE.md`: プロジェクト固有の指示

---

**重要**: これらのガイドは順序性があります。新しいClaude Codeセッションでは、必ず最初に関連するガイドを読んでから作業を開始してください。品質の高いコードベースを維持するため、すべての指針を遵守することが必要です。