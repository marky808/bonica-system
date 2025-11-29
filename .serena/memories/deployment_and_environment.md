# BONICA管理システム - デプロイメント・環境設定

## 開発環境

### 必要なソフトウェア
- Node.js 18+
- npm
- Git

### 環境変数設定（.env.local）
```bash
# データベース設定（開発環境）
DATABASE_URL="file:./dev.db"

# JWT認証
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Google Sheets API設定
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_PROJECT_ID="your-google-cloud-project-id"

# 初期管理者ユーザー
INITIAL_ADMIN_EMAIL="[設定された管理者メール]"
INITIAL_ADMIN_NAME="小西正高"
INITIAL_ADMIN_PASSWORD="[設定されたパスワード]"

# データベース初期化用セキュリティキー
INIT_SECRET_KEY="your-super-secret-init-key-change-this-in-production"
```

## 本番環境（Vercel）

### デプロイ設定
- **Platform**: Vercel
- **Database**: PostgreSQL (Vercel Postgres)
- **Region**: Tokyo (hnd1)
- **Build Command**: 自動スキーマ切り替え付きビルド

### vercel.json設定
```json
{
  "buildCommand": "cp prisma/schema-production.prisma prisma/schema.prisma && npm run vercel-build",
  "regions": ["hnd1"],
  "functions": {
    "app/api/*/route.ts": { "maxDuration": 30 },
    "app/api/health/route.ts": { "maxDuration": 60 }
  }
}
```

### 本番環境変数
```bash
# データベース（Vercelが自動設定）
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# JWT認証（強力なランダム文字列）
JWT_SECRET="RNCw7amJ3Df9RLFYBvlB/ZQFdGz2hZ4JK7Fw8Zog5QUSUeAGTp7GYWaW62t7E7Iy..."

# 自動初期化用
INIT_SECRET_KEY="production-secure-random-key"
```

## 自動初期化システム

### 複数の初期化方法
1. **ヘルスチェック自動初期化**: `/api/health`
2. **ミドルウェア自動初期化**: 初回アクセス時
3. **手動初期化**: `/api/admin/init` エンドポイント
4. **GitHub Actions**: デプロイ後自動実行
5. **スタンドアロンスクリプト**: `scripts/auto-init.js`

### 初期化処理内容
- データベース接続確認
- 管理者ユーザー作成
- 初期カテゴリーデータ投入
- テストデータ生成（開発環境のみ）

## セキュリティ設定

### Next.js設定
```javascript
// セキュリティヘッダー
headers: [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' }
]
```

### 認証設定
- JWT認証
- bcryptjs パスワードハッシュ化
- セッション管理（JWTトークンベース）

## パフォーマンス最適化

### ビルド設定
- ESLint: ビルド時無効（開発中）
- TypeScript: ビルドエラー無効（開発中）
- 画像最適化: 開発時は無効
- 圧縮: 有効

### データベース最適化
- インデックス設計済み
- ページネーション実装
- 効率的なクエリ設計

## モニタリング・ログ
- Vercel Analytics統合
- 詳細なAPIログ出力
- エラートラッキング