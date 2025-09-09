"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { PurchaseForm } from "@/components/purchases/purchase-form"
import { PurchaseList } from "@/components/purchases/purchase-list"
import { PurchaseDetailModal } from "@/components/purchases/purchase-detail-modal"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient, type Purchase } from "@/lib/api"

export default function PurchasesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (data: any) => {
    setLoading(true)
    setError('')
    
    try {
      if (editingPurchase) {
        // Update existing purchase
        const response = await apiClient.updatePurchase(editingPurchase.id, data)
        if (response.data) {
          setPurchases(purchases.map(p => 
            p.id === editingPurchase.id ? response.data! : p
          ))
          setShowForm(false)
          setEditingPurchase(null)
        } else {
          setError(response.error || '更新に失敗しました')
        }
      } else {
        // Create new purchase
        const response = await apiClient.createPurchase(data)
        if (response.data) {
          setPurchases([response.data, ...purchases])
          setShowForm(false)
        } else {
          setError(response.error || '登録に失敗しました')
        }
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この仕入れデータを削除しますか？')) {
      return
    }
    
    setLoading(true)
    try {
      const response = await apiClient.deletePurchase(id)
      if (response.data) {
        setPurchases(purchases.filter(p => p.id !== id))
      } else {
        setError(response.error || '削除に失敗しました')
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleView = (purchase: Purchase) => {
    setViewingPurchase(purchase)
    setShowDetailModal(true)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setViewingPurchase(null)
  }

  const handleEditFromModal = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setShowForm(true)
    setShowDetailModal(false)
    setViewingPurchase(null)
  }

  const handleDeleteFromModal = async (id: string) => {
    setLoading(true)
    try {
      const response = await apiClient.deletePurchase(id)
      if (response.data) {
        setPurchases(purchases.filter(p => p.id !== id))
        setShowDetailModal(false)
        setViewingPurchase(null)
      } else {
        setError(response.error || '削除に失敗しました')
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingPurchase(null)
    setError('')
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">仕入れ管理</h1>
            <p className="text-muted-foreground text-pretty">農産物の仕入れ情報を管理します</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="h-12" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              新規仕入れ登録
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showForm ? (
          <PurchaseForm 
            onSubmit={handleSubmit} 
            onCancel={handleCancel} 
            initialData={editingPurchase || undefined} 
          />
        ) : (
          <PurchaseList 
            purchases={purchases}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onView={handleView}
            loading={loading}
            onRefresh={(newPurchases) => setPurchases(newPurchases)}
          />
        )}
        
        {/* 詳細表示モーダル */}
        <PurchaseDetailModal
          purchase={viewingPurchase}
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          onEdit={handleEditFromModal}
          onDelete={handleDeleteFromModal}
        />
      </div>
    </MainLayout>
  )
}
