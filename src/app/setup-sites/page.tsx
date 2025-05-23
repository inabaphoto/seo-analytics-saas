'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GA4Property {
  id: string;
  propertyId: string;
  displayName: string;
  websiteUrl: string;
  timeZone: string;
  currencyCode: string;
}

interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
  verified: boolean;
}

interface GSCSitesData {
  all: GSCSite[];
  domain: GSCSite[];
  url: GSCSite[];
}

/**
 * サイト選択ページ
 * OAuth認証後にGA4プロパティとGSCサイトを選択
 */
export default function SetupSitesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [ga4Properties, setGA4Properties] = useState<GA4Property[]>([]);
  const [gscSites, setGSCSites] = useState<GSCSitesData>({ all: [], domain: [], url: [] });
  const [selectedGA4, setSelectedGA4] = useState<string>('');
  const [selectedGSC, setSelectedGSC] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPropertiesAndSites();
  }, []);

  /**
   * GA4プロパティとGSCサイトを読み込み
   */
  const loadPropertiesAndSites = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // GA4プロパティを取得
      const ga4Response = await fetch('/api/properties/ga4');
      if (!ga4Response.ok) {
        throw new Error(`GA4プロパティ取得エラー: ${ga4Response.status}`);
      }
      const ga4Data = await ga4Response.json();

      // GSCサイトを取得
      const gscResponse = await fetch('/api/properties/gsc');
      if (!gscResponse.ok) {
        throw new Error(`GSCサイト取得エラー: ${gscResponse.status}`);
      }
      const gscData = await gscResponse.json();

      setGA4Properties(ga4Data.properties || []);
      setGSCSites(gscData.sites || { all: [], domain: [], url: [] });
      setUserName(ga4Data.user?.name || gscData.user?.name || '');

      console.log('✅ プロパティとサイトの読み込み完了');
      console.log(`   GA4プロパティ: ${ga4Data.properties?.length || 0}件`);
      console.log(`   GSCサイト: ${gscData.sites?.all?.length || 0}件`);

    } catch (err) {
      console.error('❌ プロパティとサイトの読み込みエラー:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 選択したサイト情報を保存
   */
  const handleSaveSelection = async () => {
    if (!selectedGA4 || !selectedGSC) {
      setError('GA4プロパティとGSCサイトの両方を選択してください');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const selectedGA4Property = ga4Properties.find(p => p.propertyId === selectedGA4);
      const selectedGSCSite = gscSites.all.find(s => s.siteUrl === selectedGSC);

      // サイト選択情報を保存
      const saveResponse = await fetch('/api/sites/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ga4Property: selectedGA4Property,
          gscSite: selectedGSCSite,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(`保存エラー: ${saveResponse.status}`);
      }

      console.log('✅ サイト選択情報を保存しました');
      
      // ダッシュボードにリダイレクト
      router.push('/test?setup_complete=true');

    } catch (err) {
      console.error('❌ サイト選択情報の保存エラー:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">プロパティとサイトを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            サイト設定
          </h1>
          <p className="text-gray-600">
            分析対象のGA4プロパティとSearch Consoleサイトを選択してください
          </p>
          {userName && (
            <p className="text-sm text-gray-500 mt-2">
              ログイン中: {userName}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GA4プロパティ選択 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📊 Google Analytics 4 プロパティ
            </h2>
            
            {ga4Properties.length === 0 ? (
              <p className="text-gray-500">GA4プロパティが見つかりませんでした</p>
            ) : (
              <div className="space-y-3">
                {ga4Properties.map((property) => (
                  <label key={property.propertyId} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="ga4Property"
                      value={property.propertyId}
                      checked={selectedGA4 === property.propertyId}
                      onChange={(e) => setSelectedGA4(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {property.displayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {property.propertyId}
                      </p>
                      {property.websiteUrl && (
                        <p className="text-xs text-gray-500">
                          URL: {property.websiteUrl}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* GSCサイト選択 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🔍 Search Console サイト
            </h2>
            
            {gscSites.all.length === 0 ? (
              <p className="text-gray-500">Search Consoleサイトが見つかりませんでした</p>
            ) : (
              <div className="space-y-3">
                {gscSites.all.map((site) => (
                  <label key={site.siteUrl} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="gscSite"
                      value={site.siteUrl}
                      checked={selectedGSC === site.siteUrl}
                      onChange={(e) => setSelectedGSC(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {site.siteUrl.replace('sc-domain:', '')}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          site.siteUrl.startsWith('sc-domain:') 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {site.siteUrl.startsWith('sc-domain:') ? 'ドメイン' : 'URL'}
                        </span>
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          site.verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {site.permissionLevel}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSaveSelection}
            disabled={!selectedGA4 || !selectedGSC || isSaving}
            className={`px-8 py-3 rounded-md font-medium ${
              selectedGA4 && selectedGSC && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? '保存中...' : '選択を保存してダッシュボードへ'}
          </button>
        </div>

        {/* デバッグ情報 */}
        <div className="mt-8 p-4 bg-gray-100 rounded-md text-xs text-gray-600">
          <p>選択中 - GA4: {selectedGA4 || '未選択'} | GSC: {selectedGSC || '未選択'}</p>
        </div>
      </div>
    </div>
  );
}
