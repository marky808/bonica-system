# 本番運用準備完了報告 (2025-11-29)

## 概要
12月からの本番運用に向けて、セキュリティ修正と包括的テストを完了しました。

## 完了した作業

### 1. セキュリティ修正
- **ハードコードされた認証情報を削除**
  - `admin@bonica.jp`などの認証情報を全て環境変数参照に変更
  - 対象ファイル:
    - `prisma/seed.ts`
    - `app/api/admin/init/route.ts`
    - `app/api/health/route.ts`
- **デバッグAPIの削除**
  - `/api/debug/*`
  - `/api/debug-env`
- **不要ファイルの削除**: 104ファイル削除
  - 70+テストスクリプト（ハードコードされた認証情報含む）
  - 33MB analysisディレクトリ
  - 不要なドキュメント

### 2. 機能修正

#### 請求書の請求先（billingCustomer）対応
`app/api/google-sheets/create-invoice-v2/route.ts`を修正:
- 納品先と異なる請求先（billingCustomer）を設定した場合、請求書に正しい請求先情報が表示される
- 顧客取得時に`billingCustomer`リレーションを含める
- 請求書に`billingCompanyName`と`billingAddress`を使用

```typescript
// 顧客情報を取得（請求先情報を含む）
const customer = await prisma.customer.findUnique({
  where: { id: customerId },
  include: {
    billingCustomer: {
      select: {
        id: true,
        companyName: true,
        billingAddress: true,
        invoiceRegistrationNumber: true,
        invoiceNotes: true,
      }
    }
  }
});

// 請求先の決定: billingCustomerが設定されている場合はそちらを使用
const billingCompanyName = customer.billingCustomer
  ? customer.billingCustomer.companyName
  : customer.companyName;
```

#### 請求書番号の一意性修正
タイムスタンプを追加して重複を防止:
```typescript
const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${timestamp}`;
```

### 3. 本番準備テスト結果
全12テストがパス:

| テスト | 状態 |
|--------|------|
| 1. ログイン認証 | ✅ |
| 2. 納品先一覧取得 | ✅ |
| 3. 仕入れ先一覧取得 | ✅ |
| 5. 仕入れ一覧取得 | ✅ |
| 6. 利用可能な仕入れ取得 | ✅ |
| 7. 納品一覧取得 | ✅ |
| 8. 納品作成 | ✅ |
| 9. 納品書作成（Google Sheets） | ✅ |
| 10. 請求書作成（Google Sheets） | ✅ |
| 11. ダッシュボード統計取得 | ✅ |
| 12. 最近のアクティビティ取得 | ✅ |
| 13. レポートデータ取得 | ✅ |

### 4. テスト実行方法
```bash
TEST_EMAIL='xxx@example.com' TEST_PASSWORD='xxxx' npx tsx scripts/production-readiness-test.ts
```

## 残りのスクリプト（scripts/）
- `analyze-current-data.ts` - データ分析
- `create-comprehensive-test-data.ts` - テストデータ作成
- `create-google-sheets-templates.ts` - テンプレート作成
- `create-new-delivery-template.ts` - 納品書テンプレート
- `create-new-invoice-template.ts` - 請求書テンプレート
- `fix-purchase-quantities.ts` - 仕入れ数量修正
- `generate-report.ts` - レポート生成
- `get-oauth-refresh-token.ts` - OAuthトークン取得
- `production-readiness-test.ts` - 本番準備テスト
- `security-test.ts` - セキュリティテスト
- `seed-test-data.ts` - テストデータシード
- `update-template-bank-info.ts` - 銀行情報更新
- `update-template-company-info.ts` - 会社情報更新
- `verify-data-consistency.ts` - データ整合性検証

## 環境変数（必須）
本番運用には以下の環境変数が必要:
- `INITIAL_ADMIN_EMAIL` - 管理者メールアドレス
- `INITIAL_ADMIN_PASSWORD` - 管理者パスワード
- `INITIAL_ADMIN_NAME` - 管理者名（オプション、デフォルト: Admin）
- `JWT_SECRET` - JWT秘密鍵
- `DATABASE_URL` - データベース接続URL
- `GOOGLE_SHEETS_*` - Google Sheets API関連

## Google Sheets OAuth
最新のリフレッシュトークン（2025-11-29更新）:
- Vercel環境変数`GOOGLE_OAUTH_REFRESH_TOKEN`に設定済み
- 納品書・請求書作成は正常動作確認済み

## 次回作業時の注意
1. 新しいテストスクリプトを作成する場合は、認証情報をハードコードせず環境変数を使用すること
2. 請求先（billingCustomer）機能は実装済み - 納品先編集画面から設定可能
3. 本番テストは`scripts/production-readiness-test.ts`を使用
