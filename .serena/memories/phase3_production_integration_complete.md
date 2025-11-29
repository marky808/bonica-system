# Phase 3: 新9列テンプレート本番環境統合 - 完了報告

## 実施日時
2025年11月15日

## 概要
新しい9列構造のGoogle Sheetsテンプレート（V2）を本番環境に統合し、デプロイまで完了しました。

## 完了した作業

### 1. 数量列の小数点表示問題の修正
**問題**: テストデータで数量が `5.00`, `10.00` のように小数点付きで表示されていた

**解決策**: 
- テストデータを整数は `5`, `10`, `1` のように小数点なしに修正
- 小数は `2.5`, `5.5` のように明示的に小数点を含める
- テンプレートの数値フォーマット `#,##0.##` はそのまま（正しく動作）

**修正ファイル**: 
- `scripts/test-new-template.ts`

### 2. V2 APIエンドポイント作成
新しい9列構造テンプレート専用のAPIエンドポイントを作成

**作成ファイル**:
- `app/api/google-sheets/create-invoice-v2/route.ts`
  - 請求書作成API（V2）
  - 環境変数: `GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID`
  - インターフェース: `InvoiceDataV2`
  - メソッド: `createInvoiceSheetV2()`

- `app/api/google-sheets/create-delivery-v2/route.ts`
  - 納品書作成API（V2）
  - 環境変数: `GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID`
  - インターフェース: `DeliveryDataV2`
  - メソッド: `createDeliverySheetV2()`

**特徴**:
- 既存V1 APIと並行稼働（後方互換性維持）
- 環境変数で新旧テンプレートを切り替え可能
- エラーハンドリングとログを強化

### 3. データ構造の変更（V1 → V2）

**V2の特徴**:
```typescript
interface InvoiceDataV2 {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_address?: string;
  items: {
    date: string;              // MM/DD形式
    product_name: string;
    unit_price: number;
    quantity: number;          // 整数は10、小数は10.5
    unit: string;              // kg, 袋, 箱など
    tax_rate: string;          // "8%" or "10%"
    notes?: string;
  }[];
}
```

**V1との主な違い**:
- 税抜金額（G列）と消費税（H列）はスプレッドシートの数式で自動計算
- APIでは入力データ（A-F列、I列）のみ送信
- 日付は MM/DD 形式に変換

### 4. Vercel環境変数設定

**追加した環境変数** (Production環境):
```bash
GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID="1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E"
GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID="19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4"
```

**設定方法**:
```bash
printf "1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E" | vercel env add GOOGLE_SHEETS_NEW_INVOICE_TEMPLATE_SHEET_ID production
printf "19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4" | vercel env add GOOGLE_SHEETS_NEW_DELIVERY_TEMPLATE_SHEET_ID production
```

### 5. Gitコミット＆デプロイ

**コミット**:
- コミットID: `dec09e9`
- コミットメッセージ: "feat: Phase 3 - 新9列テンプレート（V2）本番統合"
- 変更ファイル: 9ファイル（3686行追加、1行削除）

**デプロイ**:
- デプロイID: `dpl_C4EvbrfLmEsCA7j43G7LV7j4vrW2`
- ステータス: ● Ready (正常稼働中)
- デプロイ時刻: 2025-11-15 21:47:48 UTC
- ビルド時間: 約1分
- 本番URL: https://bonica-system.vercel.app

### 6. ドキュメント作成

**作成したドキュメント**:
- `docs/PHASE3_PRODUCTION_INTEGRATION.md`
  - 環境変数設定手順
  - APIエンドポイント更新手順
  - データ変換ロジック
  - デプロイ手順
  - テスト手順
  - トラブルシューティング
  - ロールバックプラン

## テンプレート情報

