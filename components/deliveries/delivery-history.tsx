"use client"

import { Label } from "@/components/ui/label"
import { useIsMobile } from "@/hooks/use-mobile"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Filter, Eye, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import type { Delivery, DeliveryStatus } from "@/types"

// Mock data
const mockDeliveries: Delivery[] = [
  {
    id: "1",
    date: "2024-01-15",
    customerId: "1",
    items: [
      {
        purchaseId: "1",
        productName: "いちご（あまおう）",
        quantity: 30,
        unit: "パック",
        price: 3000,
        profit: 500,
      },
    ],
    totalAmount: 90000,
    totalProfit: 15000,
    status: "invoice_ready", // freee連携想定の新ステータス
    freeeDeliverySlipId: "freee_slip_001",
    createdAt: "2024-01-15T14:30:00Z",
  },
  {
    id: "2",
    date: "2024-01-14",
    customerId: "2",
    items: [
      {
        purchaseId: "2",
        productName: "トマト（大玉）",
        quantity: 50,
        unit: "kg",
        price: 1200,
        profit: 200,
      },
    ],
    totalAmount: 60000,
    totalProfit: 10000,
    status: "slip_issued", // 納品書発行済み
    freeeDeliverySlipId: "freee_slip_002",
    createdAt: "2024-01-14T16:00:00Z",
  },
]

const customers = [
  { id: "1", name: "ABC市場" },
  { id: "2", name: "XYZ青果店" },
  { id: "3", name: "DEF農協" },
  { id: "4", name: "GHI スーパー" },
]

interface DeliveryHistoryProps {
  onReissueSlip?: (deliveryId: string) => void
}

const getStatusBadge = (status: DeliveryStatus) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          処理中
        </Badge>
      )
    case "slip_issued":
      return (
        <Badge variant="default" className="bg-blue-600">
          納品書発行済み
        </Badge>
      )
    case "invoice_ready":
      return (
        <Badge variant="secondary" className="bg-green-600 text-white">
          請求書準備完了
        </Badge>
      )
    default:
      return <Badge variant="outline">不明</Badge>
  }
}

const getStatusText = (status: DeliveryStatus) => {
  switch (status) {
    case "pending":
      return "処理中"
    case "slip_issued":
      return "納品書発行済み"
    case "invoice_ready":
      return "請求書準備完了"
    default:
      return "不明"
  }
}

