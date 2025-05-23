import * as crypto from 'crypto';
import { NextResponse } from 'next/server';

/**
 * OAuth トークンの暗号化・復号化ユーティリティ
 * セキュリティ要件に基づく実装
 */

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * 暗号化キーを環境変数から取得
 * @returns 暗号化キー
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  if (key.length !== 64) { // 32 bytes = 64 hex characters
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * テキストを暗号化（AES-CBC方式）
 * @param text 暗号化するテキスト
 * @returns 暗号化されたデータ（base64形式）
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // IV + encrypted data を結合してbase64エンコード
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`暗号化に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 暗号化されたテキストを復号化（AES-CBC方式）
 * @param encryptedData 暗号化されたデータ（base64形式）
 * @returns 復号化されたテキスト
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // IV、暗号化データを分離
    const iv = combined.subarray(0, IV_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`復号化に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * OAuth トークンを暗号化
 * @param tokens OAuth トークン
 * @returns 暗号化されたトークン
 */
export function encryptTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
} {
  return {
    encryptedAccessToken: encrypt(tokens.accessToken),
    encryptedRefreshToken: encrypt(tokens.refreshToken),
  };
}

/**
 * 暗号化されたOAuth トークンを復号化
 * @param encryptedTokens 暗号化されたトークン
 * @returns 復号化されたトークン
 */
export function decryptTokens(encryptedTokens: {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
}): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: decrypt(encryptedTokens.encryptedAccessToken),
    refreshToken: decrypt(encryptedTokens.encryptedRefreshToken),
  };
}

/**
 * 新しい暗号化キーを生成（初期セットアップ用）
 * @returns 新しい暗号化キー（hex形式）
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * OAuthセッション情報をクッキーに設定
 */
export function setOAuthSession(response: NextResponse, sessionData: any): void {
  const sessionJson = JSON.stringify(sessionData);
  
  response.cookies.set('oauth_session', sessionJson, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5分間有効
    path: '/',
  });
}
