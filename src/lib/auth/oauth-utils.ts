import crypto from 'crypto';

/**
 * OAuth2 PKCE フロー用のユーティリティ関数
 * RFC 7636 準拠の実装
 */

/**
 * ランダムな文字列を生成（code_verifier用）
 * @param length 文字列の長さ（43-128文字の範囲）
 * @returns ランダムな文字列
 */
export function generateCodeVerifier(length: number = 128): string {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters');
  }
  
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return result;
}

/**
 * code_challengeを生成（code_verifierから）
 * @param codeVerifier PKCE用のcode_verifier
 * @returns base64url エンコードされたcode_challenge
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return base64URLEncode(hash);
}

/**
 * stateパラメータ用のランダム文字列を生成
 * @returns CSRF保護用のstate文字列
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * nonceパラメータ用のランダム文字列を生成
 * @returns リプレイ攻撃保護用のnonce文字列
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Buffer を base64url エンコード
 * @param buffer エンコードするBuffer
 * @returns base64url エンコードされた文字列
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Google OAuth2認証URLを生成
 * @param clientId Google OAuth2クライアントID
 * @param redirectUri リダイレクトURI
 * @param codeChallenge PKCE用のcode_challenge
 * @param state CSRF保護用のstate
 * @param scopes 要求するスコープ
 * @returns Google OAuth2認証URL
 */
export function generateGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
  scopes: string[] = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly',
    'openid',
    'email',
    'profile'
  ]
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 認証コードをアクセストークンに交換
 * @param code 認証コード
 * @param codeVerifier PKCE用のcode_verifier
 * @param clientId Google OAuth2クライアントID
 * @param clientSecret Google OAuth2クライアントシークレット
 * @param redirectUri リダイレクトURI
 * @returns トークンレスポンス
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`トークン交換に失敗しました: ${error}`);
  }

  return response.json();
}

/**
 * リフレッシュトークンを使用してアクセストークンを更新
 * @param refreshToken リフレッシュトークン
 * @param clientId Google OAuth2クライアントID
 * @param clientSecret Google OAuth2クライアントシークレット
 * @returns 新しいトークンレスポンス
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`トークン更新に失敗しました: ${error}`);
  }

  return response.json();
}

/**
 * Google OAuth2トークンレスポンスの型定義
 */
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

/**
 * OAuth2セッション状態の型定義
 */
export interface OAuthSession {
  codeVerifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
  scopes: string[];
}
