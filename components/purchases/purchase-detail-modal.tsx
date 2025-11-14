"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Trash2, Package, Calendar, DollarSign, Building, FileText } from "lucide-react"
import { type Purchase } from "@/lib/api"

interface PurchaseDetailModalProps {
  purchase: Purchase | null
  isOpen: boolean
  onClose: () => void
  onEdit: (purchase: Purchase) => void
  onDelete: (id: string) => void
}

export function PurchaseDetailModal({
  purchase,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: PurchaseDetailModalProps) {
  if (!purchase) return null

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
      case "UNUSED":
        return <Badge className="bg-primary">未使用</Badge>
      case "PARTIAL":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            一部使用
          </Badge>
        )
      case "USED":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            使用済み
          </Badge>
        )
      default:
        return <Badge variant="outline">不明</Badge>
    }
  }

  const getTaxTypeBadge = (taxType: string) => {
    switch (taxType) {
      case "TAXABLE":
        return <Badge variant="secondary">課税</Badge>
      case "TAX_FREE":
        return <Badge variant="outline">非課税</Badge>
      default:
        return <Badge variant="outline">不明</Badge>
    }
  }

  const getDisplayProductName = () => {
    if (purchase.productPrefix?.name) {
      return `${purchase.productPrefix.name}${purchase.productName}`
    }
    return purchase.productName
  }

  const handleEdit = () => {
    onEdit(purchase)
    onClose()
  }

  const handleDelete = () => {
    if (confirm("この仕入れデータを削除しますか？")) {
      onDelete(purchase.id)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            仕入れ詳細
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                商品情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">商品名</label>
                  <p className="text-lg font-semibold">{getDisplayProductName()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">カテゴリー</label>
                  <p className="text-lg">{purchase.category?.name || "不明"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">数量</label>
                  <p className="text-lg">
                    {purchase.quantity} {purchase.unit}
                  </p>
                  {purchase.unitNote && (
                    <p className="text-sm text-muted-foreground mt-1">{purchase.unitNote}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">残り数量</label>
                  <p className="text-lg font-medium">
                    {purchase.remainingQuantity} {purchase.unit}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ステータス</label>
                  <div className="mt-1">{getStatusBadge(purchase.status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 価格・税務情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                価格情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">仕入れ価格</label>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(purchase.price)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">消費税区分</label>
                  <div className="mt-1">{getTaxTypeBadge(purchase.taxType)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 仕入れ先情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                仕入れ先情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">会社名</label>
                  <p className="text-lg">{purchase.supplier?.companyName || "不明"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">担当者</label>
                  <p className="text-lg">{purchase.supplier?.contactPerson || "不明"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 日付情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                日付情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">仕入れ日</label>
                  <p className="text-lg">{formatDate(purchase.purchaseDate)}</p>
                </div>
                {purchase.expiryDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">賞味期限</label>
                    <p className="text-lg">{formatDate(purchase.expiryDate)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">登録日時</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(purchase.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">更新日時</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(purchase.updatedAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 配送料備考 */}
          {purchase.deliveryFee && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  配送料備考
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{purchase.deliveryFee}</p>
              </CardContent>
            </Card>
          )}

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