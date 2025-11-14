# 🚀 クイックスタートガイド

BONICAシステムを最速でセットアップする手順です。

## 📋 必要なもの

- Node.js 18以上
- Googleアカウント（`bonicasystem@gmail.com`を推奨）
- Google Cloud Projectへのアクセス権

---

## ⚡ 3ステップでセットアップ

### ステップ1: プロジェクトのセットアップ

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数ファイルを作成
cp .env.local.example .env.local

# 3. データベースをセットアップ
npm run db:generate
npm run db:push
npm run db:seed
```

### ステップ2: Google OAuth 2.0認証を設定

#### 2-1. Google Cloud Consoleで設定

1. https://console.cloud.google.com を開く
2. プロジェクト「bonica-management-system」を選択
3. **APIとサービス** → **認証情報** に移動
4. **認証情報を作成** → **OAuth クライアント ID** を選択
5. 以下を設定:
   - アプリケーションの種類: **ウェブアプリケーション**
   - 名前: `Bonica Web Application`
   - 承認済みのリダイレクトURI: `http://localhost:3000/api/auth/google/callback`
6. **作成** → クライアントIDとシークレットをコピー

詳細は [OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md) を参照。

#### 2-2. 環境変数を設定

`.env.local` を開いて、以下を記入:

```bash
GOOGLE_OAUTH_CLIENT_ID="コピーしたクライアントID"
GOOGLE_OAUTH_CLIENT_SECRET="コピーしたシークレット"
```

#### 2-3. リフレッシュトークンを取得

```bash
npx tsx scripts/get-oauth-refresh-token.ts
```

ブラウザが開くので：
1. `bonicasystem@gmail.com` でログイン
2. アクセス許可を承認
3. リダイレクトされたURLをコピーしてターミナルに貼り付け
4. 自動的に `.env.local` に保存されます

### ステップ3: 起動！

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

**初期ログイン情報:**
- Email: `808works@gmail.com`
- Password: `6391`

---

## ✅ 動作確認

### Google Sheets連携のテスト

```bash
npx tsx scripts/test-oauth-delivery.ts
```

納品書と請求書が作成されれば成功です！

---

## 🔧 最小限の環境変数

`.env.local` に必要なのはこれだけです：

```bash
# データベース（Neon PostgreSQL）
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# JWT認証
JWT_SECRET="your-random-secret-key"
JWT_EXPIRES_IN="7d"

# Google OAuth 2.0（必須）
GOOGLE_OAUTH_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"
GOOGLE_OAUTH_REFRESH_TOKEN="your-refresh-token"

# テンプレート
GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID="1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY"
GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID="1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ"
```

**サービスアカウント関連の変数は不要です！**

---

## 🆘 トラブルシューティング

### OAuth認証エラー

```bash
# リフレッシュトークンを再取得
npx tsx scripts/get-oauth-refresh-token.ts
```

### データベースエラー

```bash
# データベースをリセット
rm prisma/dev.db
npm run db:push
npm run db:seed
```

### 詳しいヘルプ

- [OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md) - OAuth 2.0の詳細設定
- [README.md](README.md) - 完全なドキュメント

---

## 📚 次のステップ

1. ユーザーマスタから他のユーザーを追加
2. 仕入れ先・納品先マスタを登録
3. 仕入れデータを登録
4. 納品処理を実行
5. 納品書・請求書を作成

以上です！🎉
