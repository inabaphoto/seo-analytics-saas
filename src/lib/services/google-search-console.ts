import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { encryptTokens, decryptTokens } from '@/lib/auth/encryption';
import { refreshAccessToken } from '@/lib/auth/oauth-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Google Search Console (GSC) データ取得サービス
 */
export class GoogleSearchConsoleService {
  private searchConsoleClient: any = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * 認証済みのGSCクライアントを取得
   */
  private async getAuthenticatedClient() {
    if (this.searchConsoleClient) {
      return this.searchConsoleClient;
    }

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

    // トークンの有効期限を確認
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    let currentAccessToken = accessToken;

    // 有効期限が切れている場合はリフレッシュ
    if (expiresAt <= now) {
      console.log('🔄 GSC用アクセストークンをリフレッシュ中...');
      
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

    // Google Auth ライブラリの設定
    const auth = new GoogleAuth({
      credentials: {
        access_token: currentAccessToken,
        refresh_token: refreshToken,
      },
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    // Search Console API クライアントの作成
    this.searchConsoleClient = google.searchconsole({ version: 'v1', auth });
    return this.searchConsoleClient;
  }

  /**
   * サイトリストを取得
   * @returns サイトリスト
   */
  async getSiteList(): Promise<GSCSiteData[]> {
    try {
      const client = await this.getAuthenticatedClient();

      console.log('🔍 GSCサイトリストを取得中...');

      const response = await client.sites.list();
      const sites = response.data.siteEntry || [];

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
      const client = await this.getAuthenticatedClient();

      console.log(`📈 GSC検索パフォーマンスを取得中... Site: ${siteUrl}, 期間: ${startDate} - ${endDate}`);

      const response = await client.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: {
          startDate: startDate,
          endDate: endDate,
          dimensions: dimensions,
          rowLimit: 25000, // 最大取得件数
          startRow: 0,
        },
      });

      const rows = response.data.rows || [];

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
      const client = await this.getAuthenticatedClient();

      console.log(`📑 GSCインデックス状況を取得中... Site: ${siteUrl}`);

      // インデックス状況のクエリ（カバレッジレポート）
      const response = await client.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: {
          startDate: this.getDateDaysAgo(90), // 過去90日
          endDate: this.getDateDaysAgo(0), // 今日
          dimensions: ['page'],
          rowLimit: 25000,
          startRow: 0,
        },
      });

      const rows = response.data.rows || [];

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
