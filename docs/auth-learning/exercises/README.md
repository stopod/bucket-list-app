# 実習課題

## 🎯 実習の目的

認証認可の理論を学んだ後は、実際に手を動かして理解を深めましょう。これらの実習課題は、バケットリストアプリをベースに段階的にスキルアップできるよう設計されています。

## 📚 課題の構成

### 📖 レベル別課題

各レベルに対応した実習課題を用意しています：

1. **[Level 1 実習: 基礎概念](./level-1-exercises.md)** - 認証と認可の基本理解
2. **[Level 2 実習: 認証実装](./level-2-exercises.md)** - JWT とセッション管理
3. **[Level 3 実習: 認可実装](./level-3-exercises.md)** - 権限制御とルート保護
4. **[Level 4 実習: セキュリティ対策](./level-4-exercises.md)** - XSS/CSRF対策とレート制限
5. **[Level 5 実習: 高度なトピック](./level-5-exercises.md)** - SSRとOAuth統合

### 🏆 チャレンジ課題

より高度な実装に挑戦したい方向け：

- **[プロジェクト課題](./project-challenges.md)** - 総合的な機能実装
- **[パフォーマンス課題](./performance-challenges.md)** - 最適化とスケーリング
- **[セキュリティ課題](./security-challenges.md)** - 脆弱性対策と監査

## ⏱️ 想定時間

| レベル | 基本課題 | 発展課題 | 合計 |
|--------|----------|----------|------|
| **Level 1** | 30分 | 30分 | 1時間 |
| **Level 2** | 45分 | 45分 | 1.5時間 |
| **Level 3** | 60分 | 60分 | 2時間 |
| **Level 4** | 90分 | 90分 | 3時間 |
| **Level 5** | 120分 | 120分 | 4時間 |
| **チャレンジ** | - | 240分+ | 4時間+ |

**合計**: 約11.5時間（基本＋発展課題）

## 🔧 事前準備

実習を始める前に以下を準備してください：

### 💻 開発環境

```bash
# 1. リポジトリのクローン（既にある場合はスキップ）
git clone <repository-url>
cd bucket-list-app

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定
cp .env.example .env
# .env ファイルを適切に設定

# 4. データベースの準備
npm run db:setup

# 5. 開発サーバーの起動確認
npm run dev
```

### 🛠️ 必要なツール

- **Node.js** v18.x 以上
- **npm** または **yarn**
- **Git**
- **VS Code**（推奨）+ 関連拡張機能
- **ブラウザ**（Chrome/Firefox推奨）
- **Postman** または **Thunder Client**（API テスト用）

### 📖 前提知識

- JavaScript/TypeScript の基本的な知識
- React の基本的な理解
- HTTP の基本概念
- 認証認可の学習資料（Level 1-5）の理解

## 🎯 実習の進め方

### 📋 推奨手順

1. **理論学習**: 対応するレベルの学習資料を読む
2. **環境確認**: 実習環境が正常に動作することを確認
3. **基本課題**: 段階的に課題を解決
4. **動作確認**: 実装した機能をテスト
5. **発展課題**: より高度な機能に挑戦
6. **振り返り**: 学んだ内容を整理

### 💡 学習のコツ

- **理解 > 丸写し**: コードの動作原理を理解してから実装
- **段階的実装**: 一度に全てを実装せず、小さく始める
- **テスト重視**: 実装と同時にテストも書く
- **エラー活用**: エラーメッセージから学習する
- **ドキュメント参照**: 公式ドキュメントを積極的に参照

## 🔍 課題の種類

### 📝 基本課題

各レベルの核心概念を理解するための必須課題：

- **コード読解**: 既存コードの理解
- **機能実装**: 新しい機能の追加
- **バグ修正**: 意図的に組み込まれた問題の解決
- **テスト作成**: 実装した機能のテスト

### 🚀 発展課題

より深い理解と実践力を身につけるための応用課題：

- **パフォーマンス改善**: 最適化の実装
- **セキュリティ強化**: 追加の防御機能
- **UI/UX 改善**: ユーザビリティの向上
- **拡張機能**: 新しいアイデアの実装

### 💎 チャレンジ課題

プロダクションレベルの実装を目指す高度な課題：

- **総合プロジェクト**: 複数技術の統合
- **設計課題**: アーキテクチャの検討
- **運用課題**: 監視・ログ・デプロイ
- **創作課題**: オリジナル機能の企画・実装

## 📊 学習成果の確認

### ✅ 達成度チェックリスト

各レベル完了時に以下を確認：

#### Level 1: 基礎概念
- [ ] 認証と認可の違いを説明できる
- [ ] JWTの構造を理解している
- [ ] セッション管理の基本を知っている

#### Level 2: 認証実装
- [ ] ログイン/ログアウト機能を実装できる
- [ ] パスワードの安全な管理を理解している
- [ ] JWT の生成と検証ができる

#### Level 3: 認可実装
- [ ] ルート保護を実装できる
- [ ] 権限ベースのアクセス制御を理解している
- [ ] コンポーネントレベルでの認可を実装できる

#### Level 4: セキュリティ対策
- [ ] XSS/CSRF 攻撃対策を実装できる
- [ ] 入力値検証とサニタイゼーションを理解している
- [ ] レート制限を実装できる

#### Level 5: 高度なトピック
- [ ] SSR での認証を実装できる
- [ ] OAuth 統合を理解している
- [ ] 最新のセキュリティトレンドを知っている

### 🏅 成果物

実習完了後に以下が達成できます：

- **動作するアプリケーション**: 認証認可機能付きのWebアプリ
- **セキュアなコード**: 実際のプロダクションで使える品質
- **テストコード**: 実装した機能の品質保証
- **ドキュメント**: 実装した内容の説明
- **学習記録**: 学んだ内容と気づきの整理

## 🆘 困った時のサポート

### 📖 参考資料

- **学習資料**: `docs/auth-learning/` 内の各レベル資料
- **公式ドキュメント**: React Router, Supabase 等
- **バケットリストアプリのコード**: 実装例として参考

### 🔧 デバッグのヒント

- **ブラウザ開発者ツール**: Network, Console, Application タブ
- **サーバーログ**: `npm run dev` のコンソール出力
- **データベース**: Supabase ダッシュボードでデータ確認
- **認証状態**: Redux DevTools で状態確認

### 🤝 コミュニティ

- **GitHub Issues**: バグ報告や質問
- **Discussion**: 学習に関する議論
- **Pull Request**: 改善提案やコード共有

## 🚀 始めましょう！

準備ができたら、**[Level 1 実習](./level-1-exercises.md)** から始めましょう。

各課題では：
1. **目標**: 何を達成するか明確に説明
2. **手順**: 段階的な実装ガイド
3. **ヒント**: 詰まった時の助け
4. **検証**: 正しく動作しているかの確認方法

頑張って取り組んでください！🎯