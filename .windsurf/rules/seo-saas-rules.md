---
trigger: always_on
description: "SEO分析SaaSプロジェクトのコーディング規約とベストプラクティス"
---

# SEO分析SaaS プロジェクトルール

## 1. 基本方針

- すべてのコードはTypeScriptのstrictモードで記述する
- コンポーネントは原則としてServer Componentsとして実装し、必要な場合のみ'use client'ディレクティブを使用する
- データフェッチは必ずサーバーサイドで行い、クライアントには必要なデータのみを渡す
- セキュリティを最優先とし、RLS(Row Level Security)を適切に設定する

## 2. ディレクトリ構造

```
/app
  /(auth)           # 認証関連のルート
  /(dashboard)       # 認証が必要なダッシュボード
    /[tenantId]     # テナントごとのルート
      /sites        # サイト管理
      /reports      # レポート
      /settings     # 設定
  /api              # APIエンドポイント
/lib
  /auth            # 認証関連ユーティリティ
  /db              # データベース接続とスキーマ
  /services        # ビジネスロジック
  /types           # 共通型定義
  /utils           # ユーティリティ関数
```

## 3. コーディング規約

### 3.1 命名規則

- コンポーネント: PascalCase (例: `SiteList.tsx`)
- 関数・変数: camelCase
- 定数: UPPER_SNAKE_CASE
- 型・インターフェース: PascalCase (例: `Site`, `UserProfile`)
- ファイル名: kebab-case (例: `site-service.ts`)

### 3.2 コンポーネント

- コンポーネントはできるだけ小さく、単一責任の原則に従う
- 再利用可能なコンポーネントは`/components/ui`に配置
- ページ固有のコンポーネントは`/app/(dashboard)/[tenantId]/_components`に配置

### 3.3 データフェッチ

- サーバーコンポーネントでは`fetch` APIを直接使用
- クライアントコンポーネントでは`useEffect`やSWR, TanStack Queryを使用
- エラーハンドリングを必ず実装

## 4. セキュリティ

- すべてのデータベースクエリはRLSで保護
- ユーザー入力は常に検証・サニタイズ
- シークレット情報は環境変数で管理
- CSRFトークンを使用したフォーム送信

## 5. パフォーマンス

- 画像は最適化された形式(WebP)で配信
- コンポーネントは必要に応じて動的インポート
- データフェッチは並列化を検討
- 不要な再レンダリングを防ぐ

## 6. テスト

- ユニットテスト: Jest + React Testing Library
- E2Eテスト: Playwright
- テストカバレッジ80%以上を目標

## 7. ドキュメンテーション

- コンポーネント: JSDoc形式でドキュメント化
- API: OpenAPI仕様に準拠
- 主要な設計決定はADR(Architecture Decision Record)として記録
