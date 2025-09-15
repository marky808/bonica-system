# BONICA管理システム - コーディング規約・慣例

## TypeScript設定
- **strict mode**: 有効
- **target**: ES6
- **module**: esnext
- **moduleResolution**: bundler
- **Path aliases**: `@/*` -> `./*`

## コードスタイル・命名規則

### ファイル・ディレクトリ命名
- **ファイル名**: kebab-case（例: `purchase-form.tsx`, `delivery-list.tsx`）
- **コンポーネントファイル**: PascalCase（例: `PurchaseForm.tsx`）
- **API Routes**: `route.ts` （Next.js App Router規約）
- **ディレクトリ**: kebab-case

### 変数・関数命名
- **変数・関数**: camelCase（例: `purchaseData`, `handleSubmit`）
- **定数**: SCREAMING_SNAKE_CASE（例: `API_BASE_URL`）
- **コンポーネント**: PascalCase（例: `PurchaseForm`, `DeliveryList`）
- **インターface**: PascalCase（例: `Purchase`, `ApiResponse<T>`）

### インポート順序
1. React関連
2. Next.js関連
3. 外部ライブラリ
4. 内部ライブラリ（@/lib, @/components）
5. 相対インポート

```typescript
import React from "react"
import type { Metadata } from "next"
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import './styles.css'
```

## Component構造

### shadcn/ui使用パターン
- **UI Components**: Radix UI + class-variance-authority (cva)
- **スタイリング**: Tailwind CSS classes
- **バリアント管理**: cva for component variants

```typescript
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: { default: "...", destructive: "..." },
      size: { default: "...", sm: "..." }
    }
  }
)
```

### API Route構造
```typescript
export async function POST(request: NextRequest) {
  try {
    // バリデーション
    // ビジネスロジック
    // レスポンス返却
  } catch (error) {
    // エラーハンドリング
  }
}
```

## エラーハンドリング
- **日本語エラーメッセージ**: ユーザー向けメッセージは日本語
- **構造化エラーレスポンス**: `{ error: string, message?: string }`
- **適切なHTTPステータスコード**: 400, 401, 404, 500など

## データベース
- **Prisma ORM使用**
- **cuid() ID生成**
- **createdAt/updatedAt自動管理**
- **日本語テーブル名マッピング**: `@@map("users")`

## CSS/スタイリング
- **Tailwind CSS**: ユーティリティファースト
- **shadcn/ui theme**: CSS variables for colors
- **Responsive design**: モバイルファースト
- **Green color scheme**: 農産物テーマに合わせた緑系カラー