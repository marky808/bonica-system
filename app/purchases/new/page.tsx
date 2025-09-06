"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { PurchaseForm } from "@/components/purchases/purchase-form"
import { useRouter } from "next/navigation"

export default function NewPurchasePage() {
  const router = useRouter()

  const handleSubmit = (data: any) => {
    console.log("New purchase data:", data)
    // TODO: Implement API call to save purchase
    router.push("/purchases")
  }

  const handleCancel = () => {
    router.push("/purchases")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">新規仕入れ登録</h1>
          <p className="text-muted-foreground text-pretty">新しい農産物の仕入れ情報を登録します</p>
        </div>

        <PurchaseForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </MainLayout>
  )
}
