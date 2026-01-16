"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Filter, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Loader2, Truck, FileText, Download, RotateCcw } from "lucide-react"
import { apiClient, type Delivery, type Customer } from "@/lib/api"
import { useIsMobile } from "@/hooks/use-mobile"
import { Checkbox } from "@/components/ui/checkbox"

interface DeliveryListProps {
  deliveries: Delivery[]
  onEdit: (delivery: Delivery) => void
  onDelete: (id: string) => void
  onView: (delivery: Delivery) => void
  loading?: boolean
  onRefresh: (deliveries: Delivery[]) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onCreateDeliverySlip?: (deliveryId: string) => void
}

export function DeliveryList({ 
  deliveries, 
  onEdit, 
  onDelete, 
  onView, 
  loading = false, 
  onRefresh,
  selectedIds = [],
  onSelectionChange,
  onCreateDeliverySlip
}: DeliveryListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [sortField, setSortField] = useState<keyof Delivery>("deliveryDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [typeFilter, setTypeFilter] = useState("all") // 種別フィルター追加
  const itemsPerPage = 20

  // Use ref to track if we've already initialized data
  const dataInitialized = useRef(false)

  // Load deliveries on component mount - ONLY ONCE EVER
  useEffect(() => {
    const loadData = async () => {
      // Check if we already have data or if initialization was already attempted
      if (dataInitialized.current || deliveries.length > 0) {
        return
      }

      dataInitialized.current = true
      setDataLoading(true)
      setError('')
      
      try {
        const [deliveriesRes, customersRes] = await Promise.all([
          apiClient.getDeliveries(),
          apiClient.getCustomers()
        ])
        
        if (deliveriesRes.data && deliveriesRes.data.deliveries) {
          onRefresh(deliveriesRes.data.deliveries)
        } else {
          setError(deliveriesRes.error || '納品データの取得に失敗しました')
        }
        
        if (customersRes.data) {
          setCustomers(customersRes.data)
        }
      } catch (err) {
        console.error('Data loading error:', err)
        setError('通信エラーが発生しました')
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, []) // Empty dependency array

  // Separate effect to load master data if deliveries exist but customers don't
  useEffect(() => {
    const loadMasterData = async () => {
      if (deliveries.length > 0 && customers.length === 0) {
        try {
          const customersRes = await apiClient.getCustomers()
          
          if (customersRes.data) {
            setCustomers(customersRes.data)
          }
        } catch (err) {
          console.error('Failed to load master data:', err)
        }
      }
    }

    // Only run this if we have deliveries but no customers
    if (deliveries.length > 0 && customers.length === 0) {
      loadMasterData()
    }
  }, [deliveries.length, customers.length])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  // Google SheetsのPDFリンクを生成
  const generatePdfUrl = (delivery: Delivery) => {
    if (!delivery.googleSheetId) return null

    // 環境変数からスプレッドシートIDを取得（実際の値は本番環境の設定に依存）
    const spreadsheetId = "1vaxKYp767uQXg9E6EPDcL4QFwZoqLCpZ7AT32GMhrCY"
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&gid=${delivery.googleSheetId}`
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

  // 種別バッジを取得
  const getTypeBadge = (delivery: Delivery) => {
    const type = (delivery as any).type
    if (type === 'RETURN') {
      return (
        <Badge className="bg-red-500 text-white">
          <RotateCcw className="h-3 w-3 mr-1" />
          赤伝
        </Badge>
      )
    }
    return <Badge variant="outline">通常</Badge>
  }

  // 赤伝かどうかを判定
  const isReturnDelivery = (delivery: Delivery) => {
    return (delivery as any).type === 'RETURN'
  }

  const getCustomerName = (delivery: Delivery) => {
    return delivery.customer?.companyName || "不明"
  }

  const getDisplayProductName = (item: any) => {
    // 直接入力モードの場合はitem.productNameを使用
    if (item.productName) {
      return item.productName
    }
    // 通常モードの場合はpurchaseから取得
    if (item.purchase?.productPrefix?.name) {
      return `${item.purchase.productPrefix.name}${item.purchase.productName}`
    }
    return item.purchase?.productName || "不明"
  }

  const handleSort = (field: keyof Delivery) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      searchQuery === "" ||
      getCustomerName(delivery).toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.items.some(item => {
        const displayName = getDisplayProductName(item)
        return displayName.toLowerCase().includes(searchQuery.toLowerCase())
      })

    const matchesCustomer = customerFilter === "all" || delivery.customerId === customerFilter
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter
    const matchesMonth = monthFilter === "all" || delivery.deliveryDate.substring(0, 7) === monthFilter
    const matchesType = typeFilter === "all" || (delivery as any).type === typeFilter

    return matchesSearch && matchesCustomer && matchesStatus && matchesMonth && matchesType
  })

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      const allIds = filteredDeliveries
        .filter(d => d.status !== 'INVOICED')
        .map(d => d.id)
      onSelectionChange(allIds)
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (deliveryId: string, checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange([...selectedIds, deliveryId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== deliveryId))
    }
  }

  const isAllSelected = filteredDeliveries.length > 0 && 
    filteredDeliveries
      .filter(d => d.status !== 'INVOICED')
      .every(d => selectedIds.includes(d.id))

  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const totalPages = Math.ceil(sortedDeliveries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedDeliveries = sortedDeliveries.slice(startIndex, startIndex + itemsPerPage)

  // フィルター変更ハンドラー（ページを1にリセット）
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleMonthFilterChange = (value: string) => {
    setMonthFilter(value)
    setCurrentPage(1)
  }

  const handleCustomerFilterChange = (value: string) => {
    setCustomerFilter(value)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setCustomerFilter("all")
    setStatusFilter("all")
    setMonthFilter("all")
    setTypeFilter("all")
    setCurrentPage(1)
  }

  const isMobile = useIsMobile()

  if (dataLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          納品履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {/* 検索・フィルタエリア */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="お客様名、商品名で検索..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" onClick={clearFilters} className="h-12 bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              フィルタクリア
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={monthFilter} onValueChange={handleMonthFilterChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="月で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての月</SelectItem>
                {Array.from(
                  new Set(
                    deliveries
                      .map(d => d.deliveryDate.substring(0, 7))
                      .sort((a, b) => b.localeCompare(a))
                  )
                ).map(month => (
                  <SelectItem key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={handleCustomerFilterChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="お客様で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのお客様</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="ステータスで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="PENDING">処理中</SelectItem>
                <SelectItem value="DELIVERED">納品完了</SelectItem>
                <SelectItem value="CANCELLED">キャンセル</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="種別で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての種別</SelectItem>
                <SelectItem value="NORMAL">通常納品</SelectItem>
                <SelectItem value="RETURN">赤伝（返品）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isMobile ? (
          /* モバイル用カード表示 */
          <div className="space-y-4">
            {paginatedDeliveries.map((delivery) => (
              <Card key={delivery.id} className={`p-4 ${isReturnDelivery(delivery) ? 'border-red-300 bg-red-50' : ''}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">{getCustomerName(delivery)}</h3>
                        {getTypeBadge(delivery)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {delivery.items.length}品目 - {delivery.items.map(item => getDisplayProductName(item)).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">{getStatusBadge(delivery.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{isReturnDelivery(delivery) ? '返品日:' : '納品日:'}</span>
                      <p className="font-medium">{new Date(delivery.deliveryDate).toLocaleDateString('ja-JP')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">合計金額:</span>
                      <p className={`font-medium ${isReturnDelivery(delivery) ? 'text-red-600' : ''}`}>{formatCurrency(delivery.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      登録: {new Date(delivery.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onView(delivery)} className="h-9 w-9 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onCreateDeliverySlip && delivery.status !== 'DELIVERED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCreateDeliverySlip(delivery.id)}
                          className="h-9 w-9 p-0"
                          title="Google Sheets納品書作成"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {delivery.status === 'DELIVERED' && delivery.googleSheetUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(delivery.googleSheetUrl, '_blank')}
                          className="h-9 w-9 p-0"
                          title="Google Sheetsを開く"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {delivery.status === 'DELIVERED' && generatePdfUrl(delivery) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generatePdfUrl(delivery)!, '_blank')}
                          className="h-9 w-9 p-0"
                          title="PDFダウンロード"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => onEdit(delivery)} className="h-9 w-9 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(delivery.id)} className="h-9 w-9 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                  {onSelectionChange && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-20">種別</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("deliveryDate")}>
                    納品日 {sortField === "deliveryDate" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>お客様</TableHead>
                  <TableHead>納品商品</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("totalAmount")}>
                    合計金額 {sortField === "totalAmount" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDeliveries.map((delivery) => (
                  <TableRow key={delivery.id} className={isReturnDelivery(delivery) ? 'bg-red-50 hover:bg-red-100' : ''}>
                    {onSelectionChange && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(delivery.id)}
                          onCheckedChange={(checked) => handleSelectOne(delivery.id, checked as boolean)}
                          disabled={delivery.status === 'INVOICED'}
                        />
                      </TableCell>
                    )}
                    <TableCell>{getTypeBadge(delivery)}</TableCell>
                    <TableCell>{new Date(delivery.deliveryDate).toLocaleDateString('ja-JP')}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(delivery)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {delivery.items.slice(0, 2).map((item, index) => (
                          <div key={index} className="text-sm">
                            {getDisplayProductName(item)} ({item.quantity} {item.purchase?.unit || item.unit || '個'})
                          </div>
                        ))}
                        {delivery.items.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            他 {delivery.items.length - 2} 品目
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={isReturnDelivery(delivery) ? 'text-red-600 font-medium' : ''}>{formatCurrency(delivery.totalAmount)}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(delivery.createdAt).toLocaleDateString('ja-JP')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onView(delivery)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {delivery.status === 'DELIVERED' && delivery.googleSheetUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(delivery.googleSheetUrl, '_blank')}
                            title="Google Sheetsを開く"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {delivery.status === 'DELIVERED' && generatePdfUrl(delivery) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generatePdfUrl(delivery)!, '_blank')}
                            title="PDFダウンロード"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {onCreateDeliverySlip && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCreateDeliverySlip(delivery.id)}
                            title="Google Sheets納品書作成"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => onEdit(delivery)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onDelete(delivery.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!dataLoading && filteredDeliveries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchQuery || customerFilter !== "all" || statusFilter !== "all" || monthFilter !== "all"
                ? "検索条件に一致する納品データがありません"
                : "納品データがありません"}
            </p>
            {(searchQuery || customerFilter !== "all" || statusFilter !== "all" || monthFilter !== "all") && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                フィルタをクリアして全件表示
              </Button>
            )}
          </div>
        )}

        {/* ページネーション */}
        {filteredDeliveries.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedDeliveries.length)} / {sortedDeliveries.length}件
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
        )}
      </CardContent>
    </Card>
  )
}