'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * OAuth認証エラーページ
 */
export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const details = searchParams.get('details');

  // エラーメッセージのマッピング
  const getErrorMessage = (errorCode: string | null): string => {
    switch (errorCode) {
      case 'missing_parameters':
        return '認証パラメータが不足しています。再度認証を試してください。';
      case 'session_expired':
        return 'セッションの有効期限が切れました。再度認証を試してください。';
      case 'invalid_session':
        return 'セッション情報が無効です。再度認証を試してください。';
      case 'invalid_state':
        return 'セキュリティ検証に失敗しました（CSRF攻撃の可能性）。再度認証を試してください。';
      case 'oauth_config_error':
        return 'OAuth設定に問題があります。管理者にお問い合わせください。';
      case 'user_not_authenticated':
        return 'ユーザー認証が必要です。先にログインしてください。';
      case 'token_save_failed':
        return 'トークンの保存に失敗しました。再度認証を試してください。';
      case 'callback_failed':
        return 'OAuth認証処理に失敗しました。';
      case 'access_denied':
        return 'Google認証がキャンセルされました。';
      default:
        return 'OAuth認証中に予期しないエラーが発生しました。';
    }
  };

  const getErrorTitle = (errorCode: string | null): string => {
    switch (errorCode) {
      case 'access_denied':
        return '認証がキャンセルされました';
      case 'oauth_config_error':
        return '設定エラー';
      default:
        return '認証エラー';
    }
  };

  const getErrorIcon = (errorCode: string | null): string => {
    switch (errorCode) {
      case 'access_denied':
        return '🚫';
      case 'oauth_config_error':
        return '⚙️';
      default:
        return '❌';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* エラーアイコン */}
            <div className="text-6xl mb-4">
              {getErrorIcon(error)}
            </div>

            {/* エラータイトル */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {getErrorTitle(error)}
            </h1>

            {/* エラーメッセージ */}
            <p className="text-gray-600 mb-6">
              {getErrorMessage(error)}
            </p>

            {/* エラーコード表示 */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>エラーコード:</strong> {error}
                </p>
                {details && (
                  <p className="text-xs text-red-600 mt-1">
                    <strong>詳細:</strong> {details}
                  </p>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div className="space-y-3">
              <Link
                href="/test"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🔄 認証を再試行
              </Link>

              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🏠 ホームに戻る
              </Link>
            </div>

            {/* デバッグ情報（開発環境のみ） */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h3 className="text-sm font-medium text-gray-800 mb-2">
                  🔧 デバッグ情報 (開発環境のみ)
                </h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>URL:</strong> {window.location.href}</p>
                  <p><strong>タイムスタンプ:</strong> {new Date().toISOString()}</p>
                  <p><strong>User Agent:</strong> {navigator.userAgent.slice(0, 60)}...</p>
                </div>
              </div>
            )}

            {/* ヘルプ情報 */}
            <div className="mt-6 text-xs text-gray-500">
              <p>問題が継続する場合は、システム管理者にお問い合わせください。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
