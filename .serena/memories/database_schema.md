# BONICA管理システム - データベーススキーマ

## 主要エンティティ

### User（ユーザー）
```typescript
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String   // bcryptでハッシュ化
  role      String   @default("USER") // "ADMIN" | "USER"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Purchase（仕入れ）
```typescript
model Purchase {
  id                String   @id @default(cuid())
  productName       String
  categoryId        String
  quantity          Number
  unit              String
  unitNote          String?
  unitPrice         Number
  price             Number
  taxType           String   // "taxable" | "tax_free"
  supplierId        String
  purchaseDate      DateTime
  expiryDate        DateTime?
  deliveryFee       String?
  status            String   // "unused" | "partial" | "used"
  remainingQuantity Number
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Delivery（納品）
```typescript
model Delivery {
  id                   String   @id @default(cuid())
  delivery_number      String?
  customerId           String
  deliveryDate         DateTime
  totalAmount          Number
  status               String   // "pending" | "slip_issued" | "invoice_ready"
  notes                String?
  freeeDeliverySlipId  String?
  freeeInvoiceId       String?
  googleSheetId        String?
  googleSheetUrl       String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  items                DeliveryItem[]
}
```

### DeliveryItem（納品明細）
```typescript
model DeliveryItem {
  id         String @id @default(cuid())
  deliveryId String
  purchaseId String
  quantity   Number
  unitPrice  Number
  amount     Number
  delivery   Delivery @relation(fields: [deliveryId], references: [id])
  purchase   Purchase @relation(fields: [purchaseId], references: [id])
}
```

### Supplier（仕入れ先）
```typescript
model Supplier {
  id                 String @id @default(cuid())
  companyName        String @unique
  contactPerson      String
  phone              String
  address            String
  paymentTerms       String
  deliveryConditions String
  specialNotes       String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  purchases          Purchase[]
}
```

### Customer（納品先）
```typescript
model Customer {
  id                      String @id @default(cuid())
  companyName             String @unique
  contactPerson           String
  phone                   String
  deliveryAddress         String
  billingAddress          String
  deliveryTimePreference  String?
  specialRequests         String?
  specialNotes            String?
  billingCycle            String?
  billingDay              Number?
  paymentTerms            String?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  deliveries              Delivery[]
}
```

### Category（カテゴリー）
```typescript
model Category {
  id        String @id @default(cuid())
  name      String @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  purchases Purchase[]
}
```

### GoogleSheetTemplate（Googleスプレッドシートテンプレート）
```typescript
model GoogleSheetTemplate {
  id              String @id @default(cuid())
  name            String
  type            String // "delivery" | "invoice"
  templateSheetId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## データベース環境設定

### 開発環境（SQLite）
```
DATABASE_URL="file:./dev.db"
```

### 本番環境（PostgreSQL）
```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # Vercel Postgres用
```

## 初期データ

### カテゴリー
- 果物
- 野菜
- 穀物
- 冷凍
- その他

### 初期管理者ユーザー
- Email: [設定された管理者メール]
- Password: [設定されたパスワード]（ハッシュ化済み）
- Name: 小西正高
- Role: ADMIN