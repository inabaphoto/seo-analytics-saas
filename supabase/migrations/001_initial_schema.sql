-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- テナントテーブル
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    settings JSONB DEFAULT '{}'::jsonb
);

-- ユーザーテーブル（Supabase Authと連携）
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb
);

-- サイトテーブル
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    name TEXT NOT NULL,
    ga4_property_id TEXT,
    gsc_property_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    UNIQUE(tenant_id, domain)
);

-- OAuth トークンテーブル（暗号化対応）
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google' CHECK (provider IN ('google')),
    access_token TEXT NOT NULL, -- 実運用では暗号化が必要
    refresh_token TEXT NOT NULL, -- 実運用では暗号化が必要
    expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    UNIQUE(user_id, provider)
);

-- GA4データテーブル
CREATE TABLE IF NOT EXISTS public.analytics_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    metric_type TEXT NOT NULL,
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_data JSONB,
    UNIQUE(site_id, date, metric_type, dimensions)
);

-- Search Consoleデータテーブル
CREATE TABLE IF NOT EXISTS public.search_console_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    query TEXT NOT NULL,
    page TEXT NOT NULL,
    country TEXT,
    device TEXT,
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    ctr NUMERIC(5,4) NOT NULL DEFAULT 0,
    position NUMERIC(6,2) NOT NULL DEFAULT 0,
    UNIQUE(site_id, date, query, page, country, device)
);

-- 分析レポートテーブル
CREATE TABLE IF NOT EXISTS public.analysis_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_insights JSONB DEFAULT '{}'::jsonb
);

-- インデックスの作成
CREATE INDEX idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX idx_sites_tenant_id ON public.sites(tenant_id);
CREATE INDEX idx_oauth_tokens_user_id ON public.oauth_tokens(user_id);
CREATE INDEX idx_analytics_data_site_id_date ON public.analytics_data(site_id, date);
CREATE INDEX idx_search_console_data_site_id_date ON public.search_console_data(site_id, date);
CREATE INDEX idx_search_console_data_query ON public.search_console_data(query);
CREATE INDEX idx_analysis_reports_site_id ON public.analysis_reports(site_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_reports_updated_at BEFORE UPDATE ON public.analysis_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
