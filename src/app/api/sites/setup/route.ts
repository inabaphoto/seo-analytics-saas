import { decrypt, encrypt } from '@/lib/auth/encryption';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * サイト選択情報保存API（本番仕様）
 * ユーザーが選択したGA4プロパティとGSCサイトの情報をデータベースに保存
 */
export async function POST(request: NextRequest) {
  console.log('🔵 /api/sites/setup APIが呼び出されました');
  
  try {
    // リクエストスコープ内でSupabaseクライアントを作成
    const supabase = createClient();
    
    // 管理者クライアントは環境変数が設定されている場合のみ作成
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (error) {
      console.log('⚠️ 管理者クライアント作成をスキップ:', error);
    }

    // 暗号化されたOAuthデータを取得
    const cookieStore = cookies();
    const encryptedOAuthData = cookieStore.get('google_oauth_data')?.value;

    console.log('🔍 Cookieチェック:', {
      hasCookie: !!encryptedOAuthData,
      cookieLength: encryptedOAuthData?.length || 0
    });

    if (!encryptedOAuthData) {
      return NextResponse.json(
        { error: 'OAuth認証が必要です' },
        { status: 401 }
      );
    }

    // OAuth データを復号化
    let oauthData;
    try {
      const oauthDataString = decrypt(encryptedOAuthData);
      oauthData = JSON.parse(oauthDataString);
      
      // 実際のOAuthデータ構造を確認（診断用）
      console.log('📊 OAuthデータ構造:', JSON.stringify(oauthData, null, 2));
      
    } catch (error) {
      console.error('❌ OAuthデータの復号化に失敗:', error);
      return NextResponse.json(
        { 
          error: 'OAuthデータの復号化に失敗しました',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 400 }
      );
    }

    // OAuth データの必須項目のみ検証（柔軟性を向上）
    if (!oauthData?.profile?.email || !oauthData?.tokens?.access_token) {
      console.error('❌ 必須のOAuth情報が不足しています');
      console.log('   利用可能なプロパティ:', {
        profile: Object.keys(oauthData?.profile || {}),
        tokens: Object.keys(oauthData?.tokens || {})
      });
      return NextResponse.json(
        { 
          error: '必須の認証情報が不足しています',
        },
        { status: 400 }
      );
    }

    // リクエストボディを取得
    const { ga4Property, gscSite } = await request.json();

    if (!ga4Property || !gscSite) {
      return NextResponse.json(
        { error: 'GA4プロパティとGSCサイトの両方が必要です' },
        { status: 400 }
      );
    }

    console.log('🔄 サイト選択情報をデータベースに保存中...');
    console.log(`   ユーザー: ${oauthData.profile.name} (${oauthData.profile.email})`);
    console.log(`   GA4プロパティ: ${ga4Property.displayName} (ID: ${ga4Property.propertyId})`);
    console.log(`   GSCサイト: ${gscSite.siteUrl}`);

    // 1. ユーザー情報を取得または作成
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('email', oauthData.profile.email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw new Error(`ユーザー情報の取得に失敗: ${userError.message}`);
    }

    let userId: string;
    let tenantId: string;

    if (!user) {
      console.log('🔄 新規ユーザーのSupabase Auth作成を開始...');
      
      if (!adminClient) {
        console.error('❌ 管理者クライアントが利用できません');
        return NextResponse.json(
          { 
            error: '新規ユーザー作成機能は準備中です',
            details: 'SUPABASE_SERVICE_ROLE_KEY環境変数を設定してください'
          },
          { status: 400 }
        );
      }
      
      // まず既存のAuthユーザーを検索
      console.log('🔍 既存のAuthユーザーを検索中...');
      const { data: { users: allUsers }, error: searchError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (searchError) {
        console.error('❌ ユーザー検索に失敗:', searchError);
        throw new Error(`ユーザー検索に失敗: ${searchError.message}`);
      }

      // メールアドレスでフィルタリング
      const existingUser = allUsers.find(user => user.email === oauthData.profile.email);
      let authUserId: string;

      if (existingUser) {
        // 既存のAuthユーザーが見つかった場合
        console.log('✅ 既存のAuthユーザーが見つかりました');
        authUserId = existingUser.id;
        
        // ユーザーメタデータを更新
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          authUserId,
          {
            user_metadata: {
              name: oauthData.profile.name || oauthData.profile.email.split('@')[0],
              google_id: oauthData.profile.sub || null,
              avatar_url: oauthData.profile.picture || null
            }
          }
        );
        
        if (updateError) {
          console.error('⚠️ ユーザーメタデータの更新に失敗:', updateError);
        }
      } else {
        // 新規Authユーザーを作成
        console.log('🆕 新規Authユーザーを作成中...');
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: oauthData.profile.email,
          email_confirm: true,
          user_metadata: {
            name: oauthData.profile.name || oauthData.profile.email.split('@')[0],
            google_id: oauthData.profile.sub || null,
            avatar_url: oauthData.profile.picture || null
          }
        });

        if (authError) {
          console.error('❌ Supabase Authユーザー作成に失敗:', authError);
          throw new Error(`Supabase Authユーザー作成に失敗: ${authError.message}`);
        }

        if (!authUser.user) {
          throw new Error('認証ユーザーの作成に失敗しました');
        }

        authUserId = authUser.user.id;
      }

      userId = authUserId;
      tenantId = authUserId; // テナントIDとユーザーIDを同じにする

      // 新規テナントを先に作成（外部キー制約のため）
      console.log('🏢 新規テナントを作成中...');
      const { data: newTenant, error: tenantError } = await adminClient
        .from('tenants')
        .insert({
          id: tenantId,
          name: `${oauthData.profile.name || oauthData.profile.email.split('@')[0]}のチーム`,
          plan: 'free'
        })
        .select()
        .single();

      if (tenantError) {
        console.error('❌ テナント情報の保存に失敗:', tenantError);
        throw new Error(`テナント情報の保存に失敗: ${tenantError.message}`);
      }

      console.log('✅ 新規テナントを作成しました:', newTenant);

      // 新規ユーザーをデータベースに保存（RLSをバイパス）
      console.log('💾 usersテーブルにユーザー情報を保存中...');
      const { data: newUser, error: newUserError } = await adminClient
        .from('users')
        .insert({
          id: userId,
          email: oauthData.profile.email,
          name: oauthData.profile.name || oauthData.profile.email.split('@')[0],
          tenant_id: tenantId,
          role: 'admin', // 初回登録は管理者とする
          settings: {
            google_id: oauthData.profile.sub || null
          }
        })
        .select()
        .single();

      if (newUserError) {
        console.error('❌ ユーザー情報の保存に失敗:', newUserError);
        throw new Error(`ユーザー情報の保存に失敗: ${newUserError.message}`);
      }

      console.log('✅ 新規ユーザーをデータベースに保存しました:', newUser);
    } else {
      userId = user.id;
      tenantId = user.tenant_id;
    }

    // 2. サイト情報を保存または更新
    const siteData = {
      tenant_id: tenantId,
      domain: new URL(gscSite.siteUrl).hostname,
      name: ga4Property.displayName,
      ga4_property_id: ga4Property.propertyId,
      gsc_property_url: gscSite.siteUrl,
      settings: {
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
      }
    };

    // UPSERT（存在すれば更新、なければ挿入）
    console.log('🌐 サイト情報を保存中...');
    const { data: site, error: siteError } = await (adminClient || supabase)
      .from('sites')
      .upsert(siteData, { 
        onConflict: 'tenant_id,domain',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (siteError) {
      console.error('❌ サイト情報の保存に失敗:', siteError);
      throw new Error(`サイト情報の保存に失敗: ${siteError.message}`);
    }

    console.log('✅ サイト情報を保存しました:', site);

    // OAuth トークン情報の保存（RLSをバイパス）
    console.log('🔐 OAuthトークン情報を保存中...');
    const tokenData = {
      user_id: userId,
      provider: 'google',
      access_token: encrypt(oauthData.tokens.access_token),
      refresh_token: encrypt(oauthData.tokens.refresh_token),
      expires_at: new Date(oauthData.tokens.expires_at).toISOString(),
      scopes: oauthData.tokens.scope ? oauthData.tokens.scope.split(' ') : []
    };

    const { error: tokenError } = await (adminClient || supabase)
      .from('oauth_tokens')
      .upsert(tokenData, { 
        onConflict: 'user_id,provider',
        ignoreDuplicates: false 
      });

    if (tokenError) {
      throw new Error(`OAuth トークンの保存に失敗: ${tokenError.message}`);
    }

    console.log('✅ サイト選択情報のデータベース保存完了');
    console.log(`   サイトID: ${site.id}`);
    console.log(`   テナントID: ${tenantId}`);

    // 4. Cookie には最小限の情報のみ保存（後方互換性のため）
    const minimalOAuthData = {
      ...oauthData,
      site_id: site.id,
      tenant_id: tenantId,
      user_id: userId
    };

    const encryptedUpdatedData = encrypt(JSON.stringify(minimalOAuthData));

    // レスポンスでCookieを更新
    const response = NextResponse.json({
      success: true,
      message: 'サイト選択情報をデータベースに保存しました',
      site: {
        id: site.id,
        domain: site.domain,
        name: site.name,
        ga4_property_id: site.ga4_property_id,
        gsc_property_url: site.gsc_property_url
      },
      tenant_id: tenantId,
      user_id: userId
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
    console.error('エラーの詳細:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'スタックトレースなし',
      type: typeof error,
      error: error
    });
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
