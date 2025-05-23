import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  // 開発環境では認証をスキップ
  const isDev = process.env.NODE_ENV === 'development';
  const skipAuth = isDev && process.env.SKIP_AUTH === 'true';
  
  if (!skipAuth) {
    const supabase = createServerComponentClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      redirect('/login');
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true' 
            ? '🔧 開発モード - ダッシュボード' 
            : 'ダッシュボードへようこそ'
          }
        </h2>
        <p className="text-gray-600 mb-6">
          SEO Analytics SaaS の機能開発を進めています。
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">サイト設定</h3>
            <p className="text-blue-600 text-sm mb-3">
              Google Analytics と Search Console の連携設定
            </p>
            <a 
              href="/setup-sites" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              設定を開始
            </a>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">API テスト</h3>
            <p className="text-green-600 text-sm mb-3">
              GA4とGSCのAPIデータ構造を確認
            </p>
            <div className="space-y-2">
              <a 
                href="/api/debug/ga4-structure" 
                className="block bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors text-center"
              >
                GA4 API テスト
              </a>
              <a 
                href="/api/debug/gsc-structure" 
                className="block bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors text-center"
              >
                GSC API テスト
              </a>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">開発ツール</h3>
            <p className="text-purple-600 text-sm mb-3">
              開発・デバッグ用のユーティリティ
            </p>
            <a 
              href="/test" 
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
            >
              テストページ
            </a>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-yellow-800 font-semibold mb-2">🔧 開発者向け情報</h4>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• 現在は開発モードで実行中です</li>
              <li>• 認証スキップ: {process.env.SKIP_AUTH === 'true' ? '有効' : '無効'}</li>
              <li>• 認証を有効にするには、環境変数 SKIP_AUTH を false に設定してください</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
