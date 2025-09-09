import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 初期化状態を追跡
let initializationAttempted = false

export async function middleware(request: NextRequest) {
  // 静的アセットやAPI以外のルートをスキップ
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/api/health') ||
    request.nextUrl.pathname.startsWith('/api/admin/init')
  ) {
    return NextResponse.next()
  }
  
  // 初期化が未実行で、メインページへのアクセスの場合
  if (!initializationAttempted && 
      (request.nextUrl.pathname === '/' || 
       request.nextUrl.pathname === '/login' || 
       request.nextUrl.pathname === '/dashboard')) {
    
    console.log('🔄 Attempting auto-initialization via middleware...')
    initializationAttempted = true
    
    try {
      // ヘルスチェック・自動初期化APIを呼び出し
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : `http://localhost:3000`
      
      const healthResponse = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'BONICA-Auto-Init/1.0'
        }
      })
      
      const healthData = await healthResponse.json()
      console.log('🏥 Health check result:', healthData)
      
      if (healthData.autoInit) {
        console.log('✅ Auto-initialization completed via middleware')
      }
      
    } catch (error) {
      console.error('❌ Auto-initialization failed via middleware:', error)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}