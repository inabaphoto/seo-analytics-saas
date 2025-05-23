'use client';

import { useState, useEffect } from 'react';

/**
 * OAuth2フローテスト用ページ
 */

interface ApiResult {
  timestamp: string;
  endpoint: string;
  status: 'success' | 'error';
  data: any;
}

export default function TestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [results, setResults] = useState<ApiResult[]>([]);

  // マウント状態を管理してハイドレーションエラーを防ぐ
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // URLパラメータからOAuth成功状態をチェック
  useEffect(() => {
    if (!isMounted) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('oauth_success');
    const tenant = urlParams.get('tenant');
    
    if (success === 'true') {
      setOauthSuccess(`🎉 Google OAuth認証が成功しました！テナント: ${tenant}`);
      console.log('✅ OAuth認証成功:', { tenant });
    }
  }, [isMounted]);

  /**
   * Google OAuth認証を開始
   */
  const startGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setTestResult(null);

      console.log('🔄 Google OAuth認証を開始中...');

      // テナントIDを仮設定（実際のアプリではログイン済みユーザーから取得）
      const tenantId = 'test-tenant-' + Date.now();
      
      const response = await fetch(`/api/auth/google?tenantId=${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.authUrl) {
        console.log('✅ 認証URL生成成功:', data.authUrl);
        setTestResult(`認証URL生成成功: ${data.message}`);
        
        // 認証URLにリダイレクト
        window.location.href = data.authUrl;
      } else {
        throw new Error('認証URLが取得できませんでした');
      }
    } catch (err) {
      console.error('❌ Google OAuth認証エラー:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * APIエンドポイントの死活監視テスト
   */
  const testApiEndpoints = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setTestResult('');

      const tests = [
        {
          name: 'Google OAuth エンドポイント',
          url: '/api/auth/google?tenantId=test',
          expectedStatus: 200,
        },
      ];

      let allResults = '';

      for (const test of tests) {
        try {
          console.log(`🧪 テスト実行中: ${test.name}`);
          
          const response = await fetch(test.url, {
            method: 'GET',
          });

          const status = response.status;
          const isSuccess = status === test.expectedStatus;
          
          allResults += `${test.name}: ${isSuccess ? '✅ 成功' : '❌ 失敗'} (Status: ${status})\n`;
          
          if (isSuccess) {
            const data = await response.json();
            console.log(`✅ ${test.name} 成功:`, data);
          } else {
            console.log(`❌ ${test.name} 失敗: Status ${status}`);
          }
        } catch (err) {
          allResults += `${test.name}: ❌ エラー (${String(err)})\n`;
          console.error(`❌ ${test.name} エラー:`, err);
        }
      }

      setTestResult(allResults);
    } catch (err) {
      console.error('❌ APIテストエラー:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const testGA4Properties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setTestResult('');

      console.log('🔄 GA4プロパティ取得テストを開始中...');

      const response = await fetch('/api/properties/ga4', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ GA4プロパティ取得成功:', data);
      setTestResult(`GA4プロパティ取得成功: ${data.properties?.length || 0}件のプロパティ`);
    } catch (err) {
      console.error('❌ GA4プロパティ取得エラー:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const testGSCSites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setTestResult('');

      console.log('🔄 GSCサイト取得テストを開始中...');

      const response = await fetch('/api/properties/gsc', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ GSCサイト取得成功:', data);
      setTestResult(`GSCサイト取得成功: ${data.sites?.all?.length || 0}件のサイト`);
    } catch (err) {
      console.error('❌ GSCサイト取得エラー:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 認証情報をクリアする関数
  const clearAuthData = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      console.log('🧹 認証情報をクリア中...');
      
      const response = await fetch('/api/auth/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ 認証情報クリア成功:', data);
      setTestResult('認証情報をクリアしました。新しい認証を開始してください。');
    } catch (err) {
      console.error('❌ 認証情報クリアエラー:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/clear', {
        method: 'POST'
      });
      
      if (response.ok) {
        setResults(prev => [...prev, { 
          timestamp: new Date().toLocaleString(),
          endpoint: '認証クリア',
          status: 'success',
          data: '認証情報をクリアしました。ページをリロードしてください。'
        }]);
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('認証クリアに失敗しました');
      }
    } catch (error) {
      setResults(prev => [...prev, { 
        timestamp: new Date().toLocaleString(),
        endpoint: '認証クリア',
        status: 'error',
        data: String(error)
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // API構造確認機能
  const debugApiStructure = async () => {
    try {
      setIsLoading(true);
      setResults([]);
      
      // GA4構造確認
      const ga4Response = await fetch('/api/debug/ga4-structure');
      const ga4Data = await ga4Response.json();
      
      setResults(prev => [...prev, {
        timestamp: new Date().toLocaleString(),
        endpoint: 'GA4構造確認',
        status: ga4Response.ok ? 'success' : 'error',
        data: ga4Data
      }]);

      // GSC構造確認
      const gscResponse = await fetch('/api/debug/gsc-structure');
      const gscData = await gscResponse.json();
      
      setResults(prev => [...prev, {
        timestamp: new Date().toLocaleString(),
        endpoint: 'GSC構造確認',
        status: gscResponse.ok ? 'success' : 'error',
        data: gscData
      }]);

    } catch (error) {
      setResults(prev => [...prev, { 
        timestamp: new Date().toLocaleString(),
        endpoint: 'API構造確認',
        status: 'error',
        data: String(error)
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // マウント前はローディング表示
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded mb-8"></div>
              <div className="h-12 bg-gray-300 rounded mb-4"></div>
              <div className="h-12 bg-gray-300 rounded mb-4"></div>
              <div className="h-12 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            OAuth2 フローテスト
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={testApiEndpoints}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 テスト中...' : '🧪 APIエンドポイントテスト'}
            </button>

            <button
              onClick={startGoogleAuth}
              disabled={isLoading}
              className={`w-full px-6 py-3 rounded-md font-medium transition-colors ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500'
              }`}
            >
              {isLoading ? '処理中...' : '🔑 Google OAuth認証を開始'}
            </button>

            <a
              href="/setup-sites"
              className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              🏗️ サイト選択ページ（OAuth認証後）
            </a>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={testGA4Properties}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                📊 GA4プロパティ取得テスト
              </button>
              
              <button
                onClick={testGSCSites}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              >
                🔍 GSCサイト取得テスト
              </button>
            </div>

            <button
              onClick={clearAuthData}
              className="w-full px-6 py-3 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            >
              🧹 認証情報をクリア
            </button>

            <button
              onClick={debugApiStructure}
              className="w-full px-6 py-3 bg-yellow-600 text-white rounded-md font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
            >
              🔍 API構造確認
            </button>

          </div>

          {/* 結果表示エリア */}
          {testResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-800 mb-2">テスト結果:</h3>
              <pre className="text-xs text-green-700 whitespace-pre-wrap text-left">
                {testResult}
              </pre>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800 mb-2">エラー:</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {oauthSuccess && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-medium text-green-800 mb-2">OAuth認証結果:</h3>
              <p className="text-sm text-green-700">{oauthSuccess}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="text-sm font-medium text-gray-800 mb-2">API構造確認結果:</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                {results.map((result, index) => (
                  <li key={index}>
                    <span className={`text-${result.status === 'success' ? 'green' : 'red'}-700`}>
                      {result.timestamp} - {result.endpoint} ({result.status})
                    </span>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap text-left">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 環境情報表示 */}
          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-sm font-medium text-gray-800 mb-2">環境情報:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>開発サーバー: {window.location.origin}</p>
              <p>タイムスタンプ: {new Date().toLocaleString('ja-JP')}</p>
              <p>User Agent: {navigator.userAgent.slice(0, 60) + '...'}</p>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事項:</h3>
            <div className="text-xs text-yellow-700 space-y-1 text-left">
              <p>• Google OAuth認証には有効な環境変数設定が必要です</p>
              <p>• Google Cloud Consoleでの設定が必要です</p>
              <p>• Supabaseプロジェクトが稼働している必要があります</p>
              <p>• このページはテスト用です</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
