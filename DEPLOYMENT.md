# BONICA管理システム - Vercelデプロイ手順

## 🚀 デプロイ手順

### 1. Vercelプロジェクトの作成
1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. "New Project"をクリック
3. GitHubリポジトリ `bonica-system` を選択
4. インポート設定は自動検出されるのでそのままデプロイ

### 2. PostgreSQLデータベースの追加
1. Vercelプロジェクトの**Storage**タブを開く
2. "Create Database" → "Postgres"を選択
3. データベース名: `bonica-db`
4. リージョン: **Tokyo (hnd1)** を選択
5. 作成完了後、環境変数が自動設定される

### 3. 環境変数の設定
Vercelプロジェクトの**Settings** → **Environment Variables**で以下を設定：

#### 必須の環境変数
```bash
# データベース設定（PostgreSQL用）
DATABASE_PROVIDER="postgresql"
# DATABASE_URL と DIRECT_URL は PostgreSQL 作成時に自動設定される

# JWT認証（強力なランダム文字列に変更）
JWT_SECRET="RNCw7amJ3Df9RLFYBvlB/ZQFdGz2hZ4JK7Fw8Zog5QUSUeAGTp7GYWaW62t7E7Iy
SdIHw3hYt2Szdgylx2OqiQ=="

# データベース初期化用セキュリティキー（強力なランダム文字列に変更）
INIT_SECRET_KEY="8YEwoMWlaMUh3J1HDzQWneBcvNPwAwYUzkEIdVS808I="

# 初期管理者ユーザー（必要に応じて変更）
INITIAL_ADMIN_EMAIL="808works@gmail.com"
INITIAL_ADMIN_NAME="小西正高"
INITIAL_ADMIN_PASSWORD="6391"

# JWT有効期限（オプション）
JWT_EXPIRES_IN="7d"

# Google Sheets API（必要に応じて）
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_PROJECT_ID="your-google-cloud-project-id"

# Next.js環境設定
NEXT_PUBLIC_APP_NAME="BONICA管理システム"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

**注意**: `DATABASE_URL`と`DIRECT_URL`は**PostgreSQLデータベース作成時に自動設定**されます。

### 4. データベースの初期化

#### 4-1. 初回デプロイ後の初期化
デプロイが完了したら、以下のAPIエンドポイントを呼び出してデータベースを初期化：

```bash
curl -X POST https://your-app.vercel.app/api/admin/init \
  -H "Authorization: Bearer 8YEwoMWlaMUh3J1HDzQWneBcvNPwAwYUzkEIdVS808I=" \
  -H "Content-Type: application/json"
```

**成功レスポンス例:**
```json
{
  "success": true,
  "message": "データベースの初期化が完了しました",
  "admin": {
    "email": "808works@gmail.com",
    "name": "小西正高",
    "role": "ADMIN"
  }
}
```

#### 4-2. 初期化される内容
- ✅ 管理者ユーザーの作成
- ✅ 商品カテゴリの作成（果物、野菜、穀物、冷凍、その他）
- ✅ サンプルサプライヤーの作成
- ✅ サンプル顧客の作成

## 🔐 ログイン情報

初期化完了後、以下の情報でログイン可能：

- **URL**: `https://your-app.vercel.app/login`
- **メールアドレス**: `808works@gmail.com`
- **パスワード**: `6391`

## 📊 動作確認

1. **ログイン**: 管理者でログイン
2. **ダッシュボード**: 統計情報が表示される
3. **仕入れ**: サンプルデータが表示される
4. **納品**: 新規納品登録が可能
5. **顧客管理**: サンプル顧客が表示される

## 🛠 トラブルシューティング

### ❌ ログインできない問題
**症状**: ログイン画面で認証情報を入力してもログインできない

**原因と対処法**:
1. **JWT_SECRETが未設定**
   ```
   Error: サーバー設定エラー
   ```
   → Vercel環境変数で`JWT_SECRET`を確認・設定

2. **データベースが初期化されていない**
   ```
   Error: ユーザーが見つかりません
   ```
   → データベース初期化APIを実行（下記参照）

3. **PostgreSQL接続エラー**
   ```
   Error: Can't reach database server
   ```
   → `DATABASE_PROVIDER="postgresql"`が設定されているか確認
   → PostgreSQL環境変数（`DATABASE_URL`, `DIRECT_URL`）を確認

### データベース接続エラー
```
Error: Can't reach database server
```
**対処法**:
- PostgreSQL環境変数（`DATABASE_URL`, `DIRECT_URL`）を確認
- `DATABASE_PROVIDER="postgresql"`が設定されているか確認
- Vercel Postgres データベースが作成されているか確認

### 初期化API認証エラー
```
{"error":"Unauthorized: Invalid init key"}
```
**対処法**:
- `INIT_SECRET_KEY`環境変数が正しく設定されているか確認
- 初期化APIの認証ヘッダーが正しいか確認

### ビルドエラー
```
Build failed
```
**対処法**:
- TypeScript設定で一時的に`ignoreBuildErrors: true`が設定済み
- Prisma生成エラーの場合：`DATABASE_PROVIDER`環境変数を確認

## 🔧 本番運用前のチェックリスト

- [ ] 強力なJWT_SECRETに変更
- [ ] 管理者パスワードを変更
- [ ] INIT_SECRET_KEYをランダムに変更
- [ ] Google Sheets API設定（必要な場合）
- [ ] SSL証明書の確認（Vercelで自動設定）
- [ ] カスタムドメインの設定（必要な場合）

## 📝 セキュリティ注意事項

1. **INIT_SECRET_KEY**は初期化後、無効にするか変更することを推奨
2. **管理者パスワード**は本番運用前に必ず変更
3. **JWT_SECRET**は定期的に更新することを推奨
4. API初期化エンドポイントは初回のみ使用

---
**更新日**: 2025年9月9日  
**バージョン**: 1.0.0