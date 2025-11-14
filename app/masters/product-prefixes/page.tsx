"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { ProductPrefixManagement } from "@/components/masters/product-prefix-management"

export default function ProductPrefixesPage() {
  const handlePrefixUpdated = () => {
    console.log("Product prefix data updated")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">商品プレフィックス管理</h1>
          <p className="text-muted-foreground text-pretty">
            商品名の前に付ける接頭辞（生産者名など）を管理します
          </p>
        </div>

        <ProductPrefixManagement onPrefixUpdated={handlePrefixUpdated} />
      </div>
    </MainLayout>
  )
}
