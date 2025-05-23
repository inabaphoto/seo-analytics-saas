-- 004_raw_data_tables.sql
-- Google Analytics 4とSearch Console生データ保存テーブル
-- APIレスポンスを完全に同じ構造で保存

-- Google Analytics 4 生データテーブル
CREATE TABLE ga4_raw_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- データ取得対象日
  api_endpoint VARCHAR(255) NOT NULL, -- 使用したAPIエンドポイント（例: runReport, runRealtimeReport）
  request_params JSONB, -- APIリクエストパラメータ
  raw_response JSONB NOT NULL, -- APIレスポンスをそのまま保存
  response_metadata JSONB, -- レスポンスメタデータ（ヘッダー情報など）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 重複防止のための複合ユニーク制約
  UNIQUE(tenant_id, site_id, date, api_endpoint, 
         md5(request_params::text))
);

-- Google Search Console 生データテーブル
CREATE TABLE gsc_raw_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- データ取得対象日
  api_endpoint VARCHAR(255) NOT NULL, -- 使用したAPIエンドポイント（例: searchanalytics/query）
  request_params JSONB, -- APIリクエストパラメータ
  raw_response JSONB NOT NULL, -- APIレスポンスをそのまま保存
  response_metadata JSONB, -- レスポンスメタデータ（ヘッダー情報など）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 重複防止のための複合ユニーク制約
  UNIQUE(tenant_id, site_id, date, api_endpoint, 
         md5(request_params::text))
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_ga4_raw_data_tenant_site_date 
  ON ga4_raw_data(tenant_id, site_id, date DESC);
CREATE INDEX idx_ga4_raw_data_endpoint 
  ON ga4_raw_data(api_endpoint);
CREATE INDEX idx_ga4_raw_data_response_gin 
  ON ga4_raw_data USING GIN (raw_response);

CREATE INDEX idx_gsc_raw_data_tenant_site_date 
  ON gsc_raw_data(tenant_id, site_id, date DESC);
CREATE INDEX idx_gsc_raw_data_endpoint 
  ON gsc_raw_data(api_endpoint);
CREATE INDEX idx_gsc_raw_data_response_gin 
  ON gsc_raw_data USING GIN (raw_response);

-- RLSポリシーの設定
ALTER TABLE ga4_raw_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_raw_data ENABLE ROW LEVEL SECURITY;

-- GA4生データアクセスポリシー
CREATE POLICY "ga4_raw_data_tenant_isolation" ON ga4_raw_data
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  );

-- GSC生データアクセスポリシー  
CREATE POLICY "gsc_raw_data_tenant_isolation" ON gsc_raw_data
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ga4_raw_data_updated_at 
  BEFORE UPDATE ON ga4_raw_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gsc_raw_data_updated_at 
  BEFORE UPDATE ON gsc_raw_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- テーブルコメント
COMMENT ON TABLE ga4_raw_data IS 'Google Analytics 4 APIレスポンスの生データ保存テーブル';
COMMENT ON TABLE gsc_raw_data IS 'Google Search Console APIレスポンスの生データ保存テーブル';

COMMENT ON COLUMN ga4_raw_data.raw_response IS 'GA4 APIレスポンスをそのままJSONB形式で保存';
COMMENT ON COLUMN gsc_raw_data.raw_response IS 'GSC APIレスポンスをそのままJSONB形式で保存';
