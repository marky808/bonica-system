"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { PurchaseForm } from "@/components/purchases/purchase-form"
import { PurchaseList } from "@/components/purchases/purchase-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Purchase } from "@/types"

export default function PurchasesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)

  const handleSubmit = (data: any) => {
    console.log("Purchase data:", data)
    // TODO: Implement API call to save purchase
    setShowForm(false)
    setEditingPurchase(null)
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    console.log("Delete purchase:", id)
    // TODO: Implement delete functionality
  }

  const handleView = (purchase: Purchase) => {
    console.log("View purchase:", purchase)
    // TODO: Implement view modal
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingPurchase(null)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">仕入れ管理</h1>
            <p className="text-muted-foreground text-pretty">農産物の仕入れ情報を管理します</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="h-12">
              <Plus className="h-4 w-4 mr-2" />
              新規仕入れ登録
            </Button>
          )}
        </div>

        {showForm ? (
          <PurchaseForm onSubmit={handleSubmit} onCancel={handleCancel} initialData={editingPurchase || undefined} />
        ) : (
          <PurchaseList onEdit={handleEdit} onDelete={handleDelete} onView={handleView} />
        )}
      </div>
    </MainLayout>
  )
}
