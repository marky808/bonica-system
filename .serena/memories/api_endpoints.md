# BONICA管理システム - API エンドポイント一覧

## 🔐 認証 (`/api/auth`)
```
POST /api/auth/login      # ログイン
GET  /api/auth/me         # ユーザー情報取得
```

## 📦 仕入れ管理 (`/api/purchases`)
```
GET    /api/purchases                # 仕入れ一覧（ページネーション、フィルタ対応）
POST   /api/purchases                # 仕入れ登録
GET    /api/purchases/[id]          # 仕入れ詳細
PUT    /api/purchases/[id]          # 仕入れ更新
DELETE /api/purchases/[id]          # 仕入れ削除
GET    /api/purchases/available     # 利用可能在庫一覧
```

## 🚚 納品管理 (`/api/deliveries`)
```
GET    /api/deliveries              # 納品一覧
POST   /api/deliveries              # 納品登録（在庫引当処理付き）
GET    /api/deliveries/[id]        # 納品詳細
PUT    /api/deliveries/[id]        # 納品更新
DELETE /api/deliveries/[id]        # 納品削除
```

## 🧾 請求書管理 (`/api/invoices`)
```
GET    /api/invoices/monthly        # 月次請求書一覧・作成
```

## 🏢 マスタ管理

### 仕入れ先管理 (`/api/suppliers`)
```
GET    /api/suppliers              # 仕入れ先一覧
POST   /api/suppliers              # 仕入れ先登録
GET    /api/suppliers/[id]        # 仕入れ先詳細
PUT    /api/suppliers/[id]        # 仕入れ先更新
DELETE /api/suppliers/[id]        # 仕入れ先削除
```

### 納品先管理 (`/api/customers`)
```
GET    /api/customers              # 納品先一覧
POST   /api/customers              # 納品先登録
GET    /api/customers/[id]        # 納品先詳細
PUT    /api/customers/[id]        # 納品先更新
DELETE /api/customers/[id]        # 納品先削除
```

### カテゴリー管理 (`/api/categories`)
```
GET    /api/categories             # カテゴリー一覧
```

## 📊 レポート・分析 (`/api/dashboard`, `/api/reports`)
```
GET /api/dashboard/stats           # ダッシュボード統計（売上・粗利・在庫）
GET /api/dashboard/activities      # 最近の活動履歴
GET /api/reports/csv              # CSV出力（仕入れ・納品データ）
GET /api/inventory                # 在庫一覧・分析
```

## 📄 Google Sheets連携 (`/api/google-sheets`)
```
POST /api/google-sheets/create-delivery    # 納品書スプレッドシート作成
POST /api/google-sheets/create-invoice     # 請求書スプレッドシート作成
GET  /api/google-sheets/templates          # テンプレート管理
```

## 🛠 システム管理 (`/api/admin`, `/api/health`)
```
POST /api/admin/init              # データベース初期化（本番環境用）
GET  /api/health                  # ヘルスチェック・自動初期化
```

## 🔄 freee連携 (`/api/freee`) - 一時停止中
```
POST /api/freee/create-delivery-slip      # freee納品書発行 (非活性)
POST /api/freee/create-invoice            # freee請求書発行 (非活性)
GET  /api/freee/test                      # 接続テスト
```

## 共通レスポンス形式
```typescript
interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
```

## 認証が必要なエンドポイント
ほぼ全てのエンドポイントでJWT認証が必要（ログインとヘルスチェック以外）
- Headerに `Authorization: Bearer <token>` を含める必要がある