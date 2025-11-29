# 請求先紐づけ機能の実装 (2025-11-25)

## 概要
納品先に請求先を紐づける機能を実装し、納品先と請求先が異なる場合に対応できるようにしました。

## 実装内容

### 1. データベーススキーマの変更
**ファイル**: `prisma/schema.prisma`

```prisma
model Customer {
  // 既存フィールド...
  billingCustomerId         String?
  billingCustomer           Customer?  @relation("BillingRelation", fields: [billingCustomerId], references: [id])
  deliveryCustomers         Customer[] @relation("BillingRelation")
}
```

- `billingCustomerId`: 請求先の顧客IDを参照するオプショナルフィールド
- 自己参照リレーション: 納品先が他の顧客を請求先として指定可能
- `prisma db push`でデータベースに反映済み

### 2. API型定義の更新
**ファイル**: `lib/api.ts`

```typescript
export interface Customer {
  // 既存フィールド...
  invoiceRegistrationNumber?: string
  invoiceNotes?: string
  billingCustomerId?: string | null
  billingCustomer?: Customer | null
}
```

### 3. APIエンドポイントの更新

#### GET /api/customers
**ファイル**: `app/api/customers/route.ts`

```typescript
const customers = await prisma.customer.findMany({
  include: {
    billingCustomer: {
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        phone: true,
        deliveryAddress: true,
        billingAddress: true,
        billingCycle: true,
        billingDay: true,
        paymentTerms: true,
        invoiceRegistrationNumber: true,
        invoiceNotes: true,
        createdAt: true,
        updatedAt: true,
      }
    },
  },
  orderBy: { companyName: 'asc' },
})
```

**重要**: 循環参照を防ぐため、`billingCustomer`を`select`で明示的に取得

#### POST /api/customers
- `billingCustomerId`を受け取り保存
- レスポンスに`billingCustomer`情報を含める（selectで循環参照回避）

#### PUT /api/customers/[id]
- `billingCustomerId`の更新をサポート
- バリデーションスキーマに`billingCustomerId: z.string().nullable().optional()`を追加

#### GET /api/customers/[id]
- 顧客詳細取得時に`billingCustomer`情報を含める

### 4. フロントエンドの実装
**ファイル**: `components/masters/customer-management.tsx`

#### フォームフィールド追加
```typescript
<FormField
  control={form.control}
  name="billingCustomerId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>請求先</FormLabel>
      <Select
        onValueChange={(value) => field.onChange(value === "_self" ? null : value)}
        value={field.value || "_self"}
      >
        <SelectContent>
          <SelectItem value="_self">この納品先に請求</SelectItem>
          {customers
            .filter(c => editingCustomer ? c.id !== editingCustomer.id : true)
            .map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.companyName}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

#### 一覧表示の更新
- **デスクトップビュー**: 請求先会社名を青色で表示、自社請求の場合は「自社請求」
- **モバイルビュー**: 請求先会社名と住所を表示

### 5. 循環参照問題の修正

#### 問題
`billingCustomer`を`include: { billingCustomer: true }`で取得すると、そのbillingCustomerも再びbillingCustomerを持つため、無限ループが発生しJSON化に失敗。

#### 解決策
全てのCustomer APIエンドポイントで、`billingCustomer`を取得する際に`select`を使用して必要なフィールドのみを明示的に指定。これにより循環参照を防止。

**影響**: この修正により、納品書作成時の顧客データ取得エラーが解消されました。

## デプロイ履歴

### コミット1: 請求先紐づけ機能の追加
- **コミットハッシュ**: `c13fd59`
- **日時**: 2025-11-25
- **内容**:
  - データベーススキーマ更新
  - API型定義更新
  - APIエンドポイント更新
  - フロントエンドUI追加

### コミット2: 循環参照問題の修正
- **コミットハッシュ**: `acb1256`
- **日時**: 2025-11-25
- **内容**:
  - Customer APIで`billingCustomer`をselectで取得
  - 循環参照を防止
  - 納品書作成エラーを解消

### 本番環境
- **URL**: https://bonica-system-j5zj2qkhp-808worksjp-gmailcoms-projects.vercel.app
- **デプロイ日**: 2025-11-25
- **ステータス**: 正常稼働中

## 使用方法

### 納品先に請求先を設定
1. マスタ管理 > 納品先管理
2. 納品先を新規登録または編集
3. 「請求先」ドロップダウンから以下を選択:
   - **この納品先に請求**: 自社請求（デフォルト）
   - **他の会社名**: 別の納品先を請求先として指定

### 一覧での確認
- 請求先列に、設定されている請求先会社名が表示される
- 自社請求の場合は「自社請求」と表示

## 技術的注意点

### 循環参照の防止
Prismaで自己参照リレーションを使用する場合、`include`ではなく`select`を使用して、必要なフィールドのみを明示的に取得すること。

**悪い例**:
```typescript
include: {
  billingCustomer: true  // 循環参照が発生
}
```

**良い例**:
```typescript
include: {
  billingCustomer: {
    select: {
      id: true,
      companyName: true,
      // 必要なフィールドのみ列挙
      // billingCustomerフィールドは含めない
    }
  }
}
```

### データベースマイグレーション
- `migration_lock.toml`のproviderを`sqlite`から`postgresql`に変更済み
- `prisma migrate dev`ではなく`prisma db push`を使用（既存のSQLiteマイグレーションとの競合を回避）

## 今後の改善案

1. **請求先の階層表示**: 請求先が複数階層になる場合の表示改善
2. **請求先変更の履歴管理**: 請求先変更履歴の記録
3. **一括設定機能**: 複数の納品先に対して同じ請求先を一括設定
4. **バリデーション強化**: 循環参照の防止（A→B→Aのような設定を防ぐ）

## 関連ファイル

### データベース
- `prisma/schema.prisma`
- `prisma/migrations/migration_lock.toml`

### バックエンド
- `app/api/customers/route.ts`
- `app/api/customers/[id]/route.ts`
- `lib/api.ts`

### フロントエンド
- `components/masters/customer-management.tsx`

## トラブルシューティング

### 納品書作成が失敗する
- **原因**: 循環参照によるJSON化エラー
- **解決**: `acb1256`のコミットで修正済み
- **確認方法**: ブラウザの開発者ツールでネットワークタブを確認

### データベース接続エラー
- **確認**: `.env.vercel.production`の`DATABASE_URL`が正しく設定されているか
- **再適用**: `prisma db push`を実行

## メンテナンス記録

| 日付 | 作業内容 | 担当 |
|------|---------|------|
| 2025-11-25 | 請求先紐づけ機能実装 | Claude Code |
| 2025-11-25 | 循環参照問題修正 | Claude Code |
