"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Edit, Trash2, Truck, Calendar, DollarSign, Building, FileText, Package, AlertTriangle, Link, RotateCcw } from "lucide-react"
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
    if (isReturnDelivery()) {
      alert('赤伝（返品）は編集できません。内容を修正したい場合は削除して登録し直してください。')
      return
    }
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

  const getDisplayProductName = (item: any) => {
    // 直接入力モード: purchaseがnull
    if (!item.purchase) {
      return item.productName || "不明"
    }
    // 通常モード: purchaseから取得
    if (item.purchase.productPrefix?.name) {
      return `${item.purchase.productPrefix.name}${item.purchase.productName}`
    }
    return item.purchase.productName || "不明"
  }

  const isDirectInputItem = (item: any) => !item.purchase

  // 赤伝かどうかを判定
  const isReturnDelivery = () => {
    return (delivery as any).type === 'RETURN'
  }

  const getItemCategory = (item: any) => {
    if (item.purchase) {
      return item.purchase.category?.name
    }
    return item.category?.name
  }

  const getItemUnit = (item: any) => {
    if (item.purchase) {
      return item.purchase.unit
    }
    return item.unit
  }

  const getTotalQuantityByProduct = () => {
    const productQuantities = new Map()
    delivery.items.forEach(item => {
      const key = getDisplayProductName(item)
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
          <DialogTitle className={`text-2xl font-bold flex items-center gap-2 ${isReturnDelivery() ? 'text-red-600' : ''}`}>
            {isReturnDelivery() ? (
              <>
                <RotateCcw className="h-6 w-6" />
                赤伝（返品）詳細
              </>
            ) : (
              <>
                <Truck className="h-6 w-6" />
                納品詳細
              </>
            )}
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
          <Card className={isReturnDelivery() ? 'border-red-300' : ''}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {isReturnDelivery() ? '返品情報' : '納品情報'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{isReturnDelivery() ? '返品日' : '納品日'}</label>
                  <p className="text-lg font-semibold">{formatDate(delivery.deliveryDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ステータス</label>
                  <div className="mt-1">{getStatusBadge(delivery.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">合計金額</label>
                  <p className={`text-2xl font-bold ${isReturnDelivery() ? 'text-red-600' : 'text-primary'}`}>{formatCurrency(delivery.totalAmount)}</p>
                </div>
              </div>

              {/* 赤伝の場合の追加情報 */}
              {isReturnDelivery() && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-red-700">種別</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Badge className="bg-red-500 text-white">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          赤伝（返品）
                        </Badge>
                      </p>
                    </div>
                    {(delivery as any).returnReason && (
                      <div>
                        <label className="text-sm font-medium text-red-700">返品理由</label>
                        <p className="text-sm mt-1 text-red-800">{(delivery as any).returnReason}</p>
                      </div>
                    )}
                    {(delivery as any).originalDelivery && (
                      <div>
                        <label className="text-sm font-medium text-red-700">元の納品</label>
                        <p className="text-sm mt-1 text-red-800">
                          {(delivery as any).originalDelivery.deliveryNumber || (delivery as any).originalDeliveryId} -
                          {formatDate((delivery as any).originalDelivery.deliveryDate)} -
                          {formatCurrency((delivery as any).originalDelivery.totalAmount)}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      赤伝の商品は在庫に戻りません（廃棄扱い）
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 納品商品一覧 */}
          <Card className={isReturnDelivery() ? 'border-red-300' : ''}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {isReturnDelivery() ? '返品商品' : '納品商品'}（{delivery.items.length}品目）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {delivery.items.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-start justify-between py-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-lg">{getDisplayProductName(item)}</h4>
                          <Badge variant="outline">{getItemCategory(item) || "未分類"}</Badge>
                          {isDirectInputItem(item) && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              仕入れ未紐付け
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">納品数量:</span>
                            <p className="font-medium">{item.quantity} {getItemUnit(item) || ""}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">単価:</span>
                            <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">小計:</span>
                            <p className="font-medium text-primary">{formatCurrency(item.amount)}</p>
                          </div>
                          {item.purchase ? (
                            <div>
                              <span className="text-muted-foreground">仕入れ先:</span>
                              <p className="font-medium text-xs">{item.purchase.supplier?.companyName || "不明"}</p>
                            </div>
                          ) : (
                            <div>
                              <span className="text-muted-foreground">税率:</span>
                              <p className="font-medium">{item.taxRate || 8}%</p>
                            </div>
                          )}
                        </div>

                        {/* 在庫情報（仕入れ紐付け済みの場合のみ表示） */}
                        {item.purchase && (
                          <>
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
                          </>
                        )}

                        {/* 直接入力モードの場合は備考を表示 */}
                        {isDirectInputItem(item) && item.notes && (
                          <div className="text-xs text-muted-foreground mt-2 p-2 bg-yellow-50 rounded">
                            <span className="font-medium">備考:</span> {item.notes}
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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">種別</label>
                  <p className="text-sm">
                    {isReturnDelivery() ? (
                      <Badge className="bg-red-500 text-white">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        赤伝（返品）
                      </Badge>
                    ) : (
                      <Badge variant="outline">通常納品</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">入力モード</label>
                  <p className="text-sm">
                    {(delivery as any).inputMode === 'DIRECT' ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        直接入力
                      </Badge>
                    ) : (
                      <Badge variant="outline">通常（在庫から選択）</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">仕入れ紐付け</label>
                  <p className="text-sm">
                    {(delivery as any).purchaseLinkStatus === 'UNLINKED' ? (
                      <Badge variant="destructive" className="bg-yellow-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        未紐付け
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500">
                        <Link className="h-3 w-3 mr-1" />
                        紐付け済み
                      </Badge>
                    )}
                  </p>
                </div>
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
            <Button
              onClick={handleEdit}
              className="flex-1 h-12"
              title={isReturnDelivery() ? '赤伝は編集できません' : undefined}
            >
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