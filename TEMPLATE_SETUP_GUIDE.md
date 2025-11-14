# 納品書テンプレート設定ガイド

## 問題

納品書を作成しようとすると「テンプレートが作成されていない」というエラーが表示される。

## 原因

環境変数 `GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID` が設定されていないため。

## 解決方法

### 方法1: テンプレートAPIを使って自動作成（推奨・最も簡単）

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザで以下のURLにアクセス**

   開発環境の場合:
   ```
   http://localhost:3000/api/google-sheets/templates
   ```

   本番環境の場合:
   ```
   https://your-production-url/api/google-sheets/templates
   ```

   GET リクエストで現在のテンプレート状況を確認できます。

3. **テンプレートを作成**

   以下のコマンドでテンプレートを作成:
   ```bash
   curl -X POST http://localhost:3000/api/google-sheets/templates \
     -H "Content-Type: application/json" \
     -d '{"createSheets": true}'
   ```

   または、ブラウザの開発者ツール（Console）で実行:
   ```javascript
   fetch('/api/google-sheets/templates', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ createSheets: true })
   }).then(r => r.json()).then(console.log)
   ```

4. **レスポンスから環境変数を取得**

   成功すると、以下のような形式でテンプレートIDが返されます:
   ```json
   {
     "status": "success",
     "envConfig": {
       "GOOGLE_SHEETS_DELIVERY_SHEET_ID": "123456789",
       "GOOGLE_SHEETS_INVOICE_SHEET_ID": "987654321"
     }
   }
   ```

5. **環境変数を設定**

   `.env.local`ファイルに以下を追加:
   ```bash
   GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID=123456789
   GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID=987654321
   ```

   **本番環境の場合**: Vercel Dashboardで環境変数を設定

6. **開発サーバーを再起動**
   ```bash
   # Ctrl+Cで停止してから再度起動
   npm run dev
   ```

### 方法2: 既存のGoogle Sheetsからシートを作成

すでにGoogle Sheetsスプレッドシートがある場合:

1. **Google Sheetsを開く**

   環境変数 `GOOGLE_SHEETS_SPREADSHEET_ID` で指定されているスプレッドシートを開きます。

2. **新しいシートを追加**

   - 「納品書テンプレート」という名前のシートを作成
   - 「請求書テンプレート」という名前のシートを作成

3. **シートIDを確認**

   シートのURLから取得:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=SHEET_ID
                                                                    ^^^^^^^^
                                                                    これがシートID
   ```

4. **環境変数を設定**

   `.env.local`に追加:
   ```bash
   GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID=納品書テンプレートのシートID
   GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID=請求書テンプレートのシートID
   ```

### 方法3: スクリプトで作成（開発者向け）

環境変数が設定済みの環境で実行:

```bash
npx tsx scripts/create-google-sheets-templates.ts
```

生成された `google-sheets-template-ids.env` の内容を `.env.local` にコピーします。

## 確認方法

テンプレートが正しく設定されているか確認:

1. **環境変数確認**
   ```bash
   # 開発環境
   cat .env.local | grep GOOGLE_SHEETS
   ```

2. **APIで確認**
   ```bash
   curl http://localhost:3000/api/google-sheets/templates
   ```

   または

   ```javascript
   // ブラウザのConsoleで
   fetch('/api/google-sheets/templates').then(r => r.json()).then(console.log)
   ```

3. **納品書作成テスト**

   納品管理画面から「Google Sheets納品書作成」ボタンをクリックして、エラーが出ないことを確認。

## トラブルシューティング

### 「テンプレートが作成されていない」エラーが続く場合

1. 開発サーバーを再起動
2. ブラウザのキャッシュをクリア
3. 環境変数が正しく設定されているか再確認

### Google Sheets APIのエラーが出る場合

必要な環境変数がすべて設定されているか確認:
- `GOOGLE_SHEETS_SPREADSHEET_ID` または `GOOGLE_SHEET_ID`
- `GOOGLE_SHEETS_CLIENT_EMAIL` または `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY` または `GOOGLE_PRIVATE_KEY`

## まとめ

最も簡単な方法は**方法1**です。開発サーバーを起動して、ブラウザから以下を実行:

```javascript
fetch('/api/google-sheets/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ createSheets: true })
}).then(r => r.json()).then(data => {
  console.log('✅ テンプレート作成成功!');
  console.log('以下を.env.localに追加してください:');
  console.log(`GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID=${data.envConfig.GOOGLE_SHEETS_DELIVERY_SHEET_ID}`);
  console.log(`GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID=${data.envConfig.GOOGLE_SHEETS_INVOICE_SHEET_ID}`);
})
```
