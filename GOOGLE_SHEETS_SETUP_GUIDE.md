# Google Sheets 連携セットアップガイド

## 🔍 診断により発見された問題

### 1. 請求書テンプレートへのアクセス権限がない
- 請求書スプレッドシート (`1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ`) がサービスアカウントと共有されていません
- このため、請求書の自動作成が失敗しています

### 2. サービスアカウントのストレージ容量超過
- サービスアカウントがテンプレートをコピーすると、コピーされたファイルがサービスアカウントのDriveに保存されます
- 無料のGoogleアカウントは15GBの制限があり、この制限に達しています
- 納品書・請求書の作成時に "storage quota exceeded" エラーが発生します

## ✅ 解決手順

### ステップ1: 請求書テンプレートをサービスアカウントと共有

1. 請求書スプレッドシートを開く:
   https://docs.google.com/spreadsheets/d/1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ/edit

2. 右上の「共有」ボタンをクリック

3. 以下のサービスアカウントのメールアドレスを追加:
   ```
   bonica-sheets@bonica-management-system.iam.gserviceaccount.com
   ```

4. 権限を「編集者」に設定

5. 「送信」をクリック

### ステップ2: ストレージ容量問題の解決

以下のいずれかの方法を選択してください:

#### 方法A: 共有ドライブを使用（推奨）

1. Google Workspace アカウントで共有ドライブを作成
2. テンプレートファイルを共有ドライブに移動
3. サービスアカウントに共有ドライブへのアクセス権限を付与
4. 作成されたファイルは共有ドライブに保存され、個人のストレージを消費しません

**注**: 共有ドライブは Google Workspace (有料プラン) でのみ利用可能です

#### 方法B: 古いファイルを定期的に削除

納品書・請求書の作成後、古いファイルを手動または自動で削除します。

クリーンアップスクリプトを実行:
```bash
npx tsx scripts/cleanup-service-account-drive.ts
```

#### 方法C: ファイル作成時に所有権を移譲

サービスアカウントで作成したファイルの所有権をメインユーザーに移譲することで、サービスアカウントのストレージを解放できます。

ただし、この方法は現在のコードには実装されていません。実装が必要な場合は、以下のコードを追加してください:

```typescript
// ファイル作成後、所有権を移譲
await drive.permissions.create({
  fileId: newFileId,
  requestBody: {
    role: 'writer',
    type: 'user',
    emailAddress: 'bonicasystem@gmail.com',  // 移譲先のメールアドレス
  },
  transferOwnership: true,
});
```

#### 方法D: サービスアカウントのストレージをアップグレード

Google One などでサービスアカウントのストレージ容量を増やします。

## 🧪 テスト手順

修正後、以下のスクリプトで動作確認できます:

```bash
# 診断スクリプト実行
npx tsx scripts/diagnose-sheets-issue.ts

# テンプレートID確認
npx tsx scripts/verify-template-ids.ts
```

## 📝 環境変数の確認

`.env.local` ファイルに以下の設定があることを確認してください:

```env
GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID="1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY"
GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID="1_zOTChDJsjrKFtNMAKezlFe0N4ZmEz9WV1Ypc4NsVxQ"
GOOGLE_SHEETS_CLIENT_EMAIL="bonica-sheets@bonica-management-system.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID="bonica-management-system"
```

## 🎯 改善されたエラーハンドリング

コードに以下の改善を実装しました:

### 1. ストレージ容量エラーの検出
```typescript
if (errorMessage.includes('storage quota') || errorMessage.includes('storageQuotaExceeded')) {
  throw new GoogleSheetsError(
    'サービスアカウントのGoogle Driveストレージ容量が不足しています。不要なファイルを削除するか、管理者に連絡してください。',
    copyError,
    GoogleSheetsErrorCode.PERMISSION_DENIED
  );
}
```

### 2. 詳細なログ出力
- ファイルコピー時のエラー詳細
- テンプレートIDの検証
- 各ステップの成功/失敗状態

### 3. より広いDriveスコープ
```typescript
scopes: [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'  // drive.file から drive に変更
]
```

## ⚠️ 重要な注意事項

1. **テンプレートIDはファイルID**: 環境変数に設定するのは、スプレッドシートのファイルID（URLの`/d/`の後の部分）であり、シートID（`gid=`の後の数字）ではありません

2. **サービスアカウントの権限**: サービスアカウントには「編集者」権限が必要です。「閲覧者」では不十分です

3. **定期的なメンテナンス**: ストレージ容量を管理するため、定期的に古いファイルをクリーンアップしてください

## 🚀 次のステップ

1. ✅ 請求書テンプレートをサービスアカウントと共有
2. ✅ ストレージ容量問題の解決方法を選択・実装
3. ✅ テストスクリプトで動作確認
4. ✅ 実際に納品書・請求書を作成してテスト

## 📞 サポート

問題が解決しない場合は、以下の情報を含めてお問い合わせください:

- エラーメッセージ
- 診断スクリプトの出力結果
- 実行したステップ
