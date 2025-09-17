# 🔧 BONICA Google Cloud Project設定ガイド

## 📋 設定手順

### 1. Google Cloud Projectの作成

1. **Google Cloud Console**にアクセス: https://console.cloud.google.com
2. **プロジェクトを作成**をクリック
3. プロジェクト設定:
   - **プロジェクト名**: `bonica-system`
   - **プロジェクトID**: `bonica-system-production` (利用可能な場合)
   - **組織**: 個人アカウント
4. **作成**をクリック

### 2. Google Sheets APIの有効化

1. **APIとサービス** → **ライブラリ**に移動
2. "Google Sheets API"で検索
3. **Google Sheets API**を選択
4. **有効にする**をクリック

### 3. サービスアカウントの作成

1. **APIとサービス** → **認証情報**に移動
2. **認証情報を作成** → **サービスアカウント**
3. サービスアカウント設定:
   - **サービスアカウント名**: `bonica-sheets-service`
   - **サービスアカウントID**: `bonica-sheets`
   - **説明**: `BONICA系统Google Sheets操作用サービスアカウント`
4. **作成して続行**をクリック

### 4. サービスアカウントキーの生成

1. 作成されたサービスアカウントをクリック
2. **キー**タブに移動
3. **キーを追加** → **新しいキーを作成**
4. **JSON**を選択
5. **作成**をクリック（JSONファイルがダウンロードされる）

### 5. Google Sheetsへのアクセス権限付与

1. **Google Sheets**を開く: https://docs.google.com/spreadsheets/d/1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY
2. **共有**をクリック
3. サービスアカウントのメールアドレスを追加:
   - `bonica-sheets@[PROJECT-ID].iam.gserviceaccount.com`
4. **権限**: 編集者
5. **送信**をクリック

## 🔑 環境変数設定

ダウンロードしたJSONファイルから以下の値を取得:

```json
{
  "type": "service_account",
  "project_id": "bonica-system-production",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "bonica-sheets@bonica-system-production.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Vercel環境変数設定

以下の環境変数をVercel Dashboardで設定:

```bash
GOOGLE_SHEETS_CLIENT_EMAIL="bonica-sheets@bonica-system-production.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...(実際のキー)\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID="bonica-system-production"
GOOGLE_SHEETS_SPREADSHEET_ID="1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY"
```

## ✅ 設定確認

設定完了後、以下で動作確認:

```bash
# 認証テスト
curl -X POST "https://bonica-system2025.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"808works.jp@gmail.com","password":"6391"}'

# テンプレート作成テスト
curl -X POST "https://bonica-system2025.vercel.app/api/google-sheets/templates" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"createSheets": true}'
```

## 🚨 重要な注意事項

1. **秘密鍵の管理**: JSONファイルは安全に保管
2. **権限の最小化**: 必要最小限の権限のみ付与
3. **アクセス監視**: 定期的にアクセスログを確認
4. **キーのローテーション**: 定期的にサービスアカウントキーを更新

## 🔧 トラブルシューティング

### APIエラー "Method doesn't allow unregistered callers"
- Google Sheets APIが有効になっているか確認
- サービスアカウントの権限を確認

### 403 Forbidden エラー
- Google Sheetsにサービスアカウントが共有されているか確認
- 編集者権限が付与されているか確認

### 環境変数エラー
- Vercelで環境変数が正しく設定されているか確認
- 特に`GOOGLE_SHEETS_PRIVATE_KEY`の改行文字（\n）が正しいか確認