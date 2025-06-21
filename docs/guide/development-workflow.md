# 開発ワークフローガイド

このガイドは、Claude Codeが読み取って即座に実行できる開発ワークフローを定義します。関数型プログラミングとテスト駆動開発を基盤とした品質重視の開発手法を強制します。

## 🚀 開発開始前の必須チェック

### 1. 新機能開発の開始手順

Claude Codeは以下の手順を**必ず**実行してください：

```bash
# 1. 現在のブランチを確認
git branch --show-current

# 2. mainブランチから最新を取得
git checkout main
git pull origin main

# 3. 機能ブランチを作成（feature/機能名の形式で必須）
git checkout -b feature/新機能名

# 4. ブランチ作成の確認
git branch --show-current
```

**重要**: 機能名は具体的で分かりやすい名前にしてください。
- ✅ `feature/user-authentication`
- ✅ `feature/bucket-item-search`
- ❌ `feature/fix` (抽象的すぎる)

### 2. 開発前の環境確認

```bash
# 依存関係のインストール確認
npm install

# TypeScript型チェック
npm run typecheck

# テスト実行（すべてパスすることを確認）
npm test

# 開発サーバー起動テスト
npm run dev
```

## 🧪 テスト駆動開発の強制ルール

### テストファースト開発の流れ

Claude Codeは以下の順序で開発を進めてください：

1. **テストコード作成（Red）**
2. **最小限の実装（Green）**
3. **リファクタリング（Refactor）**
4. **コミット**

### 具体的な実装手順

#### Step 1: テストコード作成

新機能の実装前に、必ずテストコードを作成してください：

```bash
# テストファイルの作成場所
# - Service層: app/features/[feature-name]/services/__tests__/
# - Component層: app/features/[feature-name]/components/__tests__/
# - Hook層: app/shared/hooks/__tests__/
```

**テストケース記述規約**:
- **日本語必須**: すべてのテストケース名は日本語で記述
- **条件＋期待値形式**: 「〜の場合、〜であること」の形式
- **具体的な観点**: 確認観点と期待される結果を明確に記述

```typescript
// ✅ 正しいテストケース記述例
describe("createBucketItem", () => {
  it("有効なデータを渡した場合、新しいバケットアイテムが作成されること", async () => {
    // テストコード
  });

  it("必須フィールドが不足している場合、ValidationErrorが返されること", async () => {
    // テストコード
  });
});
```

#### Step 2: テスト実行と確認

```bash
# テストを実行（失敗することを確認）
npm test

# 特定のテストファイルのみ実行
npm test -- path/to/test-file.test.ts
```

#### Step 3: 最小限の実装

テストがパスする最小限のコードを実装してください。

#### Step 4: テスト再実行

```bash
# テストがパスすることを確認
npm test

# カバレッジも確認
npm run test:coverage
```

## 📝 コミット戦略

### コミットのタイミング

以下のタイミングで**必ず**コミットしてください：

1. テストコード作成後
2. 実装完了後（テストがパス）
3. リファクタリング完了後
4. 機能の一部が完成した時点

### コミットメッセージ規約

Claude Codeは以下の形式でコミットメッセージを作成してください：

```bash
git commit -m "$(cat <<'EOF'
[type]: [日本語での変更内容]

[詳細説明（英語）]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**type一覧**:
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `docs`: ドキュメント更新
- `style`: コードスタイル修正
- `chore`: その他の変更

**例**:
```
feat: ユーザー認証機能を追加

Add user authentication with login/logout functionality
- Implement login form component
- Add authentication service with Result type
- Create auth context for state management

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 必須コミット前チェック

コミット前に以下を**必ず**実行してください：

```bash
# 1. TypeScript型チェック
npm run typecheck

# 2. テスト実行
npm test

# 3. リント実行
npm run lint

# 4. ビルド確認
npm run build
```

すべてがパスした場合のみコミットを実行してください。

## 🚫 絶対禁止事項

### Push禁止

Claude Codeは**絶対に**以下のコマンドを実行してはいけません：

```bash
# ❌ 絶対に実行禁止
git push
git push origin [branch-name]
git push --force
```

### 理由
- ローカル完結の開発サイクルを維持
- 意図しない変更の公開を防止
- レビュープロセスの確保

### 許可される操作

```bash
# ✅ 許可される操作
git add .
git commit -m "commit message"
git checkout -b feature/new-branch
git merge main
git rebase main
```

## 🔄 開発サイクル

### 標準的な開発フロー

1. **ブランチ作成**
   ```bash
   git checkout -b feature/機能名
   ```

2. **テスト作成**
   - `__tests__`ディレクトリにテストファイル作成
   - テストケースを日本語で記述

3. **テスト実行（Red）**
   ```bash
   npm test
   ```

4. **実装**
   - 関数型アプローチを採用
   - Result型を使用したエラーハンドリング
   - 純粋関数の作成を心がける

5. **テスト実行（Green）**
   ```bash
   npm test
   ```

6. **品質チェック**
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

7. **コミット**
   ```bash
   git add .
   git commit -m "規約に従ったメッセージ"
   ```

8. **継続的な改善**
   - 小さな単位での頻繁なコミット
   - リファクタリングの継続実行

## 🛠️ 開発ツール設定確認

### 必須ツールの確認

開発開始前に以下のツールが適切に設定されていることを確認してください：

```bash
# Vitest (テストフレームワーク)
npm test

# TypeScript (型チェック)
npm run typecheck

# ESLint (コード品質)
npm run lint

# Prettier (コードフォーマッター)
npm run format
```

### エディタ設定推奨

以下の設定を推奨します：

- **自動保存時のフォーマット**: Prettier
- **型チェックのリアルタイム表示**: TypeScript
- **テスト結果の表示**: Vitest拡張機能

## 📊 品質指標

### 目標値

- **テストカバレッジ**: 80%以上
- **TypeScriptエラー**: 0個
- **ESLintエラー**: 0個
- **ビルドエラー**: 0個

### 継続的な品質確認

各作業後に以下を実行して品質を確認してください：

```bash
# 包括的な品質チェック
npm run typecheck && npm test && npm run lint && npm run build
```

## 🔧 トラブルシューティング

### よくある問題と解決策

1. **テストが失敗する場合**
   ```bash
   # テストの詳細出力で問題を特定
   npm test -- --reporter=verbose
   ```

2. **TypeScriptエラーが発生する場合**
   ```bash
   # 型チェックの詳細表示
   npm run typecheck -- --noEmit
   ```

3. **ビルドが失敗する場合**
   ```bash
   # ビルドの詳細ログ確認
   npm run build -- --verbose
   ```

## 📚 関連ドキュメント

このワークフローと合わせて以下のガイドを参照してください：

- `functional-typescript-architecture.md`: アーキテクチャ設計思想
- `test-driven-development.md`: テスト駆動開発の詳細
- `cleanup-automation.md`: コードクリーンアップ手法
- `project-setup-template.md`: プロジェクト初期設定

---

**重要**: このガイドの指示は絶対に守ってください。品質の高いコードベースを維持するために、すべての手順を確実に実行することが必要です。