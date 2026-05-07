"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { DeliveryForm } from "@/components/deliveries/delivery-form"
import { DirectInputForm } from "@/components/deliveries/direct-input-form"
import { ReturnDeliveryForm } from "@/components/deliveries/return-delivery-form"
import { DeliveryList } from "@/components/deliveries/delivery-list"
import { DeliveryDetailModal } from "@/components/deliveries/delivery-detail-modal"
import { PurchaseLinkModal } from "@/components/deliveries/purchase-link-modal"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Loader2, FileText, Package, Edit3, Link, RotateCcw, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient, type Delivery, type GoogleSheetTemplate } from "@/lib/api"

type InputMode = 'NORMAL' | 'DIRECT' | 'RETURN'

export default function DeliveriesPage() {
  const [showForm, setShowForm] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('NORMAL')
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null)
  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([])
  const [syncingGoogleSheets, setSyncingGoogleSheets] = useState(false)
  const [creatingType, setCreatingType] = useState<'delivery' | 'invoice' | null>(null)
  const [templates, setTemplates] = useState<GoogleSheetTemplate[]>([])
  const [showInvoiceConfirmDialog, setShowInvoiceConfirmDialog] = useState(false)
  const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState(0)
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
        // APIレスポンスが { templates: [...] } 形式なので、templatesプロパティを取得
        const templatesData = Array.isArray(response.data) ? response.data : response.data.templates || []
        setTemplates(Array.isArray(templatesData) ? templatesData : [])
      } else {
        setTemplates([])
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
      setTemplates([])
    }
  }

  const handleSubmit = async (data: any) => {
    setLoading(true)
    setError('')

    try {
      if (editingDelivery) {
        // Update existing delivery
        const hadGoogleSheet = !!editingDelivery.googleSheetId
        const response = await apiClient.updateDelivery(editingDelivery.id, data)
        if (response.data) {
          setDeliveries(deliveries.map(d =>
            d.id === editingDelivery.id ? response.data! : d
          ))
          setShowForm(false)

          // 納品書が作成済みの場合、再作成を確認
          if (hadGoogleSheet) {
            const confirmRegenerate = window.confirm(
              '納品内容を更新しました。\n\n' +
              '既存のGoogle Sheets納品書は古い情報のままです。\n' +
              '納品書を再作成しますか？\n\n' +
              '※再作成すると新しいスプレッドシートが作成されます。\n' +
              '※古い納品書は履歴として残ります。'
            )

            if (confirmRegenerate) {
              setEditingDelivery(null)
              // 納品書を再作成
              await handleCreateGoogleSheetsDelivery(editingDelivery.id)
              return
            }
          }

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
    const delivery = Array.isArray(deliveries) ? deliveries.find(d => d.id === id) : null
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


  // 請求書作成ボタンクリック時のハンドラ
  const handleCreateGoogleSheetsInvoiceClick = () => {
    if (selectedDeliveryIds.length === 0) {
      setError('請求書を作成する納品を選択してください')
      return
    }

    // 選択した納品のうち、納品書未発行（PENDING）のものをカウント
    const selectedDeliveries = deliveries.filter(d => selectedDeliveryIds.includes(d.id))
    const pendingCount = selectedDeliveries.filter(d => d.status === 'PENDING').length

    if (pendingCount > 0) {
      // 納品書未発行のものがある場合は確認ダイアログを表示
      setPendingDeliveriesCount(pendingCount)
      setShowInvoiceConfirmDialog(true)
    } else {
      // 全て納品書発行済みの場合は直接作成
      handleCreateGoogleSheetsInvoice()
    }
  }

  // 実際に請求書を作成する関数
  const handleCreateGoogleSheetsInvoice = async () => {
    setShowInvoiceConfirmDialog(false)
    setSyncingGoogleSheets(true)
    setCreatingType('invoice')
    setError('')
    setSuccess('')

    try {
      // 最初の納品データから顧客IDを取得
      const firstDelivery = Array.isArray(deliveries) ? deliveries.find(d => selectedDeliveryIds.includes(d.id)) : null
      if (!firstDelivery) {
        setError('選択した納品データが見つかりません')
        return
      }

      // 選択した納品の日付範囲を計算
      const selectedDeliveries = deliveries.filter(d => selectedDeliveryIds.includes(d.id))
      const deliveryDates = selectedDeliveries.map(d => new Date(d.deliveryDate))
      const minDate = new Date(Math.min(...deliveryDates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...deliveryDates.map(d => d.getTime())))

      // templateIdはAPIが環境変数から自動取得するため省略可能
      const response = await fetch('/api/google-sheets/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: firstDelivery.customerId,
          startDate: minDate.toISOString().split('T')[0],
          endDate: maxDate.toISOString().split('T')[0]
          // templateIdは省略 - APIが環境変数から自動取得
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
      setCreatingType(null)
    }
  }


  const handleCreateGoogleSheetsDelivery = async (deliveryId: string) => {
    setSyncingGoogleSheets(true)
    setCreatingType('delivery')
    setError('')
    setSuccess('')

    console.log('📊 Starting Google Sheets delivery creation:', { deliveryId, templatesCount: templates.length });

    try {
      console.log('✅ Using automatic template detection (templateId will be fetched from database)');

      const response = await fetch('/api/google-sheets/create-delivery-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliveryId
          // templateIdは省略 - APIで自動取得
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
      setCreatingType(null)
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
                onClick={() => setShowLinkModal(true)}
                variant="outline"
              >
                <Link className="h-4 w-4 mr-2" />
                仕入れ紐付け
              </Button>
              <Button
                onClick={handleCreateGoogleSheetsInvoiceClick}
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
            <AlertDescription className="text-green-800">
              {(() => {
                // URLを含む場合はリンク化
                const urlMatch = success.match(/(https:\/\/[^\s]+)/);
                if (urlMatch) {
                  const url = urlMatch[1];
                  const beforeUrl = success.substring(0, success.indexOf(url));
                  const afterUrl = success.substring(success.indexOf(url) + url.length);
                  return (
                    <>
                      {beforeUrl}
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:text-green-900 ml-1"
                      >
                        こちらをクリックして開く
                      </a>
                      {afterUrl}
                    </>
                  );
                }
                return success;
              })()}
            </AlertDescription>
          </Alert>
        )}


        {showForm ? (
          <div className="space-y-4">
            {/* 入力モード切り替えタブ */}
            {!editingDelivery && (
              <div className="flex justify-center">
                <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-auto">
                  <TabsList className="grid w-full grid-cols-3 h-12">
                    <TabsTrigger value="NORMAL" className="flex items-center gap-2 px-4">
                      <Package className="h-4 w-4" />
                      通常モード
                    </TabsTrigger>
                    <TabsTrigger value="DIRECT" className="flex items-center gap-2 px-4">
                      <Edit3 className="h-4 w-4" />
                      直接入力
                    </TabsTrigger>
                    <TabsTrigger value="RETURN" className="flex items-center gap-2 px-4 text-red-600 data-[state=active]:text-red-600">
                      <RotateCcw className="h-4 w-4" />
                      赤伝登録
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* モードに応じたフォーム表示 */}
            {inputMode === 'NORMAL' && (
              <DeliveryForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                initialData={editingDelivery || undefined}
              />
            )}
            {inputMode === 'DIRECT' && (
              <DirectInputForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            )}
            {inputMode === 'RETURN' && (
              <ReturnDeliveryForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            )}
          </div>
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

        {/* 仕入れ紐付けモーダル */}
        <PurchaseLinkModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onLinkComplete={async () => {
            // 納品リストを更新
            try {
              const deliveriesRes = await apiClient.getDeliveries()
              if (deliveriesRes.data) {
                setDeliveries(deliveriesRes.data.deliveries)
              }
            } catch (err) {
              console.error('Failed to refresh deliveries:', err)
            }
          }}
        />

        {/* 納品書未発行の確認ダイアログ */}
        <Dialog open={showInvoiceConfirmDialog} onOpenChange={setShowInvoiceConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                納品書未発行の納品があります
              </DialogTitle>
              <DialogDescription className="pt-2">
                選択した{selectedDeliveryIds.length}件の納品のうち、
                <span className="font-semibold text-yellow-600">{pendingDeliveriesCount}件</span>
                は納品書が発行されていません（ステータス：処理中）。
                <br /><br />
                納品書を発行せずに請求書を作成しますか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowInvoiceConfirmDialog(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreateGoogleSheetsInvoice}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                請求書を発行する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 作成中モーダル */}
        <Dialog open={syncingGoogleSheets} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <DialogTitle className="text-xl font-semibold">
                {creatingType === 'delivery' ? '納品書作成中...' : '請求書作成中...'}
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground">
                Google Sheetsに{creatingType === 'delivery' ? '納品書' : '請求書'}を作成しています。
                <br />
                しばらくお待ちください。
              </DialogDescription>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}