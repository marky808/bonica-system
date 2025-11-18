"use client"

import { useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { DeliveryForm } from "@/components/deliveries/delivery-form"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function NewDeliveryPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = (data: any) => {
    console.log("New delivery data:", data)
    // TODO: Implement API call to save delivery
    router.push("/deliveries")
  }

  const handleCancel = () => {
    router.push("/deliveries")
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
          <h1 className="text-3xl font-bold text-balance">新規納品処理</h1>
          <p className="text-muted-foreground text-pretty">在庫から商品を選択して納品処理を行います</p>
        </div>

        <DeliveryForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </MainLayout>
  )
}
