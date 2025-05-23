import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 認証情報をクリアしています...');
    
    // レスポンスを作成し、認証関連のCookieをすべてクリア
    const response = NextResponse.json({ 
      success: true, 
      message: '認証情報をクリアしました' 
    });
    
    // OAuthセッションのCookieをクリア
    response.cookies.set('oauth-session', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    console.log('✅ 認証情報のクリアが完了しました');
    
    return response;
    
  } catch (error) {
    console.error('❌ 認証情報クリアエラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: '認証情報のクリアに失敗しました' 
    }, { status: 500 });
  }
}
