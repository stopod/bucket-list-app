# コードクリーンアップ自動化ガイド

このガイドは、Claude Codeが既存プロジェクトの品質を段階的に改善するための完全な自動化戦略を提供します。大規模なコードベースでも安全に品質向上を実現できる実証済みの手法を詳述します。

## 🎯 クリーンアップ戦略概要

### 段階的改善アプローチ

品質改善は**必ず**以下の順序で実行してください：

1. **Phase 1: 品質基盤構築** (Critical)
2. **Phase 2: UI/コンポーネント統一** (High)
3. **Phase 3: 未使用コード削除** (Medium)
4. **Phase 4: アーキテクチャ最適化** (Low)

### 安全性重視の原則

- 各段階で動作確認を実施
- 小さな単位での段階的改修
- 自動化ツールによる一貫性確保
- テスト実行による回帰防止

## 🔧 Phase 1: 品質基盤構築

### 必須ツール設定確認

Claude Codeは開始前に以下を確認してください：

```bash
# 1. package.json内の必須スクリプト確認
cat package.json | grep -A 5 '"scripts"'

# 必須スクリプトの例：
# "typecheck": "tsc --noEmit"
# "lint": "eslint . --ext .ts,.tsx"
# "format": "prettier --write ."
# "test": "vitest"
# "build": "vite build"
```

### Step 1-1: TypeScriptエラー修正

```bash
# TypeScriptエラーの確認
npm run typecheck

# エラー数が多い場合、段階的に修正
npm run typecheck 2>&1 | head -20  # 最初の20エラーに絞って対応
```

**優先修正順序**:
1. **Import/Export エラー** (最優先)
2. **型定義不足エラー**
3. **プロパティアクセスエラー**
4. **戻り値型エラー**

### Step 1-2: ESLintエラー修正

```bash
# ESLintエラーの確認
npm run lint

# 自動修正可能なものを一括修正
npm run lint -- --fix

# 残りのエラーを手動修正
npm run lint -- --format=compact | head -50
```

**自動修正可能なエラー例**:
- 未使用import
- セミコロンの統一
- インデントの統一
- 関数宣言の統一

### Step 1-3: Prettierフォーマット

```bash
# フォーマット確認
npm run format -- --check

# 一括フォーマット実行
npm run format

# 特定ディレクトリのみ
npm run format -- "app/**/*.{ts,tsx}"
```

### Step 1-4: 品質チェック自動化

```bash
# 包括的品質チェックスクリプト
npm run typecheck && npm run lint && npm test && npm run build
```

## 🎨 Phase 2: UI/コンポーネント統一

### Step 2-1: shadcn-uiコンポーネント調査

```bash
# 既存のshadcn-uiコンポーネント確認
ls app/components/ui/

# 使用状況の調査
grep -r "from.*components/ui" app/ --include="*.tsx" --include="*.ts"
```

### Step 2-2: ネイティブ要素の置換

#### Button要素の統一

```bash
# ネイティブbuttonタグの検索
grep -r "<button" app/ --include="*.tsx" | head -10

# 置換対象の特定と段階的修正
# 1. 単純なbuttonから開始
# 2. 複雑なスタイル付きbuttonは後回し
```

**置換パターン例**:
```typescript
// Before: ネイティブbutton
<button 
  className="bg-blue-500 text-white px-4 py-2 rounded"
  onClick={handleClick}
>
  Click me
</button>

// After: shadcn-ui Button
import { Button } from "@/components/ui/button";

<Button onClick={handleClick}>
  Click me
</Button>
```

#### Input要素の統一

```bash
# ネイティブinputタグの検索
grep -r "<input" app/ --include="*.tsx" | head -10
```

#### Select要素の統一

```bash
# ネイティブselectタグの検索
grep -r "<select" app/ --include="*.tsx" | head -10
```

### Step 2-3: コンポーネント統一の検証

各統一後に以下を実行：

```bash
# 1. TypeScript確認
npm run typecheck

# 2. 動作確認
npm run dev  # ブラウザで動作確認

# 3. テスト実行
npm test

# 4. ビルド確認
npm run build
```

## 🗑️ Phase 3: 未使用コード削除

### Step 3-1: 未使用import削除

```bash
# ESLintによる未使用import検出
npm run lint -- --ext .ts,.tsx --format=json | jq '.[] | select(.messages[].ruleId == "unused-imports/no-unused-imports")'

# 自動削除（ESLint --fixで対応可能な場合）
npm run lint -- --fix
```

