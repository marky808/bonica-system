# 🚀 BONICA Google Sheetsテンプレート作成 - 最終実行ガイド

## 📋 現在の状況

✅ **完了した作業**
- Google Sheetsテンプレート自動作成スクリプト完全実装
- 本番環境用APIエンドポイント作成
- システム互換性確認済み
- 環境変数設定確認済み

⚠️ **残りのタスク**
- Google Sheetsテンプレートの実際の作成実行

## 🔧 環境変数確認

以下の環境変数が設定済みであることを確認済み：

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL: 設定済み
GOOGLE_SHEET_ID: 1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY
GOOGLE_PRIVATE_KEY: 設定済み
JWT_SECRET: 設定済み
```

## 🎯 実行方法（複数のオプション）

### オプション1: Vercel Dashboard経由

1. **Vercel Dashboard**にアクセス
2. **bonica-system2025プロジェクト**を選択
3. **Functions**または**Edge Functions**タブ
4. **Terminal**を開く
5. 以下を実行:
   ```bash
   npx tsx scripts/create-google-sheets-templates.ts
   ```

### オプション2: APIエンドポイント経由（デプロイ完了後）

```bash
curl -X POST "https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app/api/create-templates" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### オプション3: ローカル環境での実行

1. 本番環境の環境変数をローカルに設定
2. 以下を実行:
   ```bash
   GOOGLE_SHEETS_SPREADSHEET_ID="1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY" \
   npx tsx scripts/create-google-sheets-templates.ts
   ```

## 📊 作成されるテンプレート

### 納品書テンプレート
- **シート名**: 納品書テンプレート
- **URL**: `https://docs.google.com/spreadsheets/d/1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY/edit#gid=SHEET_ID`

#### 構造（システム互換）:
```
A1-B2: ヘッダー（BONICA農産物管理システム・納品書）
B3-B6: 納品書情報（番号、日付、顧客、住所）
A10-D10: 明細ヘッダー（商品名、数量、単価、金額）
A11-D21: 明細データ行（10行分）
D22: 合計
B24: 備考
```

### 請求書テンプレート
- **シート名**: 請求書テンプレート
- **URL**: `https://docs.google.com/spreadsheets/d/1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY/edit#gid=SHEET_ID`

#### 構造（システム互換）:
```
A1-B2: ヘッダー（BONICA農産物管理システム・請求書）
B3-B8: 請求書情報（番号、日付、期限、顧客、住所、請求先）
A12-D12: 明細ヘッダー（項目、数量、単価、金額）
A13-D23: 明細データ行（10行分）
D24: 小計
D25: 消費税
D26: 合計
B28: 備考
```

## 🔍 実行後の確認事項

### 1. テンプレート作成確認
- 既存スプレッドシートに「納品書テンプレート」シートが追加される
- 既存スプレッドシートに「請求書テンプレート」シートが追加される

### 2. システム連携確認
```bash
# 本番環境でテンプレート確認
curl -H "Authorization: Bearer JWT_TOKEN" \
     "https://bonica-system2025-l17c87u1k-808worksjp-gmailcoms-projects.vercel.app/api/google-sheets/templates"
```

### 3. 環境変数更新（必要に応じて）
作成されたシートIDを以下の環境変数として追加:
```bash
GOOGLE_SHEETS_DELIVERY_SHEET_ID="生成されたシートID"
GOOGLE_SHEETS_INVOICE_SHEET_ID="生成されたシートID"
```

## 🛠️ トラブルシューティング

### 権限エラーの場合
1. Google Sheets APIが有効になっているか確認
2. サービスアカウントに適切な権限が付与されているか確認
3. スプレッドシートにサービスアカウントがアクセス可能か確認

### 環境変数エラーの場合
1. Vercel Dashboard → Environment Variables を確認
2. 以下の変数が正しく設定されているか確認:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` または `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` または `GOOGLE_SHEETS_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID` または `GOOGLE_SHEETS_SPREADSHEET_ID`

### API呼び出しエラーの場合
1. Vercelのデプロイが完了しているか確認
2. 認証保護が無効になっているか確認
3. APIエンドポイントのパスが正しいか確認

## 📝 実装済みファイル一覧

### 自動作成スクリプト
- `scripts/create-google-sheets-templates.ts` - メインテンプレート作成スクリプト
- `scripts/create-templates-production.ts` - 本番環境実行用
- `scripts/execute-production-template-creation.ts` - 包括的実行スクリプト

### APIエンドポイント
- `app/api/create-templates/route.ts` - シンプルなテンプレート作成API
- `app/api/admin/create-google-sheets-templates/route.ts` - 管理者用API

### ドキュメント
- `docs/google-sheets-template-deployment.md` - 詳細デプロイメントガイド
- `GOOGLE_SHEETS_TEMPLATE_SETUP.md` - この実行ガイド

## ✅ 次のステップ

1. **上記のオプション1-3のいずれかを実行**
2. **テンプレート作成が完了したら確認**
3. **システムでの動作テスト**

すべての実装は完了しており、実行するだけでGoogle Sheetsテンプレートが利用可能になります。

---

**作成日**: 2025年9月17日
**対象システム**: BONICA農産物管理システム
**ステータス**: 実行準備完了