import { encryptTokens, decryptTokens } from '@/lib/auth/encryption';
import { refreshAccessToken } from '@/lib/auth/oauth-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Google Search Console データ取得サービス
 */
export class GoogleSearchConsoleService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * 認証済みのクライアントを初期化
   */
  private async initializeClient(accessToken: string, refreshToken: string) {
    const currentAccessToken = await this.ensureValidToken(accessToken, refreshToken);

    // 直接fetch APIを使用してGoogle Search Console APIを呼び出し
    this.accessToken = currentAccessToken;
    this.refreshToken = refreshToken;
    
    return currentAccessToken;
  }

  /**
   * トークンの有効期限を確認し、有効期限が切れている場合はリフレッシュ
   */
  private async ensureValidToken(accessToken: string, refreshToken: string): Promise<string> {
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
    const { accessToken: decryptedAccessToken, refreshToken: decryptedRefreshToken } = decryptTokens({
      encryptedAccessToken: tokenData.access_token,
      encryptedRefreshToken: tokenData.refresh_token,
    });

    // トークンの有効期限を確認
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    let currentAccessToken = decryptedAccessToken;

    // 有効期限が切れている場合はリフレッシュ
    if (expiresAt <= now) {
      console.log('🔄 GSC用アクセストークンをリフレッシュ中...');
      
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      
      const newTokens = await refreshAccessToken(decryptedRefreshToken, clientId, clientSecret);
      currentAccessToken = newTokens.access_token;

      // 新しいトークンをデータベースに保存
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
      const newEncryptedTokens = encryptTokens({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || decryptedRefreshToken,
      });

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

      console.log('✅ GSC用アクセストークンをリフレッシュしました');
    }

    return currentAccessToken;
  }

  /**
   * サイトリストを取得
   * @returns サイトリスト
   */
  async getSiteList(): Promise<GSCSiteData[]> {
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

      console.log('🔍 GSCサイトリストを取得中...');

      const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const sites = data.siteEntry || [];

      console.log(`✅ GSCサイトリストを取得しました (${sites.length}件)`);

      return sites.map((site: any) => ({
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel,
      }));
    } catch (error) {
      console.error('❌ GSCサイトリストの取得に失敗:', error);
      throw new Error(`GSCサイトリストの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 検索パフォーマンスデータを取得
   * @param siteUrl サイトURL
   * @param startDate 開始日 (YYYY-MM-DD)
   * @param endDate 終了日 (YYYY-MM-DD)
   * @param dimensions 取得するディメンション
   * @returns 検索パフォーマンスデータ
   */
  async getSearchPerformance(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: GSCDimension[] = ['query', 'page']
  ): Promise<GSCSearchPerformanceData> {
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

      console.log(`📈 GSC検索パフォーマンスを取得中... Site: ${siteUrl}, 期間: ${startDate} - ${endDate}`);

      const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate,
          endDate: endDate,
          dimensions: dimensions,
          rowLimit: 25000,
          startRow: 0,
        }),
      });

      const data = await response.json();
      const rows = data.rows || [];

      console.log(`✅ GSC検索パフォーマンスを取得しました (${rows.length}件)`);

      return {
        data: rows.map((row: any) => {
          const keys = row.keys || [];
          return {
            query: keys[0] || '',
            page: keys[1] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          };
        }),
        totalRows: rows.length,
      };
    } catch (error) {
      console.error('❌ GSC検索パフォーマンスの取得に失敗:', error);
      throw new Error(`GSC検索パフォーマンスの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * インデックス状況を取得
   * @param siteUrl サイトURL
   * @returns インデックス状況
   */
  async getIndexStatus(siteUrl: string): Promise<GSCIndexData> {
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

      console.log(`📑 GSCインデックス状況を取得中... Site: ${siteUrl}`);

      const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: this.getDateDaysAgo(90), // 過去90日
          endDate: this.getDateDaysAgo(0), // 今日
          dimensions: ['page'],
          rowLimit: 25000,
          startRow: 0,
        }),
      });

      const data = await response.json();
      const rows = data.rows || [];

      console.log(`✅ GSCインデックス状況を取得しました (${rows.length}件)`);

      return {
        indexedPages: rows.length,
        totalClicks: rows.reduce((sum: number, row: any) => sum + (row.clicks || 0), 0),
        totalImpressions: rows.reduce((sum: number, row: any) => sum + (row.impressions || 0), 0),
        avgCTR: rows.length > 0 ? rows.reduce((sum: number, row: any) => sum + (row.ctr || 0), 0) / rows.length : 0,
        avgPosition: rows.length > 0 ? rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) / rows.length : 0,
      };
    } catch (error) {
      console.error('❌ GSCインデックス状況の取得に失敗:', error);
      throw new Error(`GSCインデックス状況の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 指定日数前の日付を取得
   * @param daysAgo 何日前か
   * @returns YYYY-MM-DD形式の日付
   */
  private getDateDaysAgo(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }
}

/**
 * GSCサイトデータの型定義
 */
export interface GSCSiteData {
  siteUrl: string;
  permissionLevel: string;
}

/**
 * GSC検索パフォーマンスデータの型定義
 */
export interface GSCSearchPerformanceData {
  data: {
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  totalRows: number;
}

/**
 * GSCインデックスデータの型定義
 */
export interface GSCIndexData {
  indexedPages: number;
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgPosition: number;
}

/**
 * GSCディメンションの型定義
 */
export type GSCDimension = 'query' | 'page' | 'country' | 'device' | 'searchAppearance' | 'date';
