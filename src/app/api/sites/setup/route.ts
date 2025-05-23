import { NextRequest, NextResponse } from 'next/server';
import { decrypt, encrypt } from '@/lib/auth/encryption';
import { cookies } from 'next/headers';

/**
 * サイト選択情報保存API
 * ユーザーが選択したGA4プロパティとGSCサイトの情報を保存
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディを取得
    const { ga4Property, gscSite } = await request.json();

    if (!ga4Property || !gscSite) {
      return NextResponse.json(
        { error: 'GA4プロパティとGSCサイトの両方が必要です' },
        { status: 400 }
      );
    }

    console.log('🔄 サイト選択情報を保存中...');
    console.log(`   ユーザー: ${oauthData.profile.name} (${oauthData.profile.email})`);
    console.log(`   GA4プロパティ: ${ga4Property.displayName} (ID: ${ga4Property.propertyId})`);
    console.log(`   GSCサイト: ${gscSite.siteUrl}`);

    // 選択されたサイト情報を含む新しいOAuthデータを作成
    const updatedOAuthData = {
      ...oauthData,
      selectedSites: {
        ga4Property: {
          id: ga4Property.id,
          propertyId: ga4Property.propertyId,
          displayName: ga4Property.displayName,
          websiteUrl: ga4Property.websiteUrl,
          timeZone: ga4Property.timeZone,
          currencyCode: ga4Property.currencyCode,
        },
        gscSite: {
          siteUrl: gscSite.siteUrl,
          permissionLevel: gscSite.permissionLevel,
          verified: gscSite.verified,
        },
        selectedAt: new Date().toISOString(),
      },
    };

    // 更新されたデータを暗号化してCookieに保存
    const encryptedUpdatedData = encrypt(JSON.stringify(updatedOAuthData));
    
    console.log('✅ サイト選択情報の保存完了');
    console.log('   選択したサイト情報をOAuthデータに統合しました');

    // レスポンスでCookieを更新
    const response = NextResponse.json({
      success: true,
      message: 'サイト選択情報を保存しました',
      selectedSites: updatedOAuthData.selectedSites,
    });

    // 更新されたOAuth情報をCookieに設定
    response.cookies.set('google_oauth_data', encryptedUpdatedData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24時間
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('❌ サイト選択情報の保存に失敗:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
