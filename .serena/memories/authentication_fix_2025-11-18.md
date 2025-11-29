# 認証チェック欠如バグの修正 (2025-11-18)

## 問題の症状
仕入れ管理→新規仕入れ登録で登録画面が表示されず、Application error が発生

## 根本原因
`app/purchases/new/page.tsx` と `app/deliveries/new/page.tsx` に認証チェックが欠如していた。

### 詳細な原因分析

1. **認証フロー**
   - システムは `useAuth` フックで認証状態を管理
   - ユーザーがログインしていない場合、localStorageにトークンが存在しない
   - APIリクエストには `Authorization: Bearer <token>` ヘッダーが必要

2. **エラーの発生メカニズム**
   - ユーザーが `/purchases/new` にアクセス
   - ページに認証チェックがないため、認証なしでPurchaseFormコンポーネントがマウントされる
   - PurchaseFormの `useEffect` (64-99行目) が以下のAPIを呼び出す:
     - `/api/categories` - カテゴリー一覧取得
     - `/api/suppliers` - 仕入れ先一覧取得
     - `/api/product-prefixes` - 商品プレフィックス一覧取得
   - これらのAPIは全て `requireAuth(request)` で認証を要求
   - トークンがないため、401 Unauthorized エラーが返される
   - エラーが適切に処理されず、画面がクラッシュ

3. **サーバーログからの証拠**
```
GET /api/categories 401 in 4199ms
Get categories error: Error: Authentication required
    at requireAuth (webpack-internal:///(rsc)/./lib/auth.ts:31:15)
```

## 修正内容

### 1. app/purchases/new/page.tsx
**修正前:**
```typescript
"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { PurchaseForm } from "@/components/purchases/purchase-form"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function NewPurchasePage() {
  const router = useRouter()
  const [error, setError] = useState("")
  
  // 認証チェックなし！
```

**修正後:**
```typescript
"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { PurchaseForm } from "@/components/purchases/purchase-form"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"

export default function NewPurchasePage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const { isAuthenticated, isLoading } = useAuth()

  // 認証チェックを追加
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // ローディング状態の表示
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </MainLayout>
    )
  }

  // 未認証の場合は何も表示しない
  if (!isAuthenticated) {
    return null
  }

  // ... 残りのコード
```

### 2. app/deliveries/new/page.tsx
同様の修正を適用

## 他のページとの比較

### 正しく実装されているページの例: app/purchases/page.tsx
```typescript
const { isAuthenticated, isLoading } = useAuth()
const router = useRouter()

useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login')
  }
}, [isAuthenticated, isLoading, router])
```

## 影響範囲
- ✅ 修正: `app/purchases/new/page.tsx`
- ✅ 修正: `app/deliveries/new/page.tsx`
- ✅ 確認済み: 他の新規/編集ページは存在しない

## 修正後の動作
1. ユーザーが未ログインで `/purchases/new` にアクセス
2. `useAuth` が `isAuthenticated: false` を返す
3. `useEffect` が `/login` にリダイレクト
4. ログイン後、正常に新規仕入れ登録画面が表示される
5. PurchaseFormがマウントされ、認証済みトークン付きでAPIリクエストが成功

## 教訓
- **すべての認証が必要なページに `useAuth` を追加する必要がある**
- MainLayoutは認証チェックをしないため、各ページで明示的にチェックが必要
- 新しいページを作成する際は、既存の類似ページをテンプレートとして使用すべき
- 特に `/new` や `/edit` のような機能ページは必ず認証チェックを含める

## 関連ファイル
- [lib/auth-context.tsx](lib/auth-context.tsx) - 認証コンテキスト
- [lib/auth.ts](lib/auth.ts) - サーバー側認証ヘルパー
- [lib/api.ts](lib/api.ts) - APIクライアント（トークン管理）
- [components/purchases/purchase-form.tsx](components/purchases/purchase-form.tsx) - 仕入れフォーム
