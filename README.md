# BONICA管理システム

*農産物仕入れ・納品・請求管理システム*

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20%2B%20Prisma-blue?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![API Integration](https://img.shields.io/badge/API-Google%20Sheets-green?style=for-the-badge&logo=google-sheets)](https://developers.google.com/sheets/api)

## 📋 システム概要

BONICA管理システムは、農産物業界向けの包括的な仕入れ・納品・請求管理システムです。
フロントエンドからバックエンドまでフルスタック実装されており、Google Sheets API連携による納品書・請求書の自動作成とPDF出力機能を提供します。

**最終更新**: 2025年9月9日 - **本格運用可能な状態**

## 🚀 主要機能

### ✅ 実装済み機能（フロントエンド + バックエンド）

#### 1. 認証・ユーザー管理
- ログイン・ログアウト機能
- ユーザーマスタ管理（追加・編集・削除）
- 権限管理（管理者・一般ユーザー）

#### 2. ダッシュボード
- 売上・仕入れ・粗利の概要表示
- 在庫状況サマリー
- 月次レポートグラフ（Recharts使用）
- クイックアクション
- 最近の活動履歴

#### 3. 仕入れ管理
- 仕入れ登録（商品名、カテゴリー、数量、単価、仕入れ先、賞味期限）
- 仕入れ一覧（検索・フィルタ・ソート・ページネーション）
- ステータス管理（未使用・一部使用・使用済み）
- 月別フィルター機能

#### 4. 納品管理
- 納品処理（在庫選択、複数商品対応、数量制限）
- 納品履歴（詳細モーダル、検索・フィルター）
- Google Sheets納品書作成（自動テンプレート適用）
- ステータス管理（処理中・納品書発行済み・請求書準備完了）

#### 5. 帳票管理
- 請求書作成（月次集計、納品先別）
- 帳票履歴（納品書・請求書の管理）
- Google Sheets請求書作成（自動PDF出力対応）
- ステータス管理（下書き・発行済み）

#### 6. マスタ管理
- **仕入れ先管理**: 会社情報、担当者、支払条件、配送条件
- **納品先管理**: 会社情報、配送先、請求先、特記事項
- **商品カテゴリー管理**: 果物・野菜・穀物・冷凍・その他
- **ユーザー管理**: メールアドレス・パスワード・権限管理

#### 7. レポート機能
- 月次レポート（仕入れ・納品・粗利分析）
- 商品別分析
- 仕入れ先別分析
- 収益分析
- CSV出力機能

#### 8. レスポンシブ対応
- モバイルファースト設計
- スマホ対応カード表示
- タッチ操作最適化

## 🛠 技術スタック

### フロントエンド
- **Framework**: Next.js 14.2.16 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4.1.9
- **UI Components**: shadcn/ui (Radix UI ベース)
- **Charts**: Recharts
- **Form**: React Hook Form + Zod 3.25.67
- **State Management**: React Hooks
- **Icons**: Lucide React

### バックエンド
- **Runtime**: Next.js API Routes (サーバーサイド)
- **Database**: SQLite (開発環境) / PostgreSQL対応
- **ORM**: Prisma 5.19.1
- **Authentication**: JWT + bcryptjs
- **API Integration**: Google Sheets API v4
- **File Processing**: CSV出力対応

### 開発・運用
- **Node.js**: 18+
- **Package Manager**: npm
- **Development**: Hot reload, TypeScript strict mode
- **Testing**: 統合テスト、データ生成スクリプト
- **Database Tools**: Prisma Studio

## 📊 データ構造

### 主要エンティティ

\`\`\`typescript
// ユーザー管理
interface User {
  id: string;
  name: string;
  email: string;
  password: string; // ハッシュ化必須
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
}

// 仕入れ管理
interface Purchase {
  id: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  unitNote?: string;
  price: number;
  taxType: "taxable" | "tax_free";
  supplierId: string;
  purchaseDate: Date;
  expiryDate?: Date;
  deliveryFee?: string;
  status: "unused" | "partial" | "used";
  remainingQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

// 納品管理
interface Delivery {
  id: string;
  customerId: string;
  deliveryDate: Date;
  items: DeliveryItem[];
  totalAmount: number;
  status: "pending" | "slip_issued" | "invoice_ready";
  freeeDeliverySlipId?: string;
  freeeInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 仕入れ先マスタ
interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  address: string;
  paymentTerms: string;
  deliveryConditions: string;
  specialNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 納品先マスタ
interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  deliveryAddress: string;
  billingAddress: string;
  deliveryTimePreference?: string;
  specialRequests?: string;
  specialNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

## ✅ バックエンド実装完了

### 🎯 実装済み機能

#### 1. データベース設計・構築 ✅
- [x] **SQLite データベース設計完了** (本番環境はPostgreSQL対応)
- [x] **Prismaマイグレーションファイル作成済み**
- [x] **初期データ投入機能** (`npm run db:seed`, テストデータ生成)
- [x] **インデックス設計** (検索・ソート最適化済み)

#### 2. 認証・セッション管理 ✅
- [x] **JWT認証システム実装済み**
- [x] **パスワードハッシュ化** (bcryptjs使用)
- [x] **セッション管理** (JWTトークンベース)
- [x] **権限チェック機能**
- [x] **ログイン・ログアウトAPI** (`/api/auth/*`)

#### 3. 基本CRUD API実装 ✅
- [x] **ユーザー管理API** (`/api/auth/me`)
- [x] **仕入れ管理API** (`/api/purchases`, `/api/purchases/[id]`)
  - 検索・フィルタ・ソート・ページネーション完備
  - 在庫数量自動計算
  - 利用可能在庫API (`/api/purchases/available`)
- [x] **納品管理API** (`/api/deliveries`, `/api/deliveries/[id]`)
  - 在庫引当処理
  - 複数商品対応
  - ステータス管理
- [x] **マスタ管理API完備**
  - 仕入れ先 (`/api/suppliers`, `/api/suppliers/[id]`)
  - 納品先 (`/api/customers`, `/api/customers/[id]`)
  - カテゴリー (`/api/categories`)

#### 4. ビジネスロジック実装 ✅
- [x] **在庫管理ロジック完全実装**
  - 仕入れ時の在庫追加
  - 納品時の在庫減算・残量管理
  - 在庫不足チェック
- [x] **売上・粗利計算** (`/api/dashboard/stats`)
- [x] **月次集計処理** (`/api/invoices/monthly`)
- [x] **データ整合性チェック**

#### 5. Google Sheets API連携 ✅
- [x] **Google Sheets OAuth認証実装済み**
- [x] **納品書作成API** (`/api/google-sheets/create-delivery`)
- [x] **請求書作成API** (`/api/google-sheets/create-invoice`)
- [x] **テンプレート管理API** (`/api/google-sheets/templates`)
- [x] **ステータス同期処理**
- [x] **エラーハンドリング完備**

#### 6. レポート・分析機能 ✅
- [x] **ダッシュボードAPI** (`/api/dashboard/stats`, `/api/dashboard/activities`)
- [x] **CSV出力機能** (`/api/reports/csv`)
- [x] **在庫分析API** (`/api/inventory`)
- [x] **月次請求書API** (`/api/invoices/monthly`)

#### 7. 検索・フィルター機能 ✅
- [x] **全文検索実装** (商品名、取引先名)
- [x] **高度なフィルター機能** (日付範囲、カテゴリー、ステータス)
- [x] **ソート機能** (日付、金額、在庫)
- [x] **ページネーション実装**

### 🔄 一部実装済み・移行中

#### 8. freee API連携 (Google Sheetsに移行済み)
- [x] **freee OAuth認証実装** (現在は非活性)
- [x] **納品書・請求書作成API** (Google Sheetsに移行)
- [?] **ステータス同期処理** (Google Sheets連携で代替)

## 🔗 実装済みAPI エンドポイント

### 🔐 認証 (`/api/auth`)
```
POST /api/auth/login      # ログイン
GET  /api/auth/me         # ユーザー情報取得
```

### 👥 ユーザー管理 (`/api/auth`)
```
GET  /api/auth/me         # 現在のユーザー情報
```

### 📦 仕入れ管理 (`/api/purchases`)
```
GET    /api/purchases                # 仕入れ一覧（ページネーション、フィルタ対応）
POST   /api/purchases                # 仕入れ登録
GET    /api/purchases/[id]          # 仕入れ詳細
PUT    /api/purchases/[id]          # 仕入れ更新
DELETE /api/purchases/[id]          # 仕入れ削除
GET    /api/purchases/available     # 利用可能在庫一覧
```

### 🚚 納品管理 (`/api/deliveries`)
```
GET    /api/deliveries              # 納品一覧
POST   /api/deliveries              # 納品登録（在庫引当処理付き）
GET    /api/deliveries/[id]        # 納品詳細
PUT    /api/deliveries/[id]        # 納品更新
DELETE /api/deliveries/[id]        # 納品削除
```

### 🧾 請求書管理 (`/api/invoices`)
```
GET    /api/invoices/monthly        # 月次請求書一覧・作成
```

### 🏢 マスタ管理
```
# 仕入れ先管理 (/api/suppliers)
GET    /api/suppliers              # 仕入れ先一覧
POST   /api/suppliers              # 仕入れ先登録
GET    /api/suppliers/[id]        # 仕入れ先詳細
PUT    /api/suppliers/[id]        # 仕入れ先更新
DELETE /api/suppliers/[id]        # 仕入れ先削除

# 納品先管理 (/api/customers)
GET    /api/customers              # 納品先一覧
POST   /api/customers              # 納品先登録
GET    /api/customers/[id]        # 納品先詳細
PUT    /api/customers/[id]        # 納品先更新
DELETE /api/customers/[id]        # 納品先削除

# カテゴリー管理 (/api/categories)
GET    /api/categories             # カテゴリー一覧
```

### 📊 レポート・分析 (`/api/dashboard`, `/api/reports`)
```
GET /api/dashboard/stats           # ダッシュボード統計（売上・粗利・在庫）
GET /api/dashboard/activities      # 最近の活動履歴
GET /api/reports/csv              # CSV出力（仕入れ・納品データ）
GET /api/inventory                # 在庫一覧・分析
```

### 📄 Google Sheets連携 (`/api/google-sheets`)
```
POST /api/google-sheets/create-delivery    # 納品書スプレッドシート作成
POST /api/google-sheets/create-invoice     # 請求書スプレッドシート作成
GET  /api/google-sheets/templates          # テンプレート管理
```

### 🔄 freee連携 (`/api/freee`) - 一時停止中
```
POST /api/freee/create-delivery-slip      # freee納品書発行 (非活性)
POST /api/freee/create-invoice            # freee請求書発行 (非活性)
GET  /api/freee/test                      # 接続テスト
```

## 🚀 セットアップ手順

### 1. リポジトリクローン・依存関係インストール
```bash
git clone <repository-url>
cd bonica-system
npm install
```

### 2. 環境変数設定
`.env.local` ファイルを作成し、以下を設定：

```bash
# データベース設定
DATABASE_URL="file:./dev.db"

# JWT認証
JWT_SECRET="your-jwt-secret-key"

# Google Sheets API設定
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID="your-project-id"

# freee API設定（オプション）
FREEE_CLIENT_ID="your-freee-client-id"
FREEE_CLIENT_SECRET="your-freee-client-secret"
```

### 3. データベースセットアップ
```bash
# Prismaクライアント生成
npm run db:generate

# データベーススキーマ作成
npm run db:push

# 初期データ投入
npm run db:seed

# テストデータ生成（オプション）
npm run seed:test
```

### 4. 開発サーバー起動
```bash
npm run dev
# サーバーは http://localhost:3000 で起動
```

### 5. データベース管理
```bash
# Prisma Studio起動（データベースGUI）
npm run db:studio

# マイグレーション作成（スキーマ変更時）
npm run db:migrate
```

## 📝 初期データ

### 初期ユーザー
- **Email**: 808works@gmail.com
- **Password**: 6391
- **Name**: 小西正高
- **Role**: admin

### 商品カテゴリー
- 果物
- 野菜  
- 穀物
- 冷凍
- その他

## 📊 Google Sheets連携機能

### 概要
BONICA管理システムでは、Google Sheets APIを使用して納品書・請求書を作成します。
事前に作成したテンプレートスプレッドシートをベースに、自動でデータを挿入してPDF出力可能な帳票を生成します。

### 機能一覧
- **納品書のスプレッドシート作成**: 納品データから自動で納品書を作成
- **請求書のスプレッドシート作成**: 月次集約データから請求書を作成
- **PDF出力機能**: Google SheetsのPDF出力機能を活用
- **テンプレート管理**: 納品書・請求書用のテンプレート管理

### セットアップ手順

#### 1. Google Cloud設定
1. Google Cloud Projectの作成
2. Google Sheets APIの有効化
3. サービスアカウントの作成
4. 秘密鍵JSONの取得

#### 2. 環境変数設定
`.env.local`に以下の環境変数を設定してください：

```bash
# Google Sheets API Configuration
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID="your-project-id"
```

#### 3. テンプレート作成
1. 納品書用スプレッドシートテンプレートの作成
2. 請求書用スプレッドシートテンプレートの作成
3. テンプレートIDをデータベースに登録

### 使用方法

#### 1. 納品管理画面での操作
1. 納品一覧で「Google Sheets納品書作成」ボタンをクリック
2. 自動でテンプレートがコピーされ、納品データが挿入される
3. 作成されたスプレッドシートのリンクが表示される
4. PDF出力ボタンでPDFをダウンロード可能

#### 2. 帳票管理画面での操作
1. 対象の納品データを選択
2. 「Google Sheets請求書作成」ボタンをクリック
3. 月次集計データが請求書テンプレートに自動反映
4. 請求書スプレッドシートとPDFが同時に利用可能

### API仕様
- **POST** `/api/google-sheets/create-delivery` - 納品書作成
- **POST** `/api/google-sheets/create-invoice` - 請求書作成
- **GET** `/api/google-sheets/templates` - テンプレート管理

## 🔄 システム連携フロー

### Google Sheets連携フロー（現在の主要機能）
1. **納品処理** → Google Sheets納品書自動作成 → PDF出力 → ステータス更新
2. **月次請求書作成** → Google Sheets請求書自動作成 → PDF出力 → 請求管理
3. **テンプレート管理** → 動的なスプレッドシート生成 → カスタマイズ可能な帳票作成

### freee連携フロー（一時停止中）
⚠️ **注意**: freee連携機能は現在Google Sheets連携への移行に伴い一時的に停止しています。
- 必要に応じて将来的に再活性化可能

## 🎯 システムの現状

### ✅ 運用準備完了
- **フロントエンド**: 完全実装済み、レスポンシブ対応
- **バックエンド**: 全API実装済み、本格運用可能
- **データベース**: SQLite（開発）、PostgreSQL対応（本番）
- **認証**: JWT認証、セキュアな権限管理
- **帳票**: Google Sheets連携による自動作成・PDF出力

### 📈 パフォーマンス・信頼性
- **高速レスポンス**: 最適化されたクエリ、効率的なページネーション
- **エラーハンドリング**: 包括的なエラー処理、ユーザーフレンドリーなメッセージ
- **データ整合性**: トランザクション管理、在庫整合性チェック
- **セキュリティ**: パスワードハッシュ化、SQLインジェクション対策

## 🚀 今後の拡張予定

### 短期（1-3ヶ月）
- [ ] **モバイルアプリ**: PWA対応、オフライン機能
- [ ] **通知機能**: 在庫切れアラート、期限切れ商品通知
- [ ] **バッチ処理**: 大量データ処理最適化

### 中期（3-6ヶ月）
- [ ] **多店舗対応**: 複数拠点管理機能
- [ ] **高度な分析**: 売上予測、季節変動分析
- [ ] **API連携拡張**: 他社システムとの連携

### 長期（6ヶ月以上）
- [ ] **AI機能**: 需要予測、価格最適化
- [ ] **配送管理**: 配送ルート最適化
- [ ] **クラウド展開**: AWS/GCP本番環境構築

## 📞 サポート・問い合わせ

- **技術サポート**: このリポジトリのIssues
- **機能要望**: GitHub Discussions
- **運用サポート**: 開発チームまでご連絡

## 📊 システム利用状況

- **開発期間**: 2024年12月 - 2025年9月
- **実装言語**: TypeScript 100%
- **コードベース**: フロントエンド + バックエンド統合
- **テストカバレッジ**: 主要API・ビジネスロジック
- **運用準備度**: ✅ **本格運用可能**

---

**Built with ❤️ for 農産物業界のDX推進 | BONICA System 2025**
