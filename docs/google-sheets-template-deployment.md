# Google Sheetsテンプレート作成・デプロイメントガイド

## 概要

BONICA農産物管理システム用のGoogle Sheetsテンプレート（納品書・請求書）を自動作成するためのデプロイメントガイドです。

## 前提条件

### 必要な環境変数

本番環境で以下の環境変数が設定されている必要があります：

```bash
# Google Sheets API設定
GOOGLE_SHEETS_SPREADSHEET_ID="your-existing-spreadsheet-id"
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID="your-project-id"
```

## 実行方法

### 1. 本番環境での実行

本番環境（Vercel）で直接実行する場合：

```bash
# Vercel CLIを使用
vercel env pull .env.production
npx tsx scripts/create-google-sheets-templates.ts
```

### 2. ローカル環境での実行（本番設定使用）

```bash
# 本番環境変数を取得
vercel env pull .env.production

# 環境変数を読み込んで実行
NODE_ENV=production npx tsx scripts/create-google-sheets-templates.ts
```

### 3. SSH経由での本番実行

```bash
# 本番サーバーにアクセス（該当する場合）
ssh production-server
cd /path/to/bonica-system
npx tsx scripts/create-google-sheets-templates.ts
```

## 作成されるテンプレート

### 納品書テンプレート
- **ファイル名**: BONICA納品書テンプレート
- **構造**: システムのupdateDeliverySheet()メソッドに対応
- **セル配置**:
  - B1-B2: ヘッダー（BONICA農産物管理システム・納品書）
  - B3-B6: 納品書情報（番号、日付、顧客、住所）
  - A10-D10: 明細ヘッダー（商品名、数量、単価、金額）
  - A11-D21: 明細データ行（10行分）
  - D22: 合計

### 請求書テンプレート
- **ファイル名**: BONICA請求書テンプレート
- **構造**: システムのupdateInvoiceSheet()メソッドに対応
- **セル配置**:
  - B1-B2: ヘッダー（BONICA農産物管理システム・請求書）
  - B3-B8: 請求書情報（番号、日付、期限、顧客、住所、請求先）
  - A12-D12: 明細ヘッダー（項目、数量、単価、金額）
  - A13-D23: 明細データ行（10行分）
  - D24: 小計
  - D25: 消費税
  - D26: 合計

## 実行結果

スクリプト実行後、以下が生成されます：

1. **新しいGoogle Sheetsテンプレート** × 2個
2. **google-sheets-template-ids.env** - 環境変数設定ファイル
3. **コンソール出力** - テンプレートID・URL一覧

### 環境変数更新

生成された`google-sheets-template-ids.env`の内容を本番環境に追加：

```bash
# 生成されるファイル内容例
GOOGLE_SHEETS_DELIVERY_TEMPLATE_ID="1ABC...XYZ"
GOOGLE_SHEETS_INVOICE_TEMPLATE_ID="1DEF...UVW"
```

## トラブルシューティング

### 認証エラー
```bash
❌ Google Sheets認証情報が設定されていません
```
**解決策**: 環境変数が正しく設定されているか確認

### スプレッドシートID未設定
```bash
❌ GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません
```
**解決策**: 既存のBONICA農産物管理データスプレッドシートのIDを設定

### API権限エラー
```bash
❌ 権限がありません
```
**解決策**: Google Sheets APIとGoogle Drive APIが有効になっているか確認

## 検証方法

### 1. テンプレート作成確認

```bash
# 生成されたテンプレートIDでアクセステスト
curl "https://docs.google.com/spreadsheets/d/{TEMPLATE_ID}/edit"
```

### 2. システム連携テスト

```bash
# 本番環境でGoogle Sheets連携テスト
curl -H "Authorization: Bearer {JWT_TOKEN}" \
     "{PRODUCTION_URL}/api/google-sheets/templates"
```

### 3. 環境変数確認

```bash
# 本番環境で環境変数が正しく設定されているか確認
vercel env ls
```

## 注意事項

1. **既存データ保護**: 既存のスプレッドシートにテンプレートシートが追加されます
2. **権限設定**: 作成されたテンプレートは自動的に適切な権限が設定されます
3. **バックアップ**: 実行前に既存のスプレッドシートをバックアップしてください
4. **一度限り実行**: 同じテンプレートを重複作成しないよう注意してください

## 完了後の確認事項

- [ ] 納品書テンプレートが正常に作成された
- [ ] 請求書テンプレートが正常に作成された
- [ ] 環境変数にテンプレートIDが追加された
- [ ] システムからテンプレートにアクセス可能
- [ ] 本番環境でGoogle Sheets連携が動作する

---

**作成日**: 2025年9月16日
**対象システム**: BONICA農産物管理システム
**スクリプト**: scripts/create-google-sheets-templates.ts