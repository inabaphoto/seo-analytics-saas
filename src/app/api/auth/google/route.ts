import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/auth/encryption';
import crypto from 'crypto';

/**
 * Google OAuth2認証を開始するエンドポイント
 * GET /api/auth/google?tenantId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'テナントIDが必要です' },
        { status: 400 }
      );
    }

    // 環境変数の確認
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID環境変数が設定されていません');
      return NextResponse.json(
        { error: 'OAuth設定が不正です' },
        { status: 500 }
      );
    }

    // 動的にリダイレクトURIを生成
    const baseUrl = getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    console.log('🔄 動的リダイレクトURI:', redirectUri);

    // PKCE用のパラメータ生成
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');

    // OAuth スコープの設定（GA4 & GSC API対応）
    const scopes = [
      'openid',
      'profile', 
      'email',
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly'
    ];

    // OAuth 2.0認証URL構築
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent'); // 常に同意画面を表示して、新しいトークンを強制的に取得

    // セッション情報をクッキーに保存
    const sessionData = {
      tenantId,
      redirectUri,
      codeVerifier,
      state,
      timestamp: Date.now(),
    };

    const response = NextResponse.json({
      authUrl: authUrl.href,
      message: 'Google認証URLを生成しました。リダイレクトしてください。',
      redirectUri, // デバッグ用
    });

    // セッションクッキーを設定
    const encryptedSessionData = encrypt(JSON.stringify(sessionData));
    response.cookies.set('oauth-session', encryptedSessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30, // 30分に延長
      path: '/',
    });

    console.log('✅ Google OAuth認証URL生成完了');
    console.log(`   テナントID: ${tenantId}`);
    console.log(`   リダイレクトURI: ${redirectUri}`);
    console.log(`   スコープ: ${scopes.join(', ')}`);

    return response;
  } catch (error) {
    console.error('❌ Google OAuth認証URL生成に失敗:', error);
    return NextResponse.json(
      { 
        error: 'Google OAuth認証URLの生成に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * リクエストから動的にベースURLを取得
 */
function getBaseUrl(request: NextRequest): string {
  // 環境変数でベースURLが指定されている場合はそれを使用
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // リクエストヘッダーからホストを取得
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 
                   (request.nextUrl.protocol) || 
                   'http';

  if (host) {
    return `${protocol}://${host}`;
  }

  // フォールバック: localhost:3001
  return 'http://localhost:3001';
}
