import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth/encryption';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase/server';

/**
 * GA4データ構造確認API（本番仕様）
 * データベースからサイト設定を取得してGA4 APIの構造を確認
 */
export async function GET() {
  try {
    // 暗号化されたOAuthデータを取得
    const cookieStore = cookies();
    const encryptedToken = cookieStore.get('google_oauth_data')?.value;
    
    if (!encryptedToken) {
      return NextResponse.json({ error: 'OAuth認証が必要です' }, { status: 401 });
    }

    // OAuth データを復号化
    const tokenData = JSON.parse(decrypt(encryptedToken));
    
    // Cookieからサイト情報を取得
    const siteId = tokenData.site_id;
    const userId = tokenData.user_id;
    
    if (!siteId || !userId) {
      return NextResponse.json({ 
        error: 'サイト設定が見つかりません。サイトの設定を完了してください。' 
      }, { status: 400 });
    }

    // データベースからサイト情報を取得
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('ga4_property_id, settings')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ 
        error: 'サイト情報の取得に失敗しました' 
      }, { status: 400 });
    }

    const propertyId = site.ga4_property_id;
    
    if (!propertyId) {
      return NextResponse.json({ 
        error: 'GA4プロパティが設定されていません' 
      }, { status: 400 });
    }

    // データベースからOAuthトークンを取得
    const { data: oauthToken, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (tokenError || !oauthToken) {
      return NextResponse.json({ 
        error: 'OAuth認証情報が見つかりません' 
      }, { status: 401 });
    }

    // アクセストークンを復号化
    const accessToken = decrypt(oauthToken.access_token);

    console.log(' GA4データ構造確認中...');
    console.log(`   プロパティID: ${propertyId}`);

    const apiUrl = 'https://analyticsdata.googleapis.com/v1beta/' + propertyId + ':runReport';
    
    // サンプルリクエスト：過去7日間のページビュー数
    const requestBody = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 5
    };

    console.log(' GA4 API リクエスト開始:');
    console.log(`   URL: ${apiUrl}`);
    console.log(`   Method: POST`);
    console.log(`   Body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(' GA4 API レスポンス:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(' GA4 API エラー:', errorText);
      return NextResponse.json({ 
        error: 'GA4 APIエラー', 
        details: errorText,
        status: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    
    console.log(' GA4 API レスポンス成功');
    console.log('   データ構造:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      message: 'GA4データ構造の確認に成功しました',
      propertyId,
      siteId,
      structure: {
        // APIレスポンスの構造をそのまま保持（メモリルールに従う）
        dimensionHeaders: data.dimensionHeaders,
        metricHeaders: data.metricHeaders,
        rows: data.rows?.slice(0, 3), // サンプルとして最初の3行のみ
        rowCount: data.rowCount,
        metadata: data.metadata,
        kind: data.kind
      },
      rawResponse: data, // 完全な生データも保存
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' GA4構造確認エラー:', error);
    return NextResponse.json({ 
      error: 'GA4構造確認に失敗しました', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
