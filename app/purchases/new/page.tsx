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

  const handleSubmit = async (data: any) => {
    setError("")

    try {
      const response = await apiClient.createPurchase(data)

      if (response.error) {
        setError(response.error)
        return
      }

      // Success - redirect to purchases list
      router.push("/purchases")
    } catch (error: any) {
      console.error("Purchase creation error:", error)
      setError(error.message || "仕入れ登録に失敗しました")
    }
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

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PurchaseForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </MainLayout>
  )
}
