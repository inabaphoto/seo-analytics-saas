import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth/encryption';
import { cookies } from 'next/headers';

/**
 * Google Search Console サイトリスト取得API
 * OAuth認証済みユーザーがアクセス可能なGSCサイトを取得
 */
export async function GET(request: NextRequest) {
  try {
    // 暗号化されたOAuthデータを取得
    const cookieStore = cookies();
    const encryptedOAuthData = cookieStore.get('google_oauth_data')?.value;

    if (!encryptedOAuthData) {
      return NextResponse.json(
        { error: 'OAuth認証が必要です' },
        { status: 401 }
      );
    }

    // OAuth データを復号化
    const oauthDataString = decrypt(encryptedOAuthData);
    const oauthData = JSON.parse(oauthDataString);

    console.log('🔄 GSCサイトリストを取得中...');
    console.log(`   ユーザー: ${oauthData.profile.name} (${oauthData.profile.email})`);

    if (!oauthData.tokens.access_token) {
      return NextResponse.json(
        { error: 'アクセストークンが見つかりません' },
        { status: 401 }
      );
    }

    // リクエスト詳細をログ出力
    const apiUrl = 'https://www.googleapis.com/webmasters/v3/sites';
    console.log('🔄 GSC API リクエスト開始:');
    console.log(`   URL: ${apiUrl}`);
    console.log(`   Method: GET`);
    console.log(`   Authorization: Bearer ${oauthData.tokens.access_token.substring(0, 20)}...`);

    // Google Search Console API を使用してサイトリストを取得
    const sitesResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${oauthData.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 GSC API レスポンス:');
    console.log(`   Status: ${sitesResponse.status} ${sitesResponse.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(sitesResponse.headers.entries()));

    if (!sitesResponse.ok) {
      const errorText = await sitesResponse.text();
      console.error('❌ GSCサイト取得エラー詳細:', {
        status: sitesResponse.status,
        statusText: sitesResponse.statusText,
        url: apiUrl,
        headers: Object.fromEntries(sitesResponse.headers.entries()),
        error: errorText
      });
      return NextResponse.json(
        { 
          error: 'GSCサイトの取得に失敗しました',
          details: errorText,
          status: sitesResponse.status,
          url: apiUrl
        },
        { status: sitesResponse.status }
      );
    }

    const data = await sitesResponse.json();
    console.log('✅ GSC API レスポンス成功');

    // サイトデータの整理
    const sites = (data.siteEntry || []).map((site: any) => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel,
      verified: site.permissionLevel !== 'siteUnverifiedUser'
    }));

    // ドメインプロパティとURLプロパティに分類
    const domainProperties = sites.filter((site: any) => 
      site.siteUrl.startsWith('sc-domain:')
    );
    
    const urlProperties = sites.filter((site: any) => 
      !site.siteUrl.startsWith('sc-domain:')
    );

    console.log(`✅ GSCサイト取得完了: ${sites.length}件 (ドメイン: ${domainProperties.length}, URL: ${urlProperties.length})`);
    
    return NextResponse.json({
      success: true,
      message: `GSCサイトを${sites.length}件取得しました`,
      sites: {
        all: sites,
        domain: domainProperties,
        url: urlProperties
      },
      siteEntry: data.siteEntry // デバッグ用
    });

  } catch (error) {
    console.error('❌ GSCサイトリスト取得処理に失敗:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
