# コードクリーンアップ計画書

## 📊 現状分析

### 分析日時
2025年6月10日

### 現状評価
- **全体的評価**: 70/100点
- **アーキテクチャ**: 優秀（Clean Architecture適用済み）
- **型安全性**: 改善必要（TypeScriptエラー11個）
- **コード整理**: 改善必要（不要ファイル多数）

### 主要な問題点

#### 🚨 重大な問題
1. **TypeScriptコンパイルエラー**: 11個
2. **不要ファイル**: routes/instruments, routes/sample
3. **重複ファイル**: app/supabase.ts ↔ app/lib/supabase.ts

#### ⚠️ 中程度の問題
1. **重複コンポーネント**: bucket-item-form系
2. **型定義の分散**: routes配下の個別types.ts
3. **未使用インポート**: 複数ファイルで確認

#### 💡 改善可能な点
1. **テストコードの不足**
2. **ESLintルールの不徹底**
3. **ドキュメントの不足**

---

## 🎯 改善計画（3段階）

### 🔴 Phase 1: 緊急クリーンアップ
**期間**: 1-2日  
**優先度**: 最高  
**目標**: 動作安定性とメンテナンス性の確保

#### 1.1 不要ファイル削除

**削除対象ファイル**:
```
app/routes/instruments/
├── instruments.tsx
├── types.ts
└── +types/

app/routes/sample/
├── sample.tsx
├── types.ts
└── +types/

app/supabase.ts

app/features/bucket-list/components/bucket-item-form-conform.tsx
```

**削除理由**:
- `instruments`: routes.tsに定義されておらず、使用されていない
- `sample`: 開発用サンプルコード
- `app/supabase.ts`: app/lib/supabase.tsと重複
- `bucket-item-form-conform.tsx`: 使用されていない可能性

**作業手順**:
1. 各ファイルの使用状況を最終確認
2. 参照している箇所がないことを確認
3. ファイル削除
4. 動作確認

#### 1.2 TypeScriptエラー修正

**エラー一覧**:
```typescript
// 型アサーション問題
app/routes/bucket-list/bucket-list.tsx:205
Type 'string' is not assignable to type 'Status'

// null safety問題
app/features/bucket-list/components/achievement-stats.tsx:98
'stats.not_started_items' is possibly 'null'

// モジュール解決エラー
app/routes/instruments/instruments.tsx:1
Cannot find module './+types/instruments'
```

**修正方針**:
1. **型アサーション**: `assertStatus`, `assertPriority`等の型ガード関数活用
2. **null safety**: オプショナルチェーン（?.）とデフォルト値設定
3. **モジュール解決**: 不要ファイル削除により解決

#### 1.3 routes.ts整理

**整理対象**:
```typescript
// 削除予定ルート
- /instruments/*
- /sample/*

// 修正が必要なインポート
- import文の整理
- 型定義の修正
```

**作業手順**:
1. routes.tsから未使用ルートを削除
2. 関連するインポート文を整理
3. 型定義エラーを修正
4. 動作確認（全ページ遷移テスト）

---

### 🟡 Phase 2: 構造最適化
**期間**: 3-5日  
**優先度**: 高  
**目標**: コード品質と開発効率の向上

#### 2.1 重複コンポーネント統合

**対象コンポーネント**:
```
app/features/bucket-list/components/
├── bucket-item-form.tsx          # メイン
├── bucket-item-form-conform.tsx  # 削除予定？
```

**統合方針**:
1. 現在使用されているコンポーネントを特定
2. 機能差分を分析
3. 優れた実装を選択または統合
4. 未使用コンポーネントを削除

#### 2.2 型定義の中央集権化

**現状の型定義配置**:
```
app/shared/types/database.ts      # Supabaseスキーマ
app/shared/types/index.ts         # 共通型
app/features/bucket-list/types.ts # バケットリスト型
app/routes/bucket-list/types.ts   # 再エクスポート
app/routes/instruments/types.ts   # 単独型（削除予定）
app/routes/sample/types.ts        # 単独型（削除予定）
```

**最適化方針**:
1. routes配下の個別types.tsを削除
2. featuresの型定義を直接インポート
3. 共通型の整理と統合

#### 2.3 インポートパスの最適化

**最適化対象**:
- 相対パス vs 絶対パス（~/ alias）の統一
- 未使用インポートの削除
- インポート順序の統一

---

