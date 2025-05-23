import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, GoogleTokenResponse } from '@/lib/auth/oauth-utils';
import { encrypt, decrypt } from '@/lib/auth/encryption';
import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * Google OAuth2コールバックエンドポイント
 * GET /api/auth/google/callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // エラーハンドリング
    if (error) {
      console.error('❌ Google OAuth認証エラー:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      console.error('❌ 認証コードまたはstateパラメータが不足');
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_parameters', request.url)
      );
    }

    // セッション情報の取得と検証
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('oauth-session'); // ハイフンに統一
    
    if (!sessionCookie) {
      console.error('❌ OAuth セッションが見つかりません');
      return NextResponse.redirect(
        new URL('/auth/error?error=session_expired', request.url)
      );
    }

    let sessionData;
    try {
      // 暗号化されたセッションデータを復号化
      const decryptedSessionData = decrypt(sessionCookie.value);
      sessionData = JSON.parse(decryptedSessionData);
    } catch (parseError) {
      console.error('❌ セッションデータの解析に失敗:', parseError);
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_session', request.url)
      );
    }

    // state パラメータの検証（CSRF攻撃の防止）
    if (state !== sessionData.state) {
      console.error('❌ state パラメータが一致しません');
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_state', request.url)
      );
    }

    // 環境変数の確認
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Google OAuth設定が不正です');
      return NextResponse.redirect(
        new URL('/auth/error?error=oauth_config_error', request.url)
      );
    }

    // 認証コードをトークンに交換
    console.log('🔄 認証コードをトークンに交換中...');
    const tokenResponse: GoogleTokenResponse = await exchangeCodeForTokens(
      code,
      sessionData.codeVerifier,
      clientId,
      clientSecret,
      sessionData.redirectUri
    );

    // トークン情報を保存
    console.log('🔄 Googleユーザープロフィールを取得中...');
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('❌ Googleプロフィールの取得に失敗');
      return NextResponse.redirect(
        new URL('/auth/error?error=profile_fetch_failed', request.url)
      );
    }

    const googleProfile = await profileResponse.json();
    console.log('✅ Googleプロフィール取得成功:', { 
      email: googleProfile.email, 
      name: googleProfile.name 
    });

    // Google OAuth認証情報を暗号化Cookieに保存（Supabase非依存）
    const oauthData = {
      profile: googleProfile,
      tokens: {
        access_token: tokenResponse.access_token, // 生のトークン
        refresh_token: tokenResponse.refresh_token, // 生のトークン
        token_type: tokenResponse.token_type,
        expires_at: new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString(),
        expires_in: tokenResponse.expires_in,
        scope: tokenResponse.scope,
      },
      tenantId: sessionData.tenantId,
      timestamp: new Date().toISOString(),
    };

    // 全体を暗号化してCookieに保存
    const encryptedOAuthData = encrypt(JSON.stringify(oauthData));
    
    // セッションクッキーをクリア
    cookieStore.delete('oauth-session');

    console.log('✅ Google OAuth認証が完了しました');
    console.log(`   Google Profile: ${googleProfile.name} (${googleProfile.email})`);
    console.log(`   テナントID: ${sessionData.tenantId}`);
    console.log(`   スコープ: ${tokenResponse.scope}`);

    // OAuth成功情報をCookieに保存してリダイレクト
    const response = NextResponse.redirect(
      new URL(`/setup-sites?oauth_success=true&tenant=${sessionData.tenantId}`, request.url)
    );
    
    // 暗号化されたOAuth情報をCookieに設定（セキュア）
    response.cookies.set('google_oauth_data', encryptedOAuthData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24時間
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('❌ Google OAuth コールバック処理に失敗:', error);
    
    // エラー時はセッションクッキーをクリア
    const cookieStore = cookies();
    cookieStore.delete('oauth-session');
    
    return NextResponse.redirect(
      new URL(`/auth/error?error=callback_failed&details=${encodeURIComponent(
        error instanceof Error ? error.message : String(error)
      )}`, request.url)
    );
  }
}