### Step 3-2: 未使用関数の特定と削除

#### Service層の未使用関数

```bash
# 関数定義の抽出
grep -r "export.*function\|export.*const.*=" app/features/*/services/ --include="*.ts"

# 使用箇所の確認（例：特定の関数）
grep -r "functionName" app/ --include="*.ts" --include="*.tsx"
```

**安全な削除手順**:
1. 関数の使用箇所を全検索
2. 使用されていないことを確認
3. 段階的に削除（1つずつ）
4. 各削除後にテスト実行

#### Business Logic関数の整理

```bash
# ビジネスロジック関数の一覧
grep -r "export.*const" app/features/*/lib/business-logic.ts

# 各関数の使用状況確認
for func in $(grep -o "export const [a-zA-Z_][a-zA-Z0-9_]*" app/features/*/lib/business-logic.ts | cut -d' ' -f3); do
  echo "=== $func ==="
  grep -r "$func" app/ --include="*.ts" --include="*.tsx" | wc -l
done
```

### Step 3-3: 未使用型定義の削除

```bash
# 型定義の一覧抽出
grep -r "export.*interface\|export.*type" app/ --include="*.ts" | head -20

# 使用状況の確認
grep -r "TypeName" app/ --include="*.ts" --include="*.tsx"
```

### Step 3-4: 未使用ファイルの特定

```bash
# 潜在的な未使用ファイルの検出
find app/ -name "*.ts" -o -name "*.tsx" | while read file; do
  filename=$(basename "$file" .ts | basename "$file" .tsx)
  if [ $(grep -r "$filename" app/ --include="*.ts" --include="*.tsx" | wc -l) -eq 1 ]; then
    echo "Potentially unused: $file"
  fi
done
```

## 🔄 Phase 4: アーキテクチャ最適化

### Step 4-1: Service層の統合検討

#### 従来型vs関数型サービスの現状分析

```bash
# 従来型サービスの一覧
find app/features/*/services/ -name "*-service.ts" ! -name "functional-*"

# 関数型サービスの一覧  
find app/features/*/services/ -name "functional-*-service.ts"

# 使用状況の比較
grep -r "Service.*new\|createService" app/ --include="*.ts" --include="*.tsx"
```

#### 段階的移行戦略

1. **新機能**: 関数型サービスのみ使用
2. **既存機能**: 段階的にリファクタリング
3. **レガシー機能**: 必要に応じて従来型を維持

### Step 4-2: Repository層の最適化

```bash
# Repository実装の確認
find app/features/*/repositories/ -name "*-repository.ts"

# Factory使用状況の確認
grep -r "createRepository\|RepositoryFactory" app/ --include="*.ts"
```

## 🤖 自動化スクリプト例

### 包括的クリーンアップスクリプト

```bash
#!/bin/bash
# cleanup-automation.sh

echo "🚀 Phase 1: 品質基盤構築"
echo "TypeScript型チェック実行中..."
npm run typecheck || { echo "TypeScriptエラーがあります。修正してください。"; exit 1; }

echo "ESLint自動修正実行中..."
npm run lint -- --fix

echo "Prettier自動フォーマット実行中..."
npm run format

echo "テスト実行中..."
npm test || { echo "テストが失敗しました。修正してください。"; exit 1; }

echo "ビルド確認中..."
npm run build || { echo "ビルドが失敗しました。修正してください。"; exit 1; }

echo "✅ Phase 1 完了: 品質基盤構築が完了しました"

echo "🎨 Phase 2: UI統一の準備"
echo "shadcn-uiコンポーネント使用状況調査中..."
grep -r "from.*components/ui" app/ --include="*.tsx" | wc -l | xargs echo "現在の使用箇所数:"

echo "ネイティブ要素使用状況調査中..."
echo "button要素:" $(grep -r "<button" app/ --include="*.tsx" | wc -l)
echo "input要素:" $(grep -r "<input" app/ --include="*.tsx" | wc -l)
echo "select要素:" $(grep -r "<select" app/ --include="*.tsx" | wc -l)

echo "✅ Phase 2 準備完了: 手動でUI統一を進めてください"

echo "🗑️ Phase 3: 未使用コード分析"
echo "未使用import検出中..."
npm run lint 2>&1 | grep "unused-imports" | wc -l | xargs echo "未使用import数:"

echo "✅ 自動分析完了: 詳細な削除は手動で実行してください"
```

