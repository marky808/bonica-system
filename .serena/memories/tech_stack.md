# BONICA管理システム - 技術スタック

## フロントエンド
- **Framework**: Next.js 14.2.16 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4.1.9 with PostCSS
- **UI Components**: shadcn/ui (Radix UI ベース)
- **Charts**: Recharts
- **Form**: React Hook Form + Zod 3.25.67
- **State Management**: React Hooks + AuthContext
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Mono

## バックエンド
- **Runtime**: Next.js API Routes (サーバーサイド)
- **Database**: SQLite (開発環境) / PostgreSQL (本番環境)
- **ORM**: Prisma 5.19.1
- **Authentication**: JWT + bcryptjs
- **API Integration**: Google Sheets API v4
- **File Processing**: CSV出力対応

## 開発・運用ツール
- **Node.js**: 18+
- **Package Manager**: npm
- **Development**: Hot reload, TypeScript strict mode
- **Testing**: 統合テスト、データ生成スクリプト
- **Database Tools**: Prisma Studio
- **Deployment**: Vercel with PostgreSQL
- **Analytics**: Vercel Analytics

## 外部API
- **Google Sheets API**: 納品書・請求書作成、PDF出力
- **freee API**: 一時停止中（Google Sheetsに移行済み）

## セキュリティ
- パスワードハッシュ化（bcryptjs）
- JWT認証トークン
- SQLインジェクション対策（Prisma）
- セキュリティヘッダー設定