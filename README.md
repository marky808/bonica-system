# BONICA管理システム

*農産物仕入れ・納品・請求管理システム*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/808worksjp-gmailcoms-projects/v0-)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/8XjLzWSynuO)

## 📋 システム概要

BONICA管理システムは、農産物業界向けの包括的な仕入れ・納品・請求管理システムです。
freee連携により、納品書・請求書の自動発行と会計システムとの連携を実現します。

## 🚀 主要機能

### ✅ フロントエンド実装済み機能

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
- freee連携準備（納品書発行ボタン）
- ステータス管理（処理中・納品書発行済み・請求書準備完了）

#### 5. 帳票管理
- 請求書作成（月次集計、納品先別）
- 帳票履歴（納品書・請求書の管理）
- freee連携準備（請求書作成ボタン）
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
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Form**: React Hook Form + Zod
- **State Management**: React Hooks

### 開発環境
- **Node.js**: 18+
- **Package Manager**: npm
- **Deployment**: Vercel

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

## 🔧 バックエンド実装タスク

### 🎯 優先度：高（必須機能）

#### 1. データベース設計・構築
- [ ] PostgreSQL/MySQL データベース設計
- [ ] マイグレーションファイル作成
- [ ] 初期データ投入（カテゴリー、初期ユーザー）
- [ ] インデックス設計（検索・ソート最適化）

#### 2. 認証・セッション管理
- [ ] JWT認証システム実装
- [ ] パスワードハッシュ化（bcrypt）
- [ ] セッション管理
- [ ] 権限チェックミドルウェア
- [ ] ログイン・ログアウトAPI

#### 3. 基本CRUD API実装
- [ ] **ユーザー管理API** (`/api/users`)
  - GET, POST, PUT, DELETE
  - パスワード変更機能
- [ ] **仕入れ管理API** (`/api/purchases`)
  - 検索・フィルタ・ソート・ページネーション
  - 在庫数量自動計算
- [ ] **納品管理API** (`/api/deliveries`)
  - 在庫引当処理
  - 複数商品対応
- [ ] **マスタ管理API**
  - 仕入れ先 (`/api/suppliers`)
  - 納品先 (`/api/customers`)
  - カテゴリー (`/api/categories`)

#### 4. ビジネスロジック実装
- [ ] 在庫管理ロジック
  - 仕入れ時の在庫追加
  - 納品時の在庫減算
  - 在庫不足チェック
- [ ] 売上・粗利計算
- [ ] 月次集計処理
- [ ] データ整合性チェック

### 🎯 優先度：中（重要機能）

#### 5. freee API連携
- [ ] freee OAuth認証実装
- [ ] 納品書作成API連携
  - POST `/delivery_slips` 実装
  - 帳票テンプレート取得
- [ ] 請求書作成API連携
  - POST `/invoices` 実装
  - 納品データ自動連携
- [ ] ステータス同期処理
- [ ] エラーハンドリング・リトライ機能

#### 6. レポート・分析機能
- [ ] 月次レポートAPI (`/api/reports/monthly`)
- [ ] 商品別分析API (`/api/reports/products`)
- [ ] 仕入れ先別分析API (`/api/reports/suppliers`)
- [ ] CSV出力機能

#### 7. 検索・フィルター機能
- [ ] 全文検索実装（商品名、取引先名）
- [ ] 高度なフィルター機能
- [ ] ソート機能最適化
- [ ] ページネーション実装

### 🎯 優先度：低（拡張機能）

#### 8. パフォーマンス最適化
- [ ] データベースクエリ最適化
- [ ] キャッシュ機能（Redis）
- [ ] API レスポンス最適化
- [ ] バッチ処理実装

#### 9. セキュリティ強化
- [ ] API レート制限
- [ ] CORS設定
- [ ] SQL インジェクション対策
- [ ] XSS対策
- [ ] 監査ログ機能

#### 10. 運用・監視
- [ ] ログ機能実装
- [ ] エラー監視
- [ ] ヘルスチェックAPI
- [ ] バックアップ機能

## 🔗 API エンドポイント設計

### 認証
\`\`\`
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
\`\`\`

### ユーザー管理
\`\`\`
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
\`\`\`

### 仕入れ管理
\`\`\`
GET    /api/purchases?page=1&limit=10&category=果物&supplier=ABC&month=2024-01
POST   /api/purchases
GET    /api/purchases/:id
PUT    /api/purchases/:id
DELETE /api/purchases/:id
\`\`\`

### 納品管理
\`\`\`
GET    /api/deliveries?page=1&limit=10&customer=ABC&month=2024-01
POST   /api/deliveries
GET    /api/deliveries/:id
PUT    /api/deliveries/:id
POST   /api/deliveries/:id/generate-slip  # freee納品書発行
\`\`\`

### 請求書管理
\`\`\`
GET    /api/invoices?month=2024-01
POST   /api/invoices
GET    /api/invoices/:id
POST   /api/invoices/:id/generate  # freee請求書発行
\`\`\`

### レポート
\`\`\`
GET /api/reports/dashboard
GET /api/reports/monthly?year=2024&month=1
GET /api/reports/products?startDate=2024-01-01&endDate=2024-01-31
GET /api/reports/suppliers?startDate=2024-01-01&endDate=2024-01-31
\`\`\`

## 🚀 セットアップ手順

### フロントエンド
\`\`\`bash
npm install
npm run dev
\`\`\`

### バックエンド（実装予定）
\`\`\`bash
# データベース設定
cp .env.example .env
# DATABASE_URL, FREEE_CLIENT_ID, FREEE_CLIENT_SECRET を設定

# マイグレーション実行
npm run migrate

# 初期データ投入
npm run seed

# サーバー起動
npm run start
\`\`\`

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

## 🔄 freee連携フロー

1. **納品処理** → freee納品書自動作成 → ステータス更新
2. **請求書作成** → freee請求書自動作成 → ステータス更新
3. **支払い確認** → freee会計データ取得 → 売上確定

## 📞 サポート

バックエンド実装に関する質問や仕様確認は、このリポジトリのIssuesでお気軽にお問い合わせください。

---

**Built with ❤️ for 農産物業界のDX推進**
