"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Edit, Trash2, Truck, Calendar, DollarSign, Building, FileText, Package } from "lucide-react"
import { type Delivery } from "@/lib/api"

interface DeliveryDetailModalProps {
  delivery: Delivery | null
  isOpen: boolean
  onClose: () => void
  onEdit: (delivery: Delivery) => void
  onDelete: (id: string) => void
}

export function DeliveryDetailModal({
  delivery,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: DeliveryDetailModalProps) {
  if (!delivery) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-yellow-500">処理中</Badge>
      case "DELIVERED":
        return <Badge className="bg-green-500">納品完了</Badge>
      case "CANCELLED":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            キャンセル
          </Badge>
        )
      case "ERROR":
        return <Badge className="bg-red-500">エラー</Badge>
      case "INVOICED":
        return <Badge className="bg-blue-500">請求済み</Badge>
      default:
        return <Badge variant="outline">不明 ({status})</Badge>
    }
  }

  const handleEdit = () => {
    onEdit(delivery)
    onClose()
  }

  const handleDelete = () => {
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
    
    if (confirm(confirmMessage)) {
      onDelete(delivery.id)
      onClose()
    }
  }

  const getTotalQuantityByProduct = () => {
    const productQuantities = new Map()
    delivery.items.forEach(item => {
      const key = item.purchase.productName
      if (productQuantities.has(key)) {
        productQuantities.set(key, productQuantities.get(key) + item.quantity)
      } else {
        productQuantities.set(key, item.quantity)
      }
    })
    return productQuantities
  }

  const productQuantities = getTotalQuantityByProduct()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            納品詳細
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                お客様情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">会社名</label>
                  <p className="text-lg font-semibold">{delivery.customer?.companyName || "不明"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">担当者</label>
                  <p className="text-lg">{delivery.customer?.contactPerson || "不明"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">配送先住所</label>
                  <p className="text-sm">{delivery.customer?.deliveryAddress || "不明"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                  <p className="text-sm">{delivery.customer?.phone || "不明"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 納品情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                納品情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">納品日</label>
                  <p className="text-lg font-semibold">{formatDate(delivery.deliveryDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ステータス</label>
                  <div className="mt-1">{getStatusBadge(delivery.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">合計金額</label>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(delivery.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 納品商品一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                納品商品（{delivery.items.length}品目）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {delivery.items.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-start justify-between py-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-lg">{item.purchase.productName}</h4>
                          <Badge variant="outline">{item.purchase.category?.name}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">納品数量:</span>
                            <p className="font-medium">{item.quantity} {item.purchase.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">単価:</span>
                            <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">小計:</span>
                            <p className="font-medium text-primary">{formatCurrency(item.amount)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">仕入れ先:</span>
                            <p className="font-medium text-xs">{item.purchase.supplier?.companyName || "不明"}</p>
                          </div>
                        </div>
                        
                        {/* 在庫情報 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-muted-foreground">元の仕入れ数量:</span>
                            <p className="font-medium">{item.purchase.quantity} {item.purchase.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">仕入れ単価:</span>
                            <p className="font-medium">{formatCurrency(item.purchase.unitPrice || (item.purchase.price / item.purchase.quantity))}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">残り在庫:</span>
                            <p className="font-medium">{item.purchase.remainingQuantity} {item.purchase.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">在庫ステータス:</span>
                            <p className="font-medium">
                              {item.purchase.status === 'UNUSED' ? '未使用' : 
                               item.purchase.status === 'PARTIAL' ? '一部使用' : 
                               item.purchase.status === 'USED' ? '使用済み' : '不明'}
                            </p>
                          </div>
                        </div>
                        {item.purchase.expiryDate && (
                          <div className="text-xs text-muted-foreground">
                            賞味期限: {formatDate(item.purchase.expiryDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    {index < delivery.items.length - 1 && <Separator />}
                  </div>
                ))}

                <Separator />
                
                {/* 合計 */}
                <div className="flex justify-end pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">合計品目数:</span>
                      <span className="font-medium">{delivery.items.length}品目</span>
                    </div>
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-lg font-medium">合計金額:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(delivery.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* システム情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                システム情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {delivery.googleSheetId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Google Sheets納品書ID</label>
                    <p className="text-sm font-mono">{delivery.googleSheetId}</p>
                  </div>
                )}
                {delivery.googleSheetUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Google Sheets URL</label>
                    <p className="text-sm">
                      <a href={delivery.googleSheetUrl} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:text-blue-800 underline">
                        スプレッドシートを開く
                      </a>
                    </p>
                  </div>
                )}
                {delivery.freeeDeliverySlipId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">freee納品書ID (履歴)</label>
                    <p className="text-sm font-mono text-muted-foreground">{delivery.freeeDeliverySlipId}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">登録日時</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(delivery.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">更新日時</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(delivery.updatedAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button onClick={handleEdit} className="flex-1 h-12">
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1 h-12"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 h-12">
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}