### 請求書テンプレート
- **テンプレートID**: `1xjRbRELuUKx5uKVctt6M8jugHZrxQXetoxCabACOz-E`
- **シート名**: 請求書テンプレート
- **構造**: 9列（日付、品名、単価、数量、単位、税率、税抜金額、消費税、備考）
- **作成スクリプト**: `scripts/create-new-invoice-template.ts`

### 納品書テンプレート
- **テンプレートID**: `19ozm2YlEG2QIcGWPKc-nPfXCbE48JKPNWdiut4txqV4`
- **シート名**: 納品書テンプレート
- **構造**: 9列（同上）
- **作成スクリプト**: `scripts/create-new-delivery-template.ts`

### 会社情報（テンプレートに埋め込み済み）
- 法人番号: T9030001039654
- 会社名: 株式会社　ボニカ・アグリジェント
- 住所: 〒341-0035 埼玉県三郷市鷹野4-441
- TEL: 048-954-6891
- FAX: 048-954-6892

### 振込先情報（テンプレートに埋め込み済み）
- 銀行名: 朝日信用金庫
- 支店名: 三郷支店
- 口座種別: 普通
- 口座番号: 0430910
- 口座名義: カ)ボニカ・アグリジェント

## テスト結果

### ローカル環境テスト
**実行コマンド**: `npx tsx scripts/test-new-template.ts`

**結果**: ✅ 成功

**作成されたスプレッドシート**:
- 請求書: https://docs.google.com/spreadsheets/d/1acLOec7xE1Fr1BQziFj1XSjXQ2Q3IzhRfq04jgZacFE
- 納品書: https://docs.google.com/spreadsheets/d/14r4kmWsbAZPJt79UR4J2aCzU1KITP4feVzbrsVWe2R8

**確認項目**:
- ✅ 数量列（D列）: 整数は小数点なし、小数は小数点あり
- ✅ 税抜金額（G列）: 計算式 `=C*D` が正しく動作
- ✅ 消費税（H列）: 計算式が正しく動作
- ✅ 税率別集計: 8%/10%の集計が正しい
- ✅ 合計金額: 正しく計算されている
- ✅ 会社情報: 正式な情報が表示
- ✅ 振込先情報: 表示されている

### 本番環境デプロイ
**ステータス**: ✅ デプロイ完了

**次のテスト**: 本番環境でシステムUIから納品書・請求書を作成して動作確認

## 作成・修正したファイル一覧

### 新規作成
1. `app/api/google-sheets/create-invoice-v2/route.ts` - 請求書V2 API
2. `app/api/google-sheets/create-delivery-v2/route.ts` - 納品書V2 API
3. `scripts/create-new-invoice-template.ts` - 請求書テンプレート作成スクリプト
4. `scripts/create-new-delivery-template.ts` - 納品書テンプレート作成スクリプト
5. `scripts/update-template-company-info.ts` - 会社情報更新スクリプト
6. `scripts/update-template-bank-info.ts` - 振込先情報更新スクリプト
7. `scripts/test-new-template.ts` - テストスクリプト
8. `docs/PHASE3_PRODUCTION_INTEGRATION.md` - 統合ドキュメント

### 修正
1. `lib/google-sheets-client.ts` - V2インターフェースとメソッドを追加
   - `DeliveryDataV2` インターフェース
   - `InvoiceDataV2` インターフェース
   - `createDeliverySheetV2()` メソッド
   - `updateDeliverySheetV2()` メソッド
   - `createInvoiceSheetV2()` メソッド
   - `updateInvoiceSheetV2()` メソッド

## APIエンドポイント

### V2 APIエンドポイント（新規）

#### 請求書作成
```
POST /api/google-sheets/create-invoice-v2
```

**リクエストボディ**:
```json
{
  "customerId": "customer_id",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "templateId": "optional_override"
}
```

**レスポンス**:
```json
{
  "success": true,
  "invoiceId": "invoice_id",
  "sheetId": "spreadsheet_id",
  "url": "https://docs.google.com/spreadsheets/d/...",
  "pdfUrl": "https://...",
  "version": "V2",
  "totalAmount": 12345
}
```

