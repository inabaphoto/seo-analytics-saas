# Supabaseセットアップガイド

このガイドでは、SEO分析SaaSのためのSupabaseプロジェクトをセットアップする手順を説明します。

## 前提条件

- Supabaseアカウントを作成済みであること
- Google Cloud Consoleでプロジェクトを作成済みであること
- Node.js 18.x以上がインストールされていること

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. 「New Project」をクリック
3. 以下の情報を入力：
   - **Project name**: `seo-one`（任意の名前）
   - **Database Password**: 強力なパスワードを生成
   - **Region**: 最も近いリージョンを選択（東京: Northeast Asia (Tokyo)）
4. 「Create new project」をクリック

## 2. データベースの初期化

プロジェクトが作成されたら、SQLエディタで以下のスクリプトを実行：

1. **SQL Editor**タブを開く
2. 以下の順番でSQLファイルを実行：
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_initial_data.sql
   ```

## 3. 認証設定

### 3.1 Google OAuth設定

1. **Authentication** > **Providers**に移動
2. **Google**を有効化
3. 以下の情報を入力：
   - **Client ID**: Google Cloud ConsoleのOAuth 2.0クライアントID
   - **Client Secret**: Google Cloud ConsoleのOAuth 2.0クライアントシークレット
4. **Authorized redirect URIs**をコピー（Google Cloud Consoleに登録）

### 3.2 URL設定

1. **Authentication** > **URL Configuration**で以下を設定：
   - **Site URL**: `http://localhost:3000`（開発環境）
   - **Redirect URLs**: 
     ```
     http://localhost:3000/callback
     http://localhost:3000/dashboard
     ```

## 4. 環境変数の設定

1. プロジェクトの**Settings** > **API**から以下をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

2. `.env.local`ファイルを作成（`.env.example`を参考に）：
   ```bash
   cp .env.example .env.local
   ```

3. 取得した値を`.env.local`に設定

## 5. Google Cloud Console設定

### 5.1 OAuth 2.0クライアントの作成

1. [Google Cloud Console](https://console.cloud.google.com)にログイン
2. **APIとサービス** > **認証情報**に移動
3. **認証情報を作成** > **OAuth クライアント ID**
4. 以下を設定：
   - **アプリケーションの種類**: ウェブアプリケーション
   - **名前**: SEO One
   - **承認済みのJavaScript生成元**:
     ```
     http://localhost:3000
     https://your-project.supabase.co
     ```
   - **承認済みのリダイレクトURI**:
     ```
     http://localhost:3000/callback
     https://your-project.supabase.co/auth/v1/callback
     ```

### 5.2 必要なAPIの有効化

以下のAPIを有効化：
- Google Analytics Data API
- Google Search Console API

## 6. データベースの確認

1. Supabase Dashboard の **Table Editor**で以下のテーブルが作成されていることを確認：
   - tenants
   - users
   - sites
   - oauth_tokens
   - analytics_data
   - search_console_data
   - analysis_reports

2. **Database** > **Roles**でRLSが有効になっていることを確認

## 7. ローカル開発環境の起動

```bash
# 依存関係のインストール（完了済みの場合はスキップ）
npm install

# 開発サーバーの起動
npm run dev
```

## 8. 初期ユーザーの作成

1. http://localhost:3000 にアクセス
2. 「Googleでログイン」をクリック
3. 初回ログイン時に自動的にユーザーとテナントが作成される

## トラブルシューティング

### RLSエラーが発生する場合

```sql
-- サービスロールを使用してデータを確認
SELECT * FROM auth.users;
SELECT * FROM public.users;
SELECT * FROM public.tenants;
```

### 認証エラーが発生する場合

1. Google Cloud ConsoleのリダイレクトURIを確認
2. Supabaseの環境変数が正しく設定されているか確認
3. ブラウザのCookieをクリアして再試行

## セキュリティチェックリスト

- [ ] 本番環境では強力なデータベースパスワードを使用
- [ ] `SUPABASE_SERVICE_ROLE_KEY`は絶対にクライアントサイドで使用しない
- [ ] RLSポリシーが正しく設定されているか確認
- [ ] 環境変数が`.gitignore`に含まれているか確認

## 次のステップ

セットアップが完了したら、[開発ガイド](./DEVELOPMENT.md)に従って開発を進めてください。
