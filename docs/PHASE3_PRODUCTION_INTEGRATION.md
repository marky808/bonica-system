# Phase 3: 本番環境統合ガイド

## 概要

新しい9列構造のGoogle Sheetsテンプレート（V2）を本番環境に統合する手順です。

## 前提条件

- Phase 1: テンプレート作成完了 ✅
- Phase 2: システム統合完了 ✅
- 新しいテンプレートID:
  - 請求書: `1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E`
  - 納品書: `19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4`

## ステップ1: 環境変数の設定

### Vercelダッシュボードでの設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を追加:

#### 新規追加する環境変数

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID` | `1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E` | Production |
| `GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID` | `19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4` | Production |

### CLI での設定（オプション）

```bash
# 請求書テンプレートID
echo "1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E" | vercel env add GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID production

# 納品書テンプレートID
echo "19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4" | vercel env add GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID production
```

### ローカル環境での設定

`.env.local` ファイルに追加:

```bash
GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID="1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E"
GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID="19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4"
```

## ステップ2: APIエンドポイントの更新

### 変更ファイル

1. `/app/api/google-sheets/create-invoice/route.ts`
2. `/app/api/google-sheets/create-delivery/route.ts`

### 変更内容

#### 請求書API（create-invoice/route.ts）

**変更前:**
```typescript
// 旧テンプレートID環境変数を使用
templateId = process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID;

// 旧V1メソッドを使用
const result = await googleSheetsClient.createInvoiceSheet(invoiceData, templateId);
```

**変更後:**
```typescript
// 新テンプレートID環境変数を使用（優先）、なければ旧版にフォールバック
templateId = process.env.GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID
  || process.env.GOOGLE_SHEETS_INVOICE_TEMPLATE_SHEET_ID;

// 新V2メソッドを使用
const result = await googleSheetsClient.createInvoiceSheetV2(invoiceDataV2, templateId);
```

#### 納品書API（create-delivery/route.ts）

**変更前:**
```typescript
// 旧テンプレートID環境変数を使用
templateId = process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;

// 旧V1メソッドを使用
const result = await googleSheetsClient.createDeliverySheet(deliveryData, templateId);
```

**変更後:**
```typescript
// 新テンプレートID環境変数を使用（優先）、なければ旧版にフォールバック
templateId = process.env.GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID
  || process.env.GOOGLE_SHEETS_DELIVERY_TEMPLATE_SHEET_ID;

// 新V2メソッドを使用
const result = await googleSheetsClient.createDeliverySheetV2(deliveryDataV2, templateId);
```

## ステップ3: データ構造の変換

V1からV2へのデータ構造変換が必要です。

### 請求書データ変換

```typescript
// V1データからV2データへの変換
function convertInvoiceDataToV2(v1Data: InvoiceData): InvoiceDataV2 {
  return {
    invoice_number: v1Data.invoice_number,
    invoice_date: v1Data.invoice_date,
    customer_name: v1Data.customer_name,
    customer_address: v1Data.customer_address,
    items: v1Data.items.map(item => ({
      date: formatDateToMMDD(item.delivery_date || v1Data.invoice_date),
      product_name: item.description,
      unit_price: item.unit_price,
      quantity: item.quantity,
      unit: item.unit || 'kg',
      tax_rate: item.tax_rate === 8 ? '8%' : '10%',
      notes: ''
    }))
  };
}

function formatDateToMMDD(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}
```

### 納品書データ変換

```typescript
// V1データからV2データへの変換
function convertDeliveryDataToV2(v1Data: DeliveryData): DeliveryDataV2 {
  return {
    delivery_number: v1Data.delivery_number,
    delivery_date: v1Data.delivery_date,
    customer_name: v1Data.customer_name,
    customer_address: v1Data.customer_address,
    items: v1Data.items.map(item => ({
      date: formatDateToMMDD(item.delivery_date || v1Data.delivery_date),
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      unit: item.unit || 'kg',
      tax_rate: item.tax_rate === 8 ? '8%' : '10%',
      notes: ''
    }))
  };
}
```

## ステップ4: デプロイ

### デプロイコマンド

```bash
# Vercelにデプロイ
vercel --prod

# または、GitHubにプッシュして自動デプロイ
git add .
git commit -m "feat: Phase 3 - 新9列テンプレート（V2）を本番環境に統合"
git push origin main
```

## ステップ5: テスト

### ローカルテスト

```bash
# 開発サーバー起動
npm run dev

# テストスクリプト実行
npx tsx scripts/test-new-template.ts
```

### 本番環境テスト

1. 本番環境で納品書を作成
2. 作成されたGoogle Sheetsを確認:
   - 数量列（D列）: 整数は小数点なし、小数は小数点あり
   - 税抜金額列（G列）: 計算式が正しく動作
   - 消費税列（H列）: 計算式が正しく動作
   - 税率別集計: 8%/10%の集計が正しい
   - 合計金額: 正しく計算されている

3. 本番環境で請求書を作成し、同様に確認

## ステップ6: ロールバックプラン

問題が発生した場合、以下の手順で旧バージョンに戻せます:

### 環境変数のフォールバック

コードは旧環境変数へのフォールバックを実装しているため、新しい環境変数を削除するだけで旧版に戻ります:

```bash
# Vercelダッシュボードで以下を削除
GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID
GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID
```

### コードのロールバック

```bash
git revert <commit-hash>
git push origin main
```

## トラブルシューティング

### 問題: テンプレートが見つかりません

**原因:** テンプレートIDが正しく設定されていない

**解決策:**
1. Vercelダッシュボードで環境変数を確認
2. テンプレートIDに余分な空白や改行がないか確認
3. テンプレートの共有設定を確認（OAuth2認証でアクセス可能か）

### 問題: 認証エラーが発生する

**原因:** OAuth 2.0認証情報が設定されていない

**解決策:**
1. 以下の環境変数が設定されているか確認:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REFRESH_TOKEN`
2. トークンの有効期限を確認

### 問題: 数量の小数点が常に表示される

**原因:** データが小数形式（10.00）で送信されている

**解決策:**
- 整数の場合は小数なしで送信: `quantity: 10` (not `10.00`)
- 小数の場合は小数あり: `quantity: 10.5`

## チェックリスト

Phase 3完了の確認:

- [ ] 環境変数を本番環境に設定
- [ ] APIエンドポイントをV2メソッドに更新
- [ ] データ変換ロジックを実装
- [ ] ローカル環境でテスト成功
- [ ] 本番環境にデプロイ
- [ ] 本番環境でテスト実行
- [ ] 納品書作成の動作確認
- [ ] 請求書作成の動作確認
- [ ] 計算式の正確性を確認
- [ ] 数量表示の正確性を確認（整数は小数点なし）
- [ ] ロールバックプランを準備

## 次のステップ（Phase 4）

すべてのテストが成功したら:

1. 旧テンプレート（V1）を段階的に廃止
2. 旧環境変数を削除
3. V1メソッドをdeprecated化
4. ドキュメントを更新

---

**作成日**: 2025年11月15日
**バージョン**: 1.0
**担当**: Claude Code
