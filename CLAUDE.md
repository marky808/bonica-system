# BONICA管理システム - Claude Code ガイド

## プロジェクト概要

農産物業界向けの包括的な仕入れ・納品・請求管理システム。
フルスタックNext.jsアプリケーションで、Google Sheets API連携による納品書・請求書の自動作成とPDF出力機能を提供。

**現在の状態**: 本番運用中（2025年12月〜）

## 技術スタック

### フロントエンド
- **Framework**: Next.js 14.2.16 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4.1.9
- **UI Components**: shadcn/ui (Radix UI ベース)
- **Form**: React Hook Form + Zod
- **Charts**: Recharts

### バックエンド
- **Runtime**: Next.js API Routes
- **Database**: SQLite (開発) / PostgreSQL (本番)
- **ORM**: Prisma 5.19.1
- **Authentication**: JWT + bcryptjs
- **API Integration**: Google Sheets API v4

### デプロイ
- **Hosting**: Vercel
- **Database**: Vercel PostgreSQL

## プロジェクト構造

```
app/                    # Next.js App Router
  api/                  # APIルート
    auth/               # 認証
    purchases/          # 仕入れ管理
    deliveries/         # 納品管理
    customers/          # 納品先管理
    suppliers/          # 仕入れ先管理
    google-sheets/      # Google Sheets連携
      create-delivery-v2/   # 納品書作成API
      create-invoice-v2/    # 請求書作成API
  (authenticated)/      # 認証必須ページ
    dashboard/
    purchases/
    deliveries/
    billing/
    master/
components/             # Reactコンポーネント
  ui/                   # shadcn/ui基本コンポーネント
lib/                    # ユーティリティ
  db.ts                 # Prismaクライアント
  auth.ts               # 認証ユーティリティ
  google-sheets-client.ts  # Google Sheets API
prisma/                 # データベース
  schema.prisma         # スキーマ定義
  seed.ts               # 初期データ
scripts/                # 運用スクリプト
```

## 重要な決定事項

### 1. Google Sheets テンプレート構造 (2025-11-29)

納品書・請求書のレイアウト:
- **左側**: 顧客情報（御中、住所、納品日）
- **右側**: 発行元情報（ボニカアグリジェント）

データ書き込み位置（変更不可）:
```
A2: 顧客名 御中
A3: 顧客住所
A4: 納品日: YYYY-MM-DD
C4: 納品書番号: DEL-XXXXXXXX
A11-I50: 明細行（日付, 品名, 単価, 数量, 単位, 税率, 税抜金額, 消費税, 備考）
```

テンプレートのカスタマイズルール:
- ロゴ追加、フォント変更、色変更は自由
- 上記セル位置は固定（APIが書き込むため）
- G列・H列の計算式は維持が必要

### 2. 請求先（billingCustomer）機能

顧客に別の請求先を設定可能:
- `customer.billingCustomer` リレーション
- 請求書作成時にbillingCustomerの情報を優先使用

### 3. 納品登録モード切り替え機能 (2025-12-01)

納品登録画面で2つのモードを切り替え可能:

**通常モード（既存）**:
- 仕入れ一覧から選択して納品登録
- 在庫（残数）から納品数量を指定
- `inputMode: 'NORMAL'`, `purchaseLinkStatus: 'LINKED'`

**直接入力モード（新規）**:
- 仕入れデータを参照せずに直接入力
- 入力項目: 商品名、カテゴリー、数量、単位、単価、税率、備考
- 商品名はサジェスト付き（過去の仕入れから候補表示）
- `inputMode: 'DIRECT'`, `purchaseLinkStatus: 'UNLINKED'`

**管理機能**:
- ダッシュボードに「仕入れ未紐付け」件数をバッジ表示
- `/api/deliveries/unlinked` - 未紐付け納品一覧取得
- `/api/deliveries/link-purchase` - 納品と仕入れの紐付け

### 3. 認証情報の管理

本番環境では環境変数を使用:
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`
- `INITIAL_ADMIN_NAME`

ハードコードした認証情報は禁止。

### 4. Google Sheets OAuth

- OAuth 2.0 リフレッシュトークンを使用
- `GOOGLE_OAUTH_REFRESH_TOKEN` 環境変数で管理
- トークン期限切れ時は `scripts/get-oauth-refresh-token.ts` で再取得

## 主要なAPI

### 認証
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - ユーザー情報

### 納品管理
- `GET /api/deliveries` - 一覧
- `POST /api/deliveries` - 作成（在庫引当処理付き）
- `POST /api/google-sheets/create-delivery-v2` - 納品書作成

### 請求管理
- `GET /api/invoices/monthly` - 月次請求一覧
- `POST /api/google-sheets/create-invoice-v2` - 請求書作成

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番テスト実行
TEST_EMAIL='xxx@example.com' TEST_PASSWORD='xxxx' npx tsx scripts/production-readiness-test.ts

# Prisma Studio（DB確認）
npx prisma studio

# 環境変数取得（Vercel）
vercel env pull .env.vercel.production
source .env.vercel.production
```

## コーディング規約

### 命名規則
- ファイル: `kebab-case.tsx`
- コンポーネント: `PascalCase`
- 変数・関数: `camelCase`
- 定数: `SCREAMING_SNAKE_CASE`

### インポート順序
1. React/Next.js
2. 外部ライブラリ
3. 内部ライブラリ (`@/lib`, `@/components`)
4. 相対インポート

### エラーハンドリング
- ユーザー向けメッセージは日本語
- 構造化エラーレスポンス: `{ error: string, details?: string }`

## 環境変数（必須）

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
INITIAL_ADMIN_EMAIL=...
INITIAL_ADMIN_PASSWORD=...
GOOGLE_SHEETS_CLIENT_ID=...
GOOGLE_SHEETS_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID=...
GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID=...
```

## 注意事項

1. **セキュリティ**: テストスクリプトに認証情報をハードコードしない
2. **テンプレート**: Google Sheetsテンプレートのセル位置変更時はAPIも更新
3. **OAuth**: リフレッシュトークンは定期的に更新が必要
4. **デプロイ**: `vercel --prod` でデプロイ、環境変数はVercelで管理

## Serenaメモリ一覧

詳細情報は以下のメモリを参照:
- `project_overview` - プロジェクト全体像
- `tech_stack` - 技術スタック詳細
- `database_schema` - DBスキーマ
- `api_endpoints` - API一覧
- `coding_conventions` - コーディング規約
- `production_readiness_2025-11-29` - 本番準備完了報告