### 🟢 Phase 3: 品質向上
**期間**: 1-2週間  
**優先度**: 中  
**目標**: 保守性と拡張性の向上

#### 3.1 テストコード追加

**対象モジュール**:
```
app/features/bucket-list/
├── repositories/     # Repository層のテスト
├── services/        # Service層のテスト
└── components/      # コンポーネントテスト

app/lib/
├── auth-server.ts   # 認証フローテスト
└── security-utils.ts # セキュリティテスト
```

#### 3.2 ESLintルール強化

**追加ルール**:
- unused-imports: 未使用インポートの検出
- consistent-type-imports: 型インポートの統一
- prefer-const: const使用の強制

#### 3.3 ドキュメント整備

**作成ドキュメント**:
- コンポーネント仕様書
- API仕様書
- テストガイド

---

## ✅ 実行チェックリスト

### Phase 1: 緊急クリーンアップ ✅ **完了**

#### 不要ファイル削除 ✅ **完了**
- ✅ app/routes/instruments/ の使用状況確認
- ✅ app/routes/sample/ の使用状況確認
- ✅ app/supabase.ts の参照確認
- ✅ bucket-item-form-conform.tsx の使用状況確認
- ✅ 対象ファイルの削除実行
- ✅ 動作確認（全機能テスト）

#### TypeScriptエラー修正 ✅ **完了**
- ✅ 型アサーション関数の実装
- ✅ null safety対応
- ✅ モジュール解決エラー修正
- ✅ `npm run typecheck` でエラー0確認
- ✅ 動作確認

#### routes.ts整理 ✅ **完了**
- ✅ 未使用ルートの削除（削除により自動解決）
- ✅ インポート文の整理
- ✅ 型定義エラー修正
- ✅ 全ページ遷移テスト

**Phase 1成果**:
- ファイル数削減: 6個
- TypeScriptエラー: 11個 → 0個
- ビルド成功確認
- コード行数削減: 472行

### Phase 2: 構造最適化

#### 重複コンポーネント統合
- [ ] 使用中コンポーネントの特定
- [ ] 機能差分分析
- [ ] 統合実装
- [ ] テスト実行

#### 型定義の中央集権化
- [ ] routes配下types.ts削除
- [ ] インポートパス修正
- [ ] 型定義整理
- [ ] コンパイル確認

#### インポートパス最適化
- [ ] 相対/絶対パス統一
- [ ] 未使用インポート削除
- [ ] インポート順序統一
- [ ] ESLint実行

### Phase 3: 品質向上

#### テストコード追加
- [ ] Repository層テスト実装
- [ ] Service層テスト実装
- [ ] コンポーネントテスト実装
- [ ] テストカバレッジ確認

#### ESLintルール強化
- [ ] 新規ルール設定
- [ ] 既存コードの修正
- [ ] CI/CDパイプライン更新

#### ドキュメント整備
- [ ] コンポーネント仕様書作成
- [ ] API仕様書作成
- [ ] テストガイド作成

---

## 📈 成功指標

### Phase 1完了時の指標
- [ ] TypeScriptエラー: 11個 → 0個
- [ ] ファイル数削減: 10%以上
- [ ] 全機能正常動作

### Phase 2完了時の指標
- [ ] 重複コンポーネント: 0個
- [ ] インポートエラー: 0個
- [ ] ESLintエラー: 0個

### Phase 3完了時の指標
- [ ] テストカバレッジ: 80%以上
- [ ] ドキュメント整備率: 100%
- [ ] コード品質スコア: 90点以上

---

## 🚧 リスク管理

### 高リスク作業
1. **不要ファイル削除**: 意図しない機能破綻の可能性
2. **型定義変更**: 広範囲への影響の可能性
3. **コンポーネント統合**: UI/UX変更の可能性

### リスク軽減策
1. **段階的実行**: 小さな変更を積み重ね
2. **十分なテスト**: 各段階での動作確認
3. **バックアップ**: git branchでの作業
4. **ロールバック計画**: 問題発生時の復旧手順

---

## 📞 連絡・報告

### 進捗報告
- 各Phase完了時にステータス更新
- 問題発生時は即座に報告
- 週次進捗レビュー実施

### 完了基準
- 全チェックリスト項目の完了
- 成功指標の達成
- ステークホルダーの承認

---

*このドキュメントは実行進捗に応じて更新されます。*
*最終更新: 2025年6月10日*