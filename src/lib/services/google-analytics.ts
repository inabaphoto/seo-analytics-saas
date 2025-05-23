import { BetaAnalyticsDataClient, protos } from '@google-analytics/data';
import { encryptTokens, decryptTokens } from '@/lib/auth/encryption';
import { refreshAccessToken } from '@/lib/auth/oauth-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Google Analytics 4 (GA4) データ取得サービス
 */
export class GoogleAnalyticsService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * 認証済みのGA4クライアントを取得
   */
  private async initializeClient(accessToken: string, refreshToken: string) {
    const currentAccessToken = await this.ensureValidToken(accessToken, refreshToken);

    // 直接fetch APIを使用してGoogle Analytics Admin APIを呼び出し
    this.accessToken = currentAccessToken;
    this.refreshToken = refreshToken;
    
    return currentAccessToken;
  }

  /**
   * トークンの有効期限を確認し、有効期限が切れている場合はリフレッシュ
   */
  private async ensureValidToken(accessToken: string, refreshToken: string): Promise<string> {
    // トークンの有効期限を確認
    const expiresAt = new Date();
    const now = new Date();

    let currentAccessToken = accessToken;

    // 有効期限が切れている場合はリフレッシュ
    if (expiresAt <= now) {
      console.log('🔄 アクセストークンをリフレッシュ中...');
      
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      
      const newTokens = await refreshAccessToken(refreshToken, clientId, clientSecret);
      currentAccessToken = newTokens.access_token;

      // 新しいトークンをデータベースに保存
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
      const newEncryptedTokens = encryptTokens({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || refreshToken,
      });

      const supabase = createClient();
      await supabase
        .from('oauth_tokens')
        .update({
          access_token: newEncryptedTokens.encryptedAccessToken,
          refresh_token: newEncryptedTokens.encryptedRefreshToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId)
        .eq('provider', 'google');

      console.log('✅ アクセストークンをリフレッシュしました');
    }

    return currentAccessToken;
  }

  /**
   * 基本的なレポートデータを取得
   * @param propertyId GA4プロパティID
   * @param startDate 開始日 (YYYY-MM-DD)
   * @param endDate 終了日 (YYYY-MM-DD)
   * @returns レポートデータ
   */
  async getBasicReport(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GA4ReportData> {
    try {
      // データベースからトークンを取得
      const supabase = createClient();
      const { data: tokenData, error } = await supabase
        .from('oauth_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', this.userId)
        .eq('provider', 'google')
        .single();

      if (error || !tokenData) {
        throw new Error('Google OAuth トークンが見つかりません');
      }

      // トークンを復号化
      const { accessToken, refreshToken } = decryptTokens({
        encryptedAccessToken: tokenData.access_token,
        encryptedRefreshToken: tokenData.refresh_token,
      });

      // 認証済みのクライアントを取得
      const currentAccessToken = await this.initializeClient(accessToken, refreshToken);

      console.log(`📊 GA4レポートを取得中... Property: ${propertyId}, 期間: ${startDate} - ${endDate}`);

      // 直接fetch APIを使用してGoogle Analytics Admin APIを呼び出し
      const response = await fetch(`https://analyticsdata.googleapis.com/v1alpha/properties/${propertyId}/reports:run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentAccessToken}`,
        },
        body: JSON.stringify({
          'requests': [
            {
              'metric': 'screenPageViews',
              'dimension': 'pagePath',
            },
          ],
        }),
      });

      const data = await response.json();

      console.log(`✅ GA4レポートを取得しました (${data.rows?.length || 0}件)`);

      return this.transformGA4Response(data);
    } catch (error) {
      console.error('❌ GA4レポートの取得に失敗:', error);
      throw new Error(`GA4レポートの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * リアルタイムデータを取得
   * @param propertyId GA4プロパティID
   * @returns リアルタイムデータ
   */
  async getRealtimeReport(propertyId: string): Promise<GA4RealtimeData> {
    try {
      // データベースからトークンを取得
      const supabase = createClient();
      const { data: tokenData, error } = await supabase
        .from('oauth_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', this.userId)
        .eq('provider', 'google')
        .single();

      if (error || !tokenData) {
        throw new Error('Google OAuth トークンが見つかりません');
      }

      // トークンを復号化
      const { accessToken, refreshToken } = decryptTokens({
        encryptedAccessToken: tokenData.access_token,
        encryptedRefreshToken: tokenData.refresh_token,
      });

      // 認証済みのクライアントを取得
      const currentAccessToken = await this.initializeClient(accessToken, refreshToken);

      console.log(`⚡ GA4リアルタイムデータを取得中... Property: ${propertyId}`);

      // 直接fetch APIを使用してGoogle Analytics Admin APIを呼び出し
      const response = await fetch(`https://analyticsdata.googleapis.com/v1alpha/properties/${propertyId}/reports:runRealtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentAccessToken}`,
        },
        body: JSON.stringify({
          'requests': [
            {
              'metric': 'activeUsers',
              'dimension': 'pagePath',
            },
          ],
        }),
      });

      const data = await response.json();

      console.log(`✅ GA4リアルタイムデータを取得しました (${data.rows?.length || 0}件)`);

      return this.transformGA4RealtimeResponse(data);
    } catch (error) {
      console.error('❌ GA4リアルタイムデータの取得に失敗:', error);
      throw new Error(`GA4リアルタイムデータの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * GA4 レスポンスを変換
   */
  private transformGA4Response(
    response: any
  ): GA4ReportData {
    const rows = response.rows || [];
    
    const transformedData = rows.map((row: any) => {
      const dimensions = row.dimensionValues || [];
      const metrics = row.metricValues || [];

      return {
        date: dimensions[0]?.value || '',
        pagePath: dimensions[1]?.value || '',
        pageTitle: dimensions[2]?.value || '',
        sessions: parseInt(metrics[0]?.value || '0'),
        pageViews: parseInt(metrics[1]?.value || '0'),
        users: parseInt(metrics[2]?.value || '0'),
        bounceRate: parseFloat(metrics[3]?.value || '0'),
        avgSessionDuration: parseFloat(metrics[4]?.value || '0'),
        conversions: parseInt(metrics[5]?.value || '0'),
      };
    });

    return {
      data: transformedData,
      totalRows: response.rowCount || 0,
      samplingMetadatas: response.metadata?.samplingMetadatas || [],
    };
  }

  /**
   * GA4 リアルタイムレスポンスを変換
   */
  private transformGA4RealtimeResponse(
    response: any
  ): GA4RealtimeData {
    const rows = response.rows || [];
    
    const transformedData = rows.map((row: any) => {
      const dimensions = row.dimensionValues || [];
      const metrics = row.metricValues || [];

      return {
        pagePath: dimensions[0]?.value || '',
        pageTitle: dimensions[1]?.value || '',
        activeUsers: parseInt(metrics[0]?.value || '0'),
        pageViews: parseInt(metrics[1]?.value || '0'),
      };
    });

    return {
      data: transformedData,
      totalRows: response.rowCount || 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * GA4レポートデータの型定義
 */
export interface GA4ReportData {
  data: {
    date: string;
    pagePath: string;
    pageTitle: string;
    sessions: number;
    pageViews: number;
    users: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversions: number;
  }[];
  totalRows: number;
  samplingMetadatas: any[];
}

/**
 * GA4リアルタイムデータの型定義
 */
export interface GA4RealtimeData {
  data: {
    pagePath: string;
    pageTitle: string;
    activeUsers: number;
    pageViews: number;
  }[];
  totalRows: number;
  timestamp: string;
}
