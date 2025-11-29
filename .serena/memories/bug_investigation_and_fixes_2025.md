# バグ調査と修正記録 (2025年)

## 調査期間
開始: 2025年（セッション開始時）
完了: 2025年（本セッション）

## 調査の背景
ユーザーから「仕入れ管理から新規仕入れを作成しようとすると Application error が発生する」という報告を受け、システム全体のバグ調査を実施。

## 発見・修正したバグ

### 1. 仕入れフォームのNaNエラー
**ファイル**: `components/purchases/purchase-form.tsx`  
**場所**: Line 111  
**Commit**: 02710d1

**問題**:
```typescript
// 修正前（バグあり）
unitPrice: initialData?.unitPrice || initialData?.price / (initialData?.quantity || 1) || undefined
```
- 新規作成時（initialDataがundefined）に `undefined / 1` が評価され、NaNが発生
- React Hook FormがNaNをdefaultValueとして受け取れず、アプリケーションエラーが発生

**修正**:
```typescript
// 修正後
unitPrice: initialData?.unitPrice || (initialData?.price && initialData?.quantity ? initialData.price / initialData.quantity : undefined)
```
- priceとquantityの両方が存在する場合のみ除算を実行
- どちらかがundefinedの場合はundefinedを返す

**影響**: 新規仕入れ作成が完全に不可能になっていた（重大）  
**デプロイ**: ✅ 完了

---

### 2. 納品フォームのNaNエラー（4箇所）
**ファイル**: `components/deliveries/delivery-form.tsx`  
**場所**: Lines 356, 366, 386, 447  
**Commit**: 998f64b

**問題**: 仕入れフォームと同じNaNバグパターンが4箇所に存在

#### 箇所1: Line 356 (newItemData)
```typescript
// 修正前
unitPrice: purchase.unitPrice || (purchase.price / purchase.quantity)

// 修正後
unitPrice: purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0)
```
- TypeScript型エラーも修正: taxRate, deliveryDate, unit フィールドを追加

#### 箇所2: Line 366 (updatedItem)
```typescript
// 修正前
unitPrice: purchase.unitPrice || (purchase.price / purchase.quantity)

// 修正後
unitPrice: purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0)
```

#### 箇所3: Line 386 (表示用formatCurrency)
```typescript
// 修正前
単価: {formatCurrency(purchase.unitPrice || (purchase.price / purchase.quantity))}

// 修正後
単価: {formatCurrency(purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0))}
```

#### 箇所4: Line 447 (form.setValue)
```typescript
// 修正前
form.setValue(`items.${index}.unitPrice`, purchase.unitPrice || (purchase.price / purchase.quantity))

// 修正後
form.setValue(`items.${index}.unitPrice`, purchase.unitPrice || (purchase.price && purchase.quantity ? purchase.price / purchase.quantity : 0))
```

**影響**: 納品作成フォームでNaNエラーが発生する可能性  
**デプロイ**: ✅ 完了

---

### 3. 🚨 在庫ステータスの重大なバグ（3箇所）
**ファイル**: 
- `app/api/deliveries/route.ts`
- `app/api/deliveries/[id]/route.ts`

**Commit**: 211ad54

#### 問題の概要
データベーススキーマで定義されているステータス値:
- `UNUSED` - 未使用
- `PARTIAL` - 一部使用
- `USED` - 使用済み

しかし、コードでは存在しない `'AVAILABLE'` を使用していた。

#### 箇所1: 納品作成API (`route.ts:217-231`)
**問題**:
```typescript
// 修正前（バグあり）
let newStatus = 'AVAILABLE'  // ← スキーマに存在しないステータス！
if (updatedPurchase.remainingQuantity === 0) {
  newStatus = 'USED'
} else if (updatedPurchase.remainingQuantity < updatedPurchase.quantity) {
  newStatus = 'PARTIAL'
}

// Only update if status actually changed
if (newStatus !== 'AVAILABLE') {  // ← 全量残っている場合は更新されない
  await tx.purchase.update({
    where: { id: item.purchaseId },
    data: { status: newStatus },
  })
}
```

**修正後**:
```typescript
let newStatus: string
if (updatedPurchase.remainingQuantity === 0) {
  newStatus = 'USED'
} else if (updatedPurchase.remainingQuantity < updatedPurchase.quantity) {
  newStatus = 'PARTIAL'
} else {
  // remainingQuantity === quantity (全量残っている)
  newStatus = 'UNUSED'
}

// Always update status to keep it synchronized with remainingQuantity
await tx.purchase.update({
  where: { id: item.purchaseId },
  data: { status: newStatus },
})
```

**影響**: 在庫がremainingQuantityと同期しない、データ整合性の問題

#### 箇所2: 納品更新API - 在庫復元時 (`[id]/route.ts:118-131`)
**問題**:
```typescript
// 修正前（バグあり）
if (purchase.remainingQuantity === purchase.quantity) {
  await tx.purchase.update({
    where: { id: originalItem.purchaseId },
    data: { status: 'UNUSED' },
  })
} else if (purchase.remainingQuantity > 0) {  // ← 0の場合が未処理
  await tx.purchase.update({
    where: { id: originalItem.purchaseId },
    data: { status: 'PARTIAL' },
  })
}
```

**修正後**:
```typescript
let newStatus: string
if (purchase.remainingQuantity === 0) {
  newStatus = 'USED'
} else if (purchase.remainingQuantity === purchase.quantity) {
  newStatus = 'UNUSED'
} else {
  newStatus = 'PARTIAL'
}

await tx.purchase.update({
  where: { id: originalItem.purchaseId },
  data: { status: newStatus },
})
```

