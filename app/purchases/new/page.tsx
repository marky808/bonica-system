"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { PurchaseForm } from "@/components/purchases/purchase-form"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function NewPurchasePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)

    try {
      const response = await apiClient.createPurchase(data)

      if (response.error) {
        toast({
          title: "エラー",
          description: response.error,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      toast({
        title: "成功",
        description: "仕入れ情報を登録しました",
      })

      router.push("/purchases")
    } catch (error: any) {
      console.error("Purchase creation error:", error)
      toast({
        title: "エラー",
        description: error.message || "仕入れ登録に失敗しました",
        variant: "destructive",
      })
      setIsSubmitting(false)
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

        <PurchaseForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </MainLayout>
  )
}
