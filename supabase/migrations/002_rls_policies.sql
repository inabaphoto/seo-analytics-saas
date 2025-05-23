-- RLSを有効化
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_console_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

-- ヘルパー関数：現在のユーザーのテナントIDを取得
CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ヘルパー関数：現在のユーザーのロールを取得
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenantsテーブルのポリシー
CREATE POLICY "ユーザーは自分のテナントのみ参照可能" ON public.tenants
    FOR SELECT
    USING (id = auth.user_tenant_id());

CREATE POLICY "管理者のみテナント情報を更新可能" ON public.tenants
    FOR UPDATE
    USING (id = auth.user_tenant_id() AND auth.user_role() = 'admin')
    WITH CHECK (id = auth.user_tenant_id() AND auth.user_role() = 'admin');

-- Usersテーブルのポリシー
CREATE POLICY "ユーザーは同じテナントのユーザーのみ参照可能" ON public.users
    FOR SELECT
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "ユーザーは自分の情報のみ更新可能" ON public.users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND tenant_id = auth.user_tenant_id());

CREATE POLICY "管理者は同じテナントのユーザーを作成可能" ON public.users
    FOR INSERT
    WITH CHECK (auth.user_role() = 'admin' AND tenant_id = auth.user_tenant_id());

CREATE POLICY "管理者は同じテナントのユーザーを削除可能" ON public.users
    FOR DELETE
    USING (auth.user_role() = 'admin' AND tenant_id = auth.user_tenant_id());

-- Sitesテーブルのポリシー
CREATE POLICY "ユーザーは自分のテナントのサイトのみ参照可能" ON public.sites
    FOR SELECT
    USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "管理者とメンバーはサイトを作成可能" ON public.sites
    FOR INSERT
    WITH CHECK (
        tenant_id = auth.user_tenant_id() AND 
        auth.user_role() IN ('admin', 'member')
    );

CREATE POLICY "管理者とメンバーはサイトを更新可能" ON public.sites
    FOR UPDATE
    USING (
        tenant_id = auth.user_tenant_id() AND 
        auth.user_role() IN ('admin', 'member')
    )
    WITH CHECK (
        tenant_id = auth.user_tenant_id() AND 
        auth.user_role() IN ('admin', 'member')
    );

CREATE POLICY "管理者のみサイトを削除可能" ON public.sites
    FOR DELETE
    USING (tenant_id = auth.user_tenant_id() AND auth.user_role() = 'admin');

-- OAuth Tokensテーブルのポリシー
CREATE POLICY "ユーザーは自分のトークンのみ参照可能" ON public.oauth_tokens
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "ユーザーは自分のトークンを作成・更新可能" ON public.oauth_tokens
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "ユーザーは自分のトークンを更新可能" ON public.oauth_tokens
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "ユーザーは自分のトークンを削除可能" ON public.oauth_tokens
    FOR DELETE
    USING (user_id = auth.uid());

-- Analytics Dataテーブルのポリシー
CREATE POLICY "ユーザーは自分のテナントのデータのみ参照可能" ON public.analytics_data
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = analytics_data.site_id
            AND sites.tenant_id = auth.user_tenant_id()
        )
    );

CREATE POLICY "システムのみデータを挿入可能" ON public.analytics_data
    FOR INSERT
    WITH CHECK (false); -- サービスロールキーでのみ挿入可能

-- Search Console Dataテーブルのポリシー
CREATE POLICY "ユーザーは自分のテナントのデータのみ参照可能" ON public.search_console_data
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = search_console_data.site_id
            AND sites.tenant_id = auth.user_tenant_id()
        )
    );

CREATE POLICY "システムのみデータを挿入可能" ON public.search_console_data
    FOR INSERT
    WITH CHECK (false); -- サービスロールキーでのみ挿入可能

-- Analysis Reportsテーブルのポリシー
CREATE POLICY "ユーザーは自分のテナントのレポートのみ参照可能" ON public.analysis_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = analysis_reports.site_id
            AND sites.tenant_id = auth.user_tenant_id()
        )
    );

CREATE POLICY "管理者とメンバーはレポートを作成可能" ON public.analysis_reports
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = analysis_reports.site_id
            AND sites.tenant_id = auth.user_tenant_id()
            AND auth.user_role() IN ('admin', 'member')
        )
    );

-- 管理者用のバイパスポリシー（デバッグ用、本番環境では削除推奨）
-- CREATE POLICY "サービスロールは全アクセス可能" ON public.tenants
--     FOR ALL
--     USING (auth.role() = 'service_role')
--     WITH CHECK (auth.role() = 'service_role');
