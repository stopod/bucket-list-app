# ユーザーフローシーケンス図

このドキュメントでは、バケットリストアプリケーションの主要なユーザーフローをシーケンス図で説明します。

## 1. ログインからダッシュボード表示

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as アプリケーション
    participant Auth as Supabase Auth
    participant DB as データベース

    User->>App: アプリケーションアクセス
    App->>Auth: 認証状態チェック
    
    alt 未認証の場合
        Auth-->>App: 未認証レスポンス
        App->>User: ログイン画面表示
        User->>App: ログイン情報入力
        App->>Auth: ログイン要求
        Auth-->>App: 認証トークン
        App->>App: 認証状態更新
    else 認証済みの場合
        Auth-->>App: 認証済みレスポンス
    end
    
    App->>DB: ユーザー統計データ取得
    DB-->>App: 統計データ
    App->>DB: 最近の項目取得
    DB-->>App: 項目データ
    App->>User: ダッシュボード表示
```

## 2. やりたいこと項目の新規作成

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UI コンポーネント
    participant Service as Service層
    participant Repository as Repository層
    participant DB as データベース

    User->>UI: 「新規作成」ボタンクリック
    UI->>User: 作成フォーム表示
    User->>UI: 項目情報入力
    User->>UI: 「作成」ボタンクリック
    
    UI->>UI: フォームバリデーション
    
    alt バリデーション成功
        UI->>Service: createBucketItem()
        Service->>Service: ビジネスロジック検証
        Service->>Repository: create()
        Repository->>DB: INSERT文実行
        DB-->>Repository: 作成された項目
        Repository-->>Service: Result<Success>
        Service-->>UI: 成功レスポンス
        UI->>User: 成功メッセージ表示
        UI->>UI: 項目リスト更新
    else バリデーション失敗
        UI->>User: エラーメッセージ表示
    end
```

## 3. 項目の編集・更新

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UI コンポーネント
    participant Service as Service層
    participant Repository as Repository層
    participant DB as データベース

    User->>UI: 項目の「編集」ボタンクリック
    UI->>Service: getBucketItem(id)
    Service->>Repository: findById(id)
    Repository->>DB: SELECT文実行
    DB-->>Repository: 項目データ
    Repository-->>Service: Result<Success>
    Service-->>UI: 項目データ
    UI->>User: 編集フォーム表示（データ入力済み）
    
    User->>UI: 項目情報編集
    User->>UI: 「更新」ボタンクリック
    
    UI->>UI: フォームバリデーション
    
    alt バリデーション成功
        UI->>Service: updateBucketItem(id, data)
        Service->>Service: ビジネスロジック検証
        Service->>Repository: update(id, data)
        Repository->>DB: UPDATE文実行
        DB-->>Repository: 更新された項目
        Repository-->>Service: Result<Success>
        Service-->>UI: 成功レスポンス
        UI->>User: 成功メッセージ表示
        UI->>UI: 項目リスト更新
    else バリデーション失敗
        UI->>User: エラーメッセージ表示
    end
```

## 4. 項目のステータス変更（完了マーク）

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UI コンポーネント
    participant Service as Service層
    participant Repository as Repository層
    participant DB as データベース

    User->>UI: ステータス変更ボタンクリック
    UI->>Service: toggleStatus(id)
    Service->>Repository: findById(id)
    Repository->>DB: SELECT文実行
    DB-->>Repository: 現在の項目データ
    Repository-->>Service: Result<Success>
    
    Service->>Service: ステータス切り替えロジック
    Note over Service: not_started → in_progress → completed
    
    Service->>Repository: update(id, {status: newStatus})
    Repository->>DB: UPDATE文実行
    DB-->>Repository: 更新された項目
    Repository-->>Service: Result<Success>
    Service-->>UI: 成功レスポンス
    UI->>UI: UI状態更新（進捗バー等）
    UI->>User: 視覚的フィードバック表示
```

## 5. 項目の削除

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UI コンポーネント
    participant Service as Service層
    participant Repository as Repository層
    participant DB as データベース

    User->>UI: 項目の「削除」ボタンクリック
    UI->>User: 削除確認ダイアログ表示
    User->>UI: 削除確認
    
    UI->>Service: deleteBucketItem(id)
    Service->>Repository: delete(id)
    Repository->>DB: DELETE文実行
    DB-->>Repository: 削除結果
    Repository-->>Service: Result<Success>
    Service-->>UI: 成功レスポンス
    UI->>User: 成功メッセージ表示
    UI->>UI: 項目リストから削除
```

## 6. 検索・フィルタリング

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UI コンポーネント
    participant Service as Service層
    participant Repository as Repository層
    participant DB as データベース

    User->>UI: 検索キーワード入力
    UI->>UI: デバウンス処理（300ms）
    
    alt 検索実行
        UI->>Service: searchBucketItems(query)
        Service->>Repository: search(query)
        Repository->>DB: SELECT文実行（LIKE検索）
        DB-->>Repository: 検索結果
        Repository-->>Service: Result<Success>
        Service-->>UI: 検索結果データ
        UI->>User: フィルタリング結果表示
    end
    
    User->>UI: カテゴリフィルタ選択
    UI->>Service: filterByCategory(category)
    Service->>Repository: findByCategory(category)
    Repository->>DB: SELECT文実行（WHERE条件）
    DB-->>Repository: フィルタ結果
    Repository-->>Service: Result<Success>
    Service-->>UI: フィルタ結果データ
    UI->>User: カテゴリ別項目表示
```

## 7. 公開リスト閲覧

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UI コンポーネント
    participant Service as Service層
    participant Repository as Repository層
    participant DB as データベース

    User->>UI: 「公開リスト」ページアクセス
    UI->>Service: getPublicBucketItems()
    Service->>Repository: findPublic()
    Repository->>DB: SELECT文実行（is_public=true）
    DB-->>Repository: 公開項目データ
    Repository-->>Service: Result<Success>
    Service-->>UI: 公開項目リスト
    UI->>User: 公開リスト表示
    
    User->>UI: 特定項目の詳細表示
    UI->>Service: getPublicBucketItem(id)
    Service->>Repository: findPublicById(id)
    Repository->>DB: SELECT文実行（公開権限チェック）
    DB-->>Repository: 項目詳細データ
    Repository-->>Service: Result<Success>
    Service-->>UI: 項目詳細
    UI->>User: 詳細情報表示
```

## アーキテクチャ特徴

### Result型エラーハンドリング

全てのService層およびRepository層では、Result<T, E>型を使用した型安全なエラーハンドリングを実装しています：

- **成功時**: `Result<Success<T>>`
- **失敗時**: `Result<Failure<E>>`

### 関数型プログラミング

Service層は完全に関数型で実装されており、以下の特徴があります：

- 純粋関数による副作用の分離
- 関数合成とコンビネーターの活用
- 不変性の原則

### SSR対応

React Router v7によるServer-Side Renderingにより、初期ページロード時のデータ取得が最適化されています。

## エラーハンドリングパターン

各フローで発生する可能性のあるエラーとその対処：

1. **認証エラー**: 自動ログイン画面へリダイレクト
2. **バリデーションエラー**: フォーム上にエラーメッセージ表示
3. **データベースエラー**: 適切なエラーメッセージとリトライ機能
4. **ネットワークエラー**: 接続状態の確認とリトライ提案

## パフォーマンス最適化

- **デバウンス処理**: 検索入力での不要なAPI呼び出し削減
- **キャッシュ戦略**: 頻繁にアクセスされるデータのキャッシュ
- **遅延読み込み**: 大量データの段階的ロード
- **リアルタイム更新**: 必要最小限のデータ更新