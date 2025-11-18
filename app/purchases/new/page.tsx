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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </MainLayout>
    )
  }

  if (!isAuthenticated) {
    return null
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
