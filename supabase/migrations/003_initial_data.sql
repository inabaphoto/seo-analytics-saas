-- デモ用の初期データ（開発環境のみ）
-- 本番環境では削除またはコメントアウトしてください

-- デモテナントの作成
-- INSERT INTO public.tenants (id, name, plan, settings) VALUES
-- ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Demo Company', 'pro', '{"max_sites": 10}'::jsonb);

-- デモユーザーの作成（実際のユーザーはSupabase Authで作成後に追加）
-- INSERT INTO public.users (id, email, name, role, tenant_id) VALUES
-- ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'demo@example.com', 'Demo User', 'admin', '550e8400-e29b-41d4-a716-446655440001'::uuid);

-- デモサイトの作成
-- INSERT INTO public.sites (tenant_id, domain, name, ga4_property_id, gsc_property_url) VALUES
-- ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'example.com', 'Example Site', '123456789', 'https://example.com');

-- プラン別の設定テンプレート
CREATE TABLE IF NOT EXISTS public.plan_limits (
    plan TEXT PRIMARY KEY,
    max_sites INTEGER NOT NULL,
    max_users INTEGER NOT NULL,
    data_retention_days INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO public.plan_limits (plan, max_sites, max_users, data_retention_days, features) VALUES
('free', 1, 1, 30, '{"api_access": false, "ai_insights": false, "custom_reports": false}'::jsonb),
('starter', 3, 3, 90, '{"api_access": false, "ai_insights": true, "custom_reports": false}'::jsonb),
('pro', 10, 10, 365, '{"api_access": true, "ai_insights": true, "custom_reports": true}'::jsonb),
('enterprise', 999, 999, 730, '{"api_access": true, "ai_insights": true, "custom_reports": true, "white_label": true}'::jsonb)
ON CONFLICT (plan) DO UPDATE SET
    max_sites = EXCLUDED.max_sites,
    max_users = EXCLUDED.max_users,
    data_retention_days = EXCLUDED.data_retention_days,
    features = EXCLUDED.features;
