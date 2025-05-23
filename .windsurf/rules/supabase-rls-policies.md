---
trigger: always_on
description: "Supabase RLS (Row Level Security) ポリシー実装ガイド"
---

# Supabase RLS ポリシー実装ガイド

## 1. 基本方針

- すべてのテーブルにはデフォルトでRLSを有効化する
- ポリシーは最小権限の原則に基づいて実装する
- テナント間のデータ分離を確実に行う
- ポリシーはSQLファイルで管理し、バージョン管理する

## 2. ポリシー実装ガイドライン

### 2.1 共通ポリシー

```sql
-- テーブル作成時にRLSを有効化
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- テナント分離のためのポリシー
CREATE POLICY "テナント分離ポリシー"
ON your_table
FOR ALL
USING (tenant_id = auth.uid()::uuid);
```

### 2.2 ロールベースのアクセス制御

```sql
-- 管理者は全権限を持つ
CREATE POLICY "管理者フルアクセス"
ON your_table
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.tenant_id = your_table.tenant_id
  )
);

-- 一般ユーザーは閲覧のみ
CREATE POLICY "一般ユーザー参照のみ"
ON your_table
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.tenant_id = your_table.tenant_id
  )
);
```

## 3. セキュリティ対策

- サービスロールキーはバックエンドでのみ使用する
- クライアントサイドでは常にanonキーを使用する
- 機密情報は暗号化カラムに保存する
- ポリシーのテストを自動化する

## 4. パフォーマンス

- インデックスを適切に設定する
- ポリシー内のサブクエリはパフォーマンスに影響するため注意する
- 頻繁に使用するポリシーはキャッシュを検討する

## 5. テスト

- 各ロールでのアクセス権限をテストする
- テナント間のデータ分離を検証する
- エッジケースを網羅する
