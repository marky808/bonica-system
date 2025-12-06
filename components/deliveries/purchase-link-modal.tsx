"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Loader2, Link, AlertTriangle, Package, CheckCircle, Building } from "lucide-react"
import { apiClient, type Purchase, type UnlinkedDelivery } from "@/lib/api"

interface PurchaseLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onLinkComplete: () => void
}

export function PurchaseLinkModal({ isOpen, onClose, onLinkComplete }: PurchaseLinkModalProps) {
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [unlinkedDeliveries, setUnlinkedDeliveries] = useState<UnlinkedDelivery[]>([])
  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([])
  const [selectedPurchases, setSelectedPurchases] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [unlinkedRes, purchasesRes] = await Promise.all([
        apiClient.getUnlinkedDeliveries(),
        apiClient.getAvailablePurchases()
      ])

      if (unlinkedRes.data) {
        setUnlinkedDeliveries(unlinkedRes.data.deliveries)
      }

      if (purchasesRes.data) {
        setAvailablePurchases(purchasesRes.data)
      }
    } catch (err) {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseSelect = (deliveryItemId: string, purchaseId: string) => {
    setSelectedPurchases(prev => ({
      ...prev,
      [deliveryItemId]: purchaseId
    }))
  }

  const handleLink = async (deliveryItemId: string) => {
    const purchaseId = selectedPurchases[deliveryItemId]
    if (!purchaseId) {
      setError('仕入れを選択してください')
      return
    }

    setLinking(deliveryItemId)
    setError('')
    setSuccess('')

    try {
      const result = await apiClient.linkPurchaseToDeliveryItem({
        deliveryItemId,
        purchaseId
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('紐付けが完了しました')
        // Reload data to update the list
        await loadData()
        onLinkComplete()
      }
    } catch (err) {
      setError('紐付けに失敗しました')
    } finally {
      setLinking(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getMatchingPurchases = (item: UnlinkedDelivery['items'][0]) => {
    // Filter purchases that match the product name or category
    return availablePurchases.filter(p => {
      // Check if has remaining quantity
      if (p.remainingQuantity < item.quantity) return false

      // Optional: filter by matching criteria
      // For now, show all available purchases
      return true
    })
  }

  const getDisplayProductName = (purchase: Purchase) => {
    if (purchase.productPrefix?.name) {
      return `${purchase.productPrefix.name}${purchase.productName}`
    }
    return purchase.productName
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Link className="h-6 w-6" />
            仕入れ紐付け
          </DialogTitle>
          <DialogDescription>
            直接入力で作成された納品の商品を、仕入れデータと紐付けます
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {unlinkedDeliveries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    未紐付けの納品はありません
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {unlinkedDeliveries.map((delivery) => (
                  <Card key={delivery.id}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {delivery.customer.companyName}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{formatDate(delivery.deliveryDate)}</Badge>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            未紐付け
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {delivery.items.filter(item => !item.purchaseId).map((item, index) => (
                        <div key={item.id}>
                          <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  <h4 className="font-medium">{item.productName || "不明"}</h4>
                                  {item.category && (
                                    <Badge variant="outline">{item.category.name}</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  数量: {item.quantity} {item.unit || ""} |
                                  単価: {formatCurrency(item.unitPrice)} |
                                  小計: {formatCurrency(item.amount)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-end gap-4">
                              <div className="flex-1">
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                  紐付ける仕入れを選択
                                </label>
                                <Select
                                  value={selectedPurchases[item.id] || ""}
                                  onValueChange={(value) => handlePurchaseSelect(item.id, value)}
                                >
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="仕入れを選択..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getMatchingPurchases(item).length === 0 ? (
                                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                        利用可能な仕入れがありません
                                      </div>
                                    ) : (
                                      getMatchingPurchases(item).map((purchase) => (
                                        <SelectItem key={purchase.id} value={purchase.id}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">
                                              {getDisplayProductName(purchase)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              在庫: {purchase.remainingQuantity}{purchase.unit} |
                                              仕入れ先: {purchase.supplier.companyName} |
                                              {formatDate(purchase.purchaseDate)}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={() => handleLink(item.id)}
                                disabled={!selectedPurchases[item.id] || linking === item.id}
                                className="h-12"
                              >
                                {linking === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Link className="h-4 w-4 mr-2" />
                                )}
                                紐付け
                              </Button>
                            </div>
                          </div>
                          {index < delivery.items.filter(i => !i.purchaseId).length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                閉じる
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
