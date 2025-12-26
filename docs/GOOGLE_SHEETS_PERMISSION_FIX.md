# 納品書作成エラーの解決方法

## 問題

納品書を作成しようとすると「テンプレートが作成されていない」または「アクセス権限エラー」が発生します。

## 原因

Google Sheetsのテンプレートファイルに、サービスアカウント (`bonica-sheets@bonica-management-system.iam.gserviceaccount.com`) がアクセスできない状態になっています。

エラーメッセージ:
```
Method doesn't allow unregistered callers (callers without established identity).
Please use API Key or other form of API consumer identity to call this API.
```

## 解決方法

### 手順1: Google Sheetsでテンプレートファイルを開く

1. 以下のURLをブラウザで開いてください：
   ```
   https://docs.google.com/spreadsheets/d/1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY
   ```

2. ファイルが開けない場合は、テンプレートファイルが削除されているか、アクセス権限がありません。その場合は「手順3: 新しいテンプレートを作成」に進んでください。

### 手順2: サービスアカウントに共有権限を付与

1. Google Sheetsの画面右上にある「共有」ボタンをクリック

2. 「ユーザーやグループを追加」の欄に以下のメールアドレスを入力：
   ```
   bonica-sheets@bonica-management-system.iam.gserviceaccount.com
   ```

3. 権限を「編集者」に設定

4. 「通知しない」のチェックボックスをONにする（サービスアカウントなので通知不要）

5. 「送信」または「完了」をクリック

6. 同じ手順を、請求書テンプレートでも実施：
   ```
   https://docs.google.com/spreadsheets/d/1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ
   ```

### 手順3: 新しいテンプレートを作成（手順1でファイルが開けない場合）

テンプレートファイルが見つからない場合は、新しく作成する必要があります。

#### オプションA: 手動で作成

1. **新しいGoogle Spreadsheetsを作成**
   - Google Driveで「新規」→「Google スプレッドシート」

2. **納品書テンプレートの構造を作成**
   ```
   A1: 空白
   B1: BONICA農産物管理システム
   B2: 納品書
   B3: 納品書番号:
   B4: 納品日:
   B5: お客様:
   B6: 住所:

   A10: 商品名
   B10: 数量
   C10: 単価
   D10: 金額

   （11-20行: 明細データエリア）

   D22: 合計
   B24: 備考:
   ```

3. **ファイルをサービスアカウントに共有**
   - 「共有」ボタンをクリック
   - `bonica-sheets@bonica-management-system.iam.gserviceaccount.com` を「編集者」として追加

4. **URLからスプレッドシートIDを取得**
   ```
   https://docs.google.com/spreadsheets/d/【このID部分】/edit
   ```

5. **.env.localを更新**
   ```bash
   GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID="取得したID"
   ```

6. **開発サーバーを再起動**

#### オプションB: 既存のスプレッドシートを使用

すでに「BONICA農産物管理データ」というスプレッドシートがある場合：

1. そのスプレッドシートを開く

2. 「納品書テンプレート」という名前の新しいシートを追加

3. テンプレートの構造を作成（上記参照）

4. スプレッドシート全体をサービスアカウントに共有

5. スプレッドシートのIDを環境変数に設定

### 手順4: 権限が正しく設定されたか確認

以下のコマンドで確認：

```bash
npx tsx scripts/test-sheets-access.ts
```

成功すると以下のように表示されます：
```
✅ アクセス成功!
📊 スプレッドシート名: BONICA農産物管理データ
📄 シート一覧:
  - 納品書テンプレート (ID: 123456)
```

### 手順5: 納品書作成をテスト

1. アプリケーションにログイン

2. 納品管理画面に移動

3. 既存の納品データで「Google Sheets納品書作成」ボタンをクリック

4. エラーが出ずに納品書が作成されることを確認

## トラブルシューティング

### 「403 Forbidden」エラーが続く場合

1. **Google Cloud ConsoleでAPIが有効になっているか確認**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - プロジェクト「bonica-management-system」を選択
   - 「APIとサービス」→「有効なAPI」
   - 以下のAPIが有効になっているか確認：
     - Google Sheets API
     - Google Drive API

2. **サービスアカウントのキーが正しいか確認**
   ```bash
   cat .env.local | grep GOOGLE_SHEETS_CLIENT_EMAIL
   cat .env.local | grep GOOGLE_SHEETS_PRIVATE_KEY | head -c 100
   ```

3. **スプレッドシートの共有設定を再確認**
   - 「共有」→「詳細設定」
   - サービスアカウントが「編集者」として表示されているか確認

### 「404 Not Found」エラーが出る場合

1. スプレッドシートIDが正しいか確認
2. ファイルが削除されていないか確認
3. 新しいテンプレートを作成（手順3参照）

## まとめ

最も重要なのは、**Google Sheetsのテンプレートファイルにサービスアカウントの編集権限を付与すること**です。

1. テンプレートファイルを開く
2. 「共有」ボタンをクリック
3. `bonica-sheets@bonica-management-system.iam.gserviceaccount.com` を編集者として追加
4. システムで納品書作成をテスト

---

**重要な情報:**
- サービスアカウント: `bonica-sheets@bonica-management-system.iam.gserviceaccount.com`
- 納品書テンプレートID: `1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY`
- 請求書テンプレートID: `1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ`