### 実行方法

```bash
# スクリプトに実行権限を付与
chmod +x cleanup-automation.sh

# 実行
./cleanup-automation.sh
```

## 📊 進捗管理とメトリクス

### 品質指標の測定

```bash
# TypeScriptエラー数
npm run typecheck 2>&1 | grep "error" | wc -l

# ESLintエラー数  
npm run lint --format=json | jq '[.[] | .messages | length] | add'

# テストカバレッジ
npm run test:coverage | grep "All files" | tail -1

# ビルドサイズ
npm run build && ls -la dist/ | grep "index.*js" | awk '{print $5}'
```

### 改善前後の比較

```bash
# 改善前のメトリクス記録
echo "=== 改善前 ===" > metrics-before.txt
echo "TypeScriptエラー: $(npm run typecheck 2>&1 | grep "error" | wc -l)" >> metrics-before.txt
echo "ESLintエラー: $(npm run lint 2>/dev/null | grep "problem" | tail -1)" >> metrics-before.txt

# 改善後のメトリクス記録  
echo "=== 改善後 ===" > metrics-after.txt
echo "TypeScriptエラー: $(npm run typecheck 2>&1 | grep "error" | wc -l)" >> metrics-after.txt
echo "ESLintエラー: $(npm run lint 2>/dev/null | grep "problem" | tail -1)" >> metrics-after.txt

# 比較表示
diff metrics-before.txt metrics-after.txt
```

## 🚨 トラブルシューティング

### よくある問題と解決策

#### 1. TypeScriptエラーが大量に出る場合

```bash
# 段階的修正：最初の10エラーに絞る
npm run typecheck 2>&1 | head -20 > ts-errors-subset.txt

# 修正後に全体確認
npm run typecheck
```

#### 2. ESLint --fixで修正できないエラー

```bash
# 修正できないエラーのみ表示
npm run lint -- --format=compact | grep -v "✓"

# 特定のルールを無効化する場合（最終手段）
# eslint-disable-next-line @typescript-eslint/no-explicit-any
```

#### 3. テストが失敗する場合

```bash
# 失敗したテストのみ再実行
npm test -- --run --reporter=verbose

# 特定のテストファイルのみ実行
npm test -- path/to/failing-test.test.ts
```

#### 4. ビルドが失敗する場合

```bash
# 詳細なビルドログを確認
npm run build -- --verbose

# 依存関係の確認
npm ls --depth=0
```

## 📋 クリーンアップチェックリスト

### Phase 1: 品質基盤構築

- [ ] TypeScriptエラー0個
- [ ] ESLintエラー0個  
- [ ] Prettierフォーマット完了
- [ ] 全テストがパス
- [ ] ビルドが成功

### Phase 2: UI統一

- [ ] shadcn-uiコンポーネント使用状況調査完了
- [ ] Button要素の統一完了
- [ ] Input要素の統一完了
- [ ] Select要素の統一完了
- [ ] 動作確認完了

### Phase 3: 未使用コード削除

- [ ] 未使用import削除完了
- [ ] 未使用関数削除完了
- [ ] 未使用型定義削除完了
- [ ] 未使用ファイル削除完了

### Phase 4: アーキテクチャ最適化

- [ ] Service層統合検討完了
- [ ] Repository層最適化完了
- [ ] 設計一貫性確保完了

## 🔄 継続的改善

### 定期実行推奨コマンド

```bash
# 日次品質チェック
npm run typecheck && npm run lint && npm test

# 週次包括チェック
npm run typecheck && npm run lint && npm run test:coverage && npm run build

# 月次メトリクス測定
./measure-quality-metrics.sh
```

### CI/CD統合

```yaml
# .github/workflows/quality-check.yml
name: Quality Check
on: [push, pull_request]

jobs:
  quality:
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

## 📚 関連ドキュメント

### 必読ガイド

- `development-workflow.md`: 開発プロセス全体
- `functional-typescript-architecture.md`: アーキテクチャ設計指針
- `test-driven-development.md`: テスト戦略
- `project-setup-template.md`: 初期設定テンプレート

### 外部リソース

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [Vitest Configuration](https://vitest.dev/config/)

---

**重要**: このクリーンアップ手法は実際のプロジェクトで実証済みです。段階的アプローチにより、大規模なコードベースでも安全に品質向上を実現できます。Claude Codeは必ずこの手順に従って実行してください。