**影響**: 納品削除時に在庫が復元されてもステータスが正しく更新されない

#### 箇所3: 納品更新API - 新規追加時 (`[id]/route.ts:187-201`)
**問題**:
```typescript
// 修正前（バグあり）
if (updatedPurchase.remainingQuantity === 0) {
  await tx.purchase.update({
    where: { id: item.purchaseId },
    data: { status: 'USED' },
  })
} else if (updatedPurchase.remainingQuantity < updatedPurchase.quantity) {
  await tx.purchase.update({
    where: { id: item.purchaseId },
    data: { status: 'PARTIAL' },
  })
}
// ← remainingQuantity === quantity の場合が未処理
```

**修正後**:
```typescript
let newStatus: string
if (updatedPurchase.remainingQuantity === 0) {
  newStatus = 'USED'
} else if (updatedPurchase.remainingQuantity < updatedPurchase.quantity) {
  newStatus = 'PARTIAL'
} else {
  newStatus = 'UNUSED'
}

await tx.purchase.update({
  where: { id: item.purchaseId },
  data: { status: newStatus },
})
```

**影響**: 納品更新後にステータスがremainingQuantityと同期しない

**デプロイ**: ✅ 完了

---

## 検証済み：問題なし

### 在庫管理ロジック
以下の処理は正しく実装されており、バグなし：

1. **仕入れ作成時の在庫初期化** (`app/api/purchases/route.ts:155`)
   - `remainingQuantity: parseFloat(quantity)` ✓

2. **納品作成時の在庫減算** (`app/api/deliveries/route.ts:204-206`)
   - Prismaのアトミック操作 `decrement: item.quantity` を使用 ✓

3. **納品削除時の在庫復元** (`app/api/deliveries/[id]/route.ts:352-354`)
   - Prismaのアトミック操作 `increment: item.quantity` を使用 ✓

4. **仕入れ更新時の在庫再計算** (`app/api/purchases/[id]/route.ts:100-104`)
   ```typescript
   const usedQuantity = existingPurchase.quantity - existingPurchase.remainingQuantity
   remainingQuantity = parseFloat(quantity) - usedQuantity
   remainingQuantity = Math.max(0, remainingQuantity) // マイナス防止
   ```
   - 使用済み量を保持したまま正しく再計算 ✓

5. **トランザクション処理**
   - すべての在庫操作がトランザクション内で実行 ✓
   - タイムアウト設定あり（20秒待機、30秒タイムアウト）✓

6. **在庫不足チェック**
   - トランザクション内で事前チェック ✓
   - 明確なエラーメッセージ ✓

### データベースリレーション
`prisma/schema.prisma` の検証結果：

**リレーション構造**:
```
Purchase ─────┬─── Category (categoryId → Category.id)
              ├─── Supplier (supplierId → Supplier.id)  
              ├─── ProductPrefix (productPrefixId → ProductPrefix.id) [optional]
              └─── DeliveryItem[] (逆参照)

Delivery ─────┬─── Customer (customerId → Customer.id)
              └─── DeliveryItem[] (cascade delete)

DeliveryItem ─┬─── Delivery (deliveryId → Delivery.id) [onDelete: Cascade]
              └─── Purchase (purchaseId → Purchase.id)
```

**検証結果**:
- ✅ すべての外部キー制約が正しく設定
- ✅ Cascade deleteが適切（DeliveryItem → Delivery）
- ✅ Optional/Required関係が一貫
- ✅ 双方向リレーションが整合

**注意点**:
- DeliveryItemの削除時に自動的にPurchaseの在庫が復元されるわけではない
- 納品削除API内で明示的に在庫復元処理を実装済み（正しい設計）

---

## デプロイ履歴

### Commit: 02710d1
- **日時**: セッション内
- **内容**: 仕入れフォームNaNバグ修正
- **ステータス**: ✅ 本番デプロイ完了（Vercel）

### Commit: 998f64b
- **日時**: セッション内
- **内容**: 納品フォームNaNバグ修正（4箇所）
- **ステータス**: ✅ 本番デプロイ完了（Vercel）

### Commit: 211ad54
- **日時**: セッション内  
- **内容**: 在庫ステータス重大バグ修正（3箇所）
- **ステータス**: ✅ 本番デプロイ完了（Vercel）

---

## 技術的な教訓

### 1. NaNバグのパターン
**原因**: Optional chaining (`?.`) だけでは不十分
```typescript
// ❌ Bad: undefinedの除算でNaNが発生
value1?.value2 / value3

// ✅ Good: 両方の値が存在することを確認
value1 && value2 ? value1 / value2 : defaultValue
```

### 2. ステータス管理の原則
- データベーススキーマで定義された値のみを使用
- すべてのケース（0, partial, full）を網羅
- 条件分岐で「else」を使って漏れを防ぐ

### 3. TypeScriptの型安全性
- 必須フィールドをすべて含むオブジェクトを作成
- 型エラーは潜在的なバグを示すシグナル

---

## システム状態

### 現在の状態（修正後）
- ✅ 仕入れ作成・更新・削除: 正常動作
- ✅ 納品作成・更新・削除: 正常動作
- ✅ 在庫管理: remainingQuantityとステータスが完全同期
- ✅ データベース整合性: すべてのリレーションが正常

### 信頼性向上
特に在庫ステータスのバグ修正により、データ整合性が大幅に向上。
システムは現在、正確で安定した動作を実現している。