export function DeliveryHistory({ onReissueSlip }: DeliveryHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const itemsPerPage = 20
  const isMobile = useIsMobile()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || "不明"
  }

  const filteredDeliveries = mockDeliveries.filter((delivery) => {
    const matchesSearch =
      searchQuery === "" ||
      getCustomerName(delivery.customerId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.items.some((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCustomer = customerFilter === "all" || delivery.customerId === customerFilter

    const matchesMonth = monthFilter === "all" || delivery.date.substring(0, 7) === monthFilter

    const matchesDateFrom = !dateFrom || delivery.date >= dateFrom
    const matchesDateTo = !dateTo || delivery.date <= dateTo

    return matchesSearch && matchesCustomer && matchesMonth && matchesDateFrom && matchesDateTo
  })

  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedDeliveries = filteredDeliveries.slice(startIndex, startIndex + itemsPerPage)

  const clearFilters = () => {
    setSearchQuery("")
    setCustomerFilter("all")
    setMonthFilter("all")
    setDateFrom("")
    setDateTo("")
  }

  const handleReissueSlip = (deliveryId: string) => {
    // TODO: Implement PDF download functionality
    console.log("Reissuing delivery slip for:", deliveryId)
    alert("納品書を再発行しました（PDF ダウンロード機能は後で実装予定）")
    onReissueSlip?.(deliveryId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">納品履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 検索・フィルタエリア */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="納品先、商品名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" onClick={clearFilters} className="h-12 bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              フィルタクリア
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="月で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての月</SelectItem>
                <SelectItem value="2024-01">2024年1月</SelectItem>
                <SelectItem value="2024-02">2024年2月</SelectItem>
                <SelectItem value="2024-03">2024年3月</SelectItem>
                <SelectItem value="2024-04">2024年4月</SelectItem>
                <SelectItem value="2024-05">2024年5月</SelectItem>
                <SelectItem value="2024-06">2024年6月</SelectItem>
                <SelectItem value="2024-07">2024年7月</SelectItem>
                <SelectItem value="2024-08">2024年8月</SelectItem>
                <SelectItem value="2024-09">2024年9月</SelectItem>
                <SelectItem value="2024-10">2024年10月</SelectItem>
                <SelectItem value="2024-11">2024年11月</SelectItem>
                <SelectItem value="2024-12">2024年12月</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="納品先で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての納品先</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="開始日"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-12"
            />

            <Input
              type="date"
              placeholder="終了日"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        {isMobile ? (
          /* モバイル用カード表示 */
          <div className="space-y-4">
            {paginatedDeliveries.map((delivery) => (
              <Card key={delivery.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{getCustomerName(delivery.customerId)}</h3>
                      <p className="text-sm text-muted-foreground">{delivery.date}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(delivery.status)}
                      {delivery.freeeDeliverySlipId && (
                        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
                          freee履歴
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-muted-foreground text-sm">納品商品:</span>
                      <div className="space-y-1">
                        {delivery.items.map((item, index) => (
                          <p key={index} className="text-sm font-medium">
                            {item.productName} - {item.quantity} {item.unit}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-1">
                      <div>
                        <span className="text-muted-foreground text-sm">納品価格:</span>
                        <p className="font-bold text-lg">{formatCurrency(delivery.totalAmount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-sm">利益:</span>
                        <p className="font-medium text-accent">{formatCurrency(delivery.totalProfit)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDelivery(delivery)}
                            className="h-9 w-9 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>納品詳細</DialogTitle>
                            <DialogDescription>納品ID: {delivery.id}</DialogDescription>
                          </DialogHeader>
                          {selectedDelivery && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">納品日</Label>
                                  <p>{selectedDelivery.date}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">納品先</Label>
                                  <p>{getCustomerName(selectedDelivery.customerId)}</p>
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">納品商品</Label>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>商品名</TableHead>
                                      <TableHead>数量</TableHead>
                                      <TableHead>単価</TableHead>
                                      <TableHead>小計</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedDelivery.items.map((item, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell>
                                          {item.quantity} {item.unit}
                                        </TableCell>
                                        <TableCell>{formatCurrency(item.price)}</TableCell>
                                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                  <Label className="text-sm font-medium">合計金額</Label>
                                  <p className="text-lg font-bold text-primary">
                                    {formatCurrency(selectedDelivery.totalAmount)}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">利益</Label>
                                  <p className="text-lg font-bold text-accent">
                                    {formatCurrency(selectedDelivery.totalProfit)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      {(delivery.status === "slip_issued" || delivery.status === "invoice_ready") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReissueSlip(delivery.id)}
                          className="h-9 w-9 p-0"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* デスクトップ用テーブル表示 */
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>納品日</TableHead>
                  <TableHead>納品先</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>納品価格</TableHead>
                  <TableHead>利益</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>{delivery.date}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(delivery.customerId)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {delivery.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            {item.productName}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {delivery.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            {item.quantity} {item.unit}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(delivery.totalAmount)}</TableCell>
                    <TableCell className="text-accent font-medium">{formatCurrency(delivery.totalProfit)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(delivery.status)}
                        {delivery.freeeDeliverySlipId && (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
                            freee履歴
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedDelivery(delivery)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>納品詳細</DialogTitle>
                              <DialogDescription>納品ID: {delivery.id}</DialogDescription>
                            </DialogHeader>
                            {selectedDelivery && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">納品日</Label>
                                    <p>{selectedDelivery.date}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">納品先</Label>
                                    <p>{getCustomerName(selectedDelivery.customerId)}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">納品商品</Label>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>商品名</TableHead>
                                        <TableHead>数量</TableHead>
                                        <TableHead>単価</TableHead>
                                        <TableHead>小計</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedDelivery.items.map((item, index) => (
                                        <TableRow key={index}>
                                          <TableCell>{item.productName}</TableCell>
                                          <TableCell>
                                            {item.quantity} {item.unit}
                                          </TableCell>
                                          <TableCell>{formatCurrency(item.price)}</TableCell>
                                          <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div>
                                    <Label className="text-sm font-medium">合計金額</Label>
                                    <p className="text-lg font-bold text-primary">
                                      {formatCurrency(selectedDelivery.totalAmount)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">利益</Label>
                                    <p className="text-lg font-bold text-accent">
                                      {formatCurrency(selectedDelivery.totalProfit)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {(delivery.status === "slip_issued" || delivery.status === "invoice_ready") && (
                          <Button variant="outline" size="sm" onClick={() => handleReissueSlip(delivery.id)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ページネーション */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDeliveries.length)} /{" "}
            {filteredDeliveries.length}件
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              次へ
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
