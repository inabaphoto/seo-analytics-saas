# SEO Analytics SaaS

SEO分析SaaS - Google Analytics 4とSearch Consoleを連携したSEO分析プラットフォーム

## 🚀 機能

### 📊 データ連携
- **Google Analytics 4 (GA4)** - ウェブサイトのアクセス解析
- **Google Search Console (GSC)** - 検索パフォーマンス分析
- **OAuth2 PKCE認証** - セキュアな認証フロー

### 🎯 主要機能
- マルチテナント対応のSaaS構造
- リアルタイムSEOデータダッシュボード
- GA4とGSCの統合分析
- セキュアなデータ管理（Supabase RLS）

## 🛠 技術スタック

### フロントエンド
- **Next.js 14** - App Router対応
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - モダンなUI

### バックエンド
- **Supabase** - PostgreSQLデータベース
- **Row Level Security (RLS)** - テナント分離
- **Server Actions** - サーバーサイド処理

### 認証・API
- **Google OAuth2** - PKCE フロー
- **Google Analytics Admin API v1beta** - GA4データ取得
- **Google Search Console API** - GSCデータ取得

## 🔧 セットアップ

### 1. 環境変数の設定
```bash
cp .env.example .env.local
```

必要な環境変数：
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your-nextauth-secret

# 暗号化キー
ENCRYPTION_KEY=your-encryption-key
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. データベースマイグレーション
```bash
npx supabase db reset
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

## 📱 使用方法

### 1. OAuth認証
1. `/test` ページでGoogle OAuth認証を実行
2. Google Analytics とSearch Console へのアクセス許可

### 2. サイト設定
1. 認証成功後、サイト設定ページに移動
2. GA4プロパティとGSCサイトを選択
3. 設定を保存してダッシュボードへ

### 3. データ分析
- リアルタイムのSEOメトリクス表示
- GA4とGSCの統合レポート
- カスタムダッシュボード

## 🔐 セキュリティ

### データ保護
- **暗号化されたOAuthトークン** - セキュアなCookie保存
- **RLS (Row Level Security)** - テナント間データ分離
- **HTTPS必須** - 本番環境での暗号化通信

### 認証
- **PKCE フロー** - OAuth2のセキュリティ強化
- **リフレッシュトークン** - 長期間の認証維持
- **スコープ制限** - 最小権限の原則

## 🚨 トラブルシューティング

### よくある問題

#### 404エラー (GA4 API)
- Google Analytics Admin API v1beta を使用
- エンドポイント: `/v1beta/accountSummaries`

#### 403エラー (権限不足)
- 必要なOAuth2スコープの確認
- API有効化の確認（Google Cloud Console）

#### ハイドレーションエラー
- `isMounted` ステートでクライアントサイドレンダリング制御
- `'use client'` ディレクティブの使用

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

## 📞 サポート

技術的な質問やサポートが必要な場合は、Issueを作成してください。