#### 納品書作成
```
POST /api/google-sheets/create-delivery-v2
```

**リクエストボディ**:
```json
{
  "deliveryId": "delivery_id",
  "templateId": "optional_override"
}
```

**レスポンス**:
```json
{
  "success": true,
  "sheetId": "spreadsheet_id",
  "url": "https://docs.google.com/spreadsheets/d/...",
  "pdfUrl": "https://...",
  "version": "V2",
  "deliveryNumber": "DEL-12345678"
}
```

### V1 APIエンドポイント（既存・並行稼働）
- `/api/google-sheets/create-invoice` - 旧請求書API
- `/api/google-sheets/create-delivery` - 旧納品書API

## 技術的な詳細

### 認証方式
- **V2テンプレート**: OAuth 2.0認証のみ対応
- **V1テンプレート**: Service Account認証

### valueInputOption
- **V2**: `USER_ENTERED` - 数式を解釈させるため
- **V1**: `RAW` - 生データとして挿入

### 計算ロジック
**V1**: APIで計算してスプレッドシートに結果を挿入
```typescript
const itemSubtotal = item.unitPrice * item.quantity;
const itemTaxAmount = Math.floor(itemSubtotal * (item.taxRate / 100));
```

**V2**: スプレッドシートの数式で計算
```
G列（税抜金額）: =C列*D列
H列（消費税）: =G列*税率
```

### 数値フォーマット

#### 数量列（D列）
```typescript
numberFormat: {
  type: 'NUMBER',
  pattern: '#,##0.##'  // 小数点は必要な時のみ表示
}
```

#### 金額列（C, G, H列）
```typescript
numberFormat: {
  type: 'CURRENCY',
  pattern: '¥#,##0'  // 通貨記号付き、カンマ区切り
}
```

## 次のステップ（Phase 4の候補）

1. **本番環境での動作確認**
   - システムUIから納品書作成をテスト
   - システムUIから請求書作成をテスト
   - スプレッドシートの内容を確認

2. **V1からV2への完全移行（オプション）**
   - 既存APIエンドポイントをV2メソッドを呼ぶように変更
   - 環境変数のフォールバック処理
   - 段階的なロールアウト

3. **V1の廃止（将来）**
   - V2が安定稼働したらV1メソッドをdeprecated化
   - 旧環境変数の削除
   - ドキュメント更新

## トラブルシューティング

### 問題: テンプレートが見つかりません
**原因**: テンプレートIDが正しく設定されていない
**解決策**: 
```bash
vercel env ls | grep GOOGLE_SHEETS_NEW
```
で環境変数を確認

### 問題: 認証エラーが発生する
**原因**: OAuth 2.0認証情報が設定されていない
**解決策**: 
以下の環境変数が設定されているか確認:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`

### 問題: 数量の小数点が常に表示される
**原因**: データが小数形式（10.00）で送信されている
**解決策**: 整数の場合は小数なしで送信 `quantity: 10` (not `10.00`)

## 参考リンク

- **本番URL**: https://bonica-system.vercel.app
- **GitHub リポジトリ**: https://github.com/marky808/bonica-system
- **最新コミット**: dec09e9
- **デプロイID**: dpl_C4EvbrfLmEsCA7j43G7LV7j4vrW2

## メモ

- 開発サーバーが途中でダウンしたが、すべてのテストとデプロイは正常に完了
- V2 APIは既存のV1 APIと並行稼働しており、問題があればロールバック可能
- 環境変数の反映にはVercelの再デプロイが必要な場合がある
- 本番環境でのテストが次の重要なステップ

---

**作業完了日時**: 2025年11月15日 21:50 UTC
**作業者**: Claude Code
**ステータス**: ✅ Phase 3完了、本番デプロイ済み、本番テスト待ち
