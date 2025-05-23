const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey() {
  // .env.localから取得した実際のキー
  const key = 'dc6facb1dec11820c1f8b8dde4a184f2435f951faa7422ce58b3e76563bc7828';
  return Buffer.from(key, 'hex');
}

function decrypt(encryptedData) {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    const iv = combined.subarray(0, IV_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`復号化に失敗: ${error.message}`);
  }
}

// デバッグ用: OAuthクッキーが正しく設定されているかテスト
console.log('OAuth Cookie デバッグツール');
console.log('ブラウザのDevToolsから google_oauth_data クッキーの値をコピーしてここに貼り付けてください');
