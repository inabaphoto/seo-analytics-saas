import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth/encryption';
import { cookies } from 'next/headers';

/**
 * GA4プロパティリスト取得API
 * OAuth認証済みユーザーがアクセス可能なGA4プロパティを取得
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

    console.log('🔄 GA4プロパティリストを取得中...');
    console.log(`   ユーザー: ${oauthData.profile.name} (${oauthData.profile.email})`);
    
    // トークン情報をデバッグ
    console.log('🔍 OAuth トークン情報:');
    console.log(`   アクセストークン: ${oauthData.tokens.access_token ? '✅ 存在' : '❌ なし'}`);
    console.log(`   リフレッシュトークン: ${oauthData.tokens.refresh_token ? '✅ 存在' : '❌ なし'}`);
    console.log(`   トークンタイプ: ${oauthData.tokens.token_type || 'なし'}`);
    console.log(`   スコープ: ${oauthData.tokens.scope || 'なし'}`);

    if (!oauthData.tokens.access_token) {
      return NextResponse.json(
        { error: 'アクセストークンが見つかりません' },
        { status: 401 }
      );
    }

    // リクエスト詳細をログ出力
    const apiUrl = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries';
    console.log('🔄 GA4 API リクエスト開始:');
    console.log(`   URL: ${apiUrl}`);
    console.log(`   Method: GET`);
    console.log(`   Authorization: Bearer ${oauthData.tokens.access_token.substring(0, 20)}...`);

    // Google Analytics Admin API v1beta を使用してGA4プロパティ一覧を取得
    const propertiesResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${oauthData.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 GA4 API レスポンス:');
    console.log(`   Status: ${propertiesResponse.status} ${propertiesResponse.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(propertiesResponse.headers.entries()));

    if (!propertiesResponse.ok) {
      const errorText = await propertiesResponse.text();
      console.error('❌ GA4プロパティ取得エラー詳細:', {
        status: propertiesResponse.status,
        statusText: propertiesResponse.statusText,
        url: apiUrl,
        headers: Object.fromEntries(propertiesResponse.headers.entries()),
        error: errorText
      });
      return NextResponse.json(
        { 
          error: 'GA4プロパティの取得に失敗しました',
          details: errorText,
          status: propertiesResponse.status,
          url: apiUrl
        },
        { status: propertiesResponse.status }
      );
    }

    const data = await propertiesResponse.json();
    console.log('✅ GA4 API レスポンス成功');

    // アカウント・プロパティデータの整理
    const properties = [];
    
    if (data.accountSummaries) {
      for (const account of data.accountSummaries) {
        if (account.propertySummaries) {
          for (const property of account.propertySummaries) {
            properties.push({
              accountId: account.account,
              accountDisplayName: account.displayName,
              propertyId: property.property,
              displayName: property.displayName,
              propertyType: property.propertyType || 'UA',
              parent: property.parent,
            });
          }
        }
      }
    }

    console.log(`✅ GA4プロパティ取得完了: ${properties.length}件`);
    
    return NextResponse.json({
      success: true,
      message: `GA4プロパティを${properties.length}件取得しました`,
      properties,
      accountSummaries: data.accountSummaries // デバッグ用
    });

  } catch (error) {
    console.error('❌ GA4プロパティリスト取得処理に失敗:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
