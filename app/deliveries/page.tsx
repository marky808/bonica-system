"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { DeliveryForm } from "@/components/deliveries/delivery-form"
import { DeliveryList } from "@/components/deliveries/delivery-list"
import { DeliveryDetailModal } from "@/components/deliveries/delivery-detail-modal"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Loader2, FileText } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient, type Delivery, type GoogleSheetTemplate } from "@/lib/api"

export default function DeliveriesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null)
  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([])
  const [syncingGoogleSheets, setSyncingGoogleSheets] = useState(false)
  const [templates, setTemplates] = useState<GoogleSheetTemplate[]>([])
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadTemplates()
    }
  }, [isAuthenticated])

  const loadTemplates = async () => {
    try {
      const response = await apiClient.getGoogleSheetTemplates()
      if (response.data) {
        setTemplates(response.data)
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }

  const handleSubmit = async (data: any) => {
    setLoading(true)
    setError('')
    
    try {
      if (editingDelivery) {
        // Update existing delivery
        const response = await apiClient.updateDelivery(editingDelivery.id, data)
        if (response.data) {
          setDeliveries(deliveries.map(d => 
            d.id === editingDelivery.id ? response.data! : d
          ))
          setShowForm(false)
          setEditingDelivery(null)
        } else {
          setError(response.error || '更新に失敗しました')
        }
      } else {
        // Create new delivery
        const response = await apiClient.createDelivery(data)
        if (response.data) {
          setDeliveries([response.data, ...deliveries])
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

  const handleEdit = (delivery: Delivery) => {
    setEditingDelivery(delivery)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    // 該当の納品データを取得して詳細情報を表示
    const delivery = deliveries.find(d => d.id === id)
    if (!delivery) return
    
    let confirmMessage = `【納品データ削除確認】\n\n`
    confirmMessage += `顧客: ${delivery.customer?.companyName || '不明'}\n`
    confirmMessage += `金額: ${delivery.totalAmount.toLocaleString()}円\n`
    confirmMessage += `納品日: ${new Date(delivery.deliveryDate).toLocaleDateString('ja-JP')}\n`
    
    if (delivery.googleSheetId) {
      confirmMessage += `\n📄 Google Sheets納品書: 作成済み\n`
    }
    
    if (delivery.freeeDeliverySlipId) {
      confirmMessage += `\n⚠️ freee納品書(履歴): 発行済み（ID: ${delivery.freeeDeliverySlipId}）\n`
    }
    
    if (delivery.freeeInvoiceId) {
      confirmMessage += `\n❌ freee請求書(履歴): 発行済み（ID: ${delivery.freeeInvoiceId}）\n`
      confirmMessage += `請求書発行済みのため削除できません。\n`
      alert(confirmMessage)
      return
    }
    
    confirmMessage += `\n削除すると以下が実行されます：\n`
    confirmMessage += `• 在庫が復元されます\n`
    confirmMessage += `• 納品データが完全に削除されます\n`
    
    if (delivery.freeeDeliverySlipId) {
      confirmMessage += `• freee納品書は手動でキャンセルが必要です\n`
    }
    
    confirmMessage += `\n本当に削除しますか？`
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    setLoading(true)
    try {
      const response = await apiClient.deleteDelivery(id)
      if (response.data) {
        setDeliveries(deliveries.filter(d => d.id !== id))
        
        let deleteMessage = '納品データを削除しました。'
        
        if (delivery.googleSheetId) {
          deleteMessage += '\n\nGoogle Sheetsの納品書は自動削除されません。必要に応じて手動で削除してください。'
        }
        
        if (delivery.freeeDeliverySlipId) {
          deleteMessage += '\n\nfreee納品書（履歴ID: ' + delivery.freeeDeliverySlipId + '）は手動でキャンセルが必要です。'
        }
        
        if (delivery.googleSheetId || delivery.freeeDeliverySlipId) {
          alert(deleteMessage)
        }
      } else {
        setError(response.error || '削除に失敗しました')
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleView = (delivery: Delivery) => {
    setViewingDelivery(delivery)
    setShowDetailModal(true)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setViewingDelivery(null)
  }

  const handleEditFromModal = (delivery: Delivery) => {
    setEditingDelivery(delivery)
    setShowForm(true)
    setShowDetailModal(false)
    setViewingDelivery(null)
  }

  const handleDeleteFromModal = async (id: string) => {
    setLoading(true)
    try {
      const response = await apiClient.deleteDelivery(id)
      if (response.data) {
        setDeliveries(deliveries.filter(d => d.id !== id))
        setShowDetailModal(false)
        setViewingDelivery(null)
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
    setEditingDelivery(null)
    setError('')
  }


  const handleCreateGoogleSheetsInvoice = async () => {
    if (selectedDeliveryIds.length === 0) {
      setError('請求書を作成する納品を選択してください')
      return
    }

    setSyncingGoogleSheets(true)
    setError('')
    setSuccess('')
    
    try {
      // 請求書用テンプレートを取得
      const invoiceTemplate = templates.find(t => t.type === 'invoice')
      if (!invoiceTemplate) {
        setError('請求書用のGoogle Sheetsテンプレートが見つかりません')
        return
      }
      
      // 最初の納品データから顧客IDを取得
      const firstDelivery = deliveries.find(d => selectedDeliveryIds.includes(d.id))
      if (!firstDelivery) {
        setError('選択した納品データが見つかりません')
        return
      }
      
      const response = await fetch('/api/google-sheets/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: firstDelivery.customerId,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30日前
          endDate: new Date().toISOString().split('T')[0],
          templateId: invoiceTemplate.templateSheetId
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess(`Google Sheets請求書を作成しました: ${result.url}`)
        setSelectedDeliveryIds([])
        // Refresh deliveries to show updated status
        const deliveriesRes = await apiClient.getDeliveries()
        if (deliveriesRes.data) {
          setDeliveries(deliveriesRes.data.deliveries)
        }
      } else {
        setError(result.error || 'Google Sheets請求書の作成に失敗しました')
      }
    } catch (err) {
      setError('Google Sheets請求書作成でエラーが発生しました')
    } finally {
      setSyncingGoogleSheets(false)
    }
  }


  const handleCreateGoogleSheetsDelivery = async (deliveryId: string) => {
    setSyncingGoogleSheets(true)
    setError('')
    setSuccess('')

    console.log('📊 Starting Google Sheets delivery creation:', { deliveryId, templatesCount: templates.length });

    try {
      // 納品書用テンプレートを取得
      const deliveryTemplate = templates.find(t => t.type === 'delivery')
      if (!deliveryTemplate) {
        console.error('❌ No delivery template found:', { templates });
        setError('納品書用のGoogle Sheetsテンプレートが見つかりません。テンプレート作成ボタンでテンプレートを作成してください。')
        return
      }

      console.log('✅ Delivery template found:', deliveryTemplate);
      
      const response = await fetch('/api/google-sheets/create-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliveryId,
          templateId: deliveryTemplate.templateSheetId
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Google Sheets delivery creation successful:', result);
        setSuccess(`Google Sheets納品書を作成しました: ${result.url}`)

        // 納品リストを更新（エラーハンドリング付き）
        try {
          const deliveriesRes = await apiClient.getDeliveries()
          if (deliveriesRes.data) {
            setDeliveries(deliveriesRes.data.deliveries)
            console.log('✅ Deliveries list updated successfully');
          }
        } catch (refreshError) {
          console.error('❌ Failed to refresh deliveries list:', refreshError);
          // リスト更新失敗でもメインの成功メッセージは保持
        }
      } else {
        console.error('❌ Google Sheets delivery creation failed:', result);
        // エラーメッセージをユーザーフレンドリーに
        let errorMessage = result.error || 'Google Sheets納品書の作成に失敗しました'

        // エラー種別によるユーザーフレンドリーメッセージ
        if (errorMessage.includes('DECODER routines') || errorMessage.includes('JWT')) {
          errorMessage = 'Google Sheets APIの認証に失敗しました。環境変数の設定を確認してください。'
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = 'Google Sheets APIへのアクセス権限がありません。サービスアカウントの設定を確認してください。'
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorMessage = 'Google Sheetsテンプレートにアクセスできません。テンプレートの共有設定を確認してください。'
        } else if (errorMessage.includes('404') || errorMessage.includes('テンプレートが見つかりません')) {
          errorMessage = 'テンプレートシートが見つかりません。テンプレート作成ボタンでテンプレートを作成してください。'
        } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認して再試行してください。'
        }
        setError(errorMessage)
      }
    } catch (err) {
      console.error('❌ Unexpected error in handleCreateGoogleSheetsDelivery:', err);
      setError(`Google Sheets納品書作成でエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncingGoogleSheets(false)
    }
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
            <h1 className="text-3xl font-bold text-balance">納品管理</h1>
            <p className="text-muted-foreground text-pretty">在庫から商品を選択して納品処理を行います</p>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateGoogleSheetsInvoice}
                variant="outline"
                disabled={syncingGoogleSheets || selectedDeliveryIds.length === 0}
              >
                {syncingGoogleSheets ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Google Sheets請求書作成 {selectedDeliveryIds.length > 0 && `(${selectedDeliveryIds.length}件)`}
              </Button>
              <Button onClick={() => setShowForm(true)} className="h-12" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                新規納品登録
              </Button>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}


        {showForm ? (
          <DeliveryForm 
            onSubmit={handleSubmit} 
            onCancel={handleCancel} 
            initialData={editingDelivery || undefined} 
          />
        ) : (
          <DeliveryList 
            deliveries={deliveries}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onView={handleView}
            loading={loading}
            onRefresh={(newDeliveries) => setDeliveries(newDeliveries)}
            selectedIds={selectedDeliveryIds}
            onSelectionChange={setSelectedDeliveryIds}
            onCreateDeliverySlip={handleCreateGoogleSheetsDelivery}
          />
        )}
        
        {/* 詳細表示モーダル */}
        <DeliveryDetailModal
          delivery={viewingDelivery}
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          onEdit={handleEditFromModal}
          onDelete={handleDeleteFromModal}
        />
      </div>
    </MainLayout>
  )
}