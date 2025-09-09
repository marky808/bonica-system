/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLintとTypeScriptエラーを本番ビルド時に無効化（開発中）
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 画像最適化設定
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'docs.google.com',
      },
      {
        protocol: 'https',
        hostname: 'sheets.googleapis.com',
      },
    ],
  },
  
  // パフォーマンス最適化
  compress: true,
  
  // 実験的機能
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  
  // 環境変数
  env: {
    CUSTOM_KEY: 'BONICA_SYSTEM',
  },
  
  // リダイレクト設定
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'token',
          },
        ],
      },
    ]
  },
  
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig
