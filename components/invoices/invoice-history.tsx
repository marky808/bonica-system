"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Download, FileText, Receipt, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"

interface InvoiceHistoryItem {
  id: string
  type: "invoice" | "delivery_slip"
  documentNumber: string
  issueDate: string
  customerName: string
  amount: number
  status: string
  googleSheetUrl: string | null
  year?: number
  month?: number
}

interface Customer {
  id: string
  companyName: string
}

interface InvoiceHistoryProps {
  onDownload?: (item: InvoiceHistoryItem) => void
}

export function InvoiceHistory({ onDownload }: InvoiceHistoryProps) {
  const [items, setItems] = useState<InvoiceHistoryItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [monthFilter, setMonthFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20

  // 年の選択肢を生成（過去3年から現在まで）
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())

      if (typeFilter !== 'all') {
        params.append('type', typeFilter === 'invoice' ? 'invoice' : 'delivery')
      }
      if (customerFilter !== 'all') {
        params.append('customerId', customerFilter)
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (yearFilter !== 'all') {
        params.append('year', yearFilter)
      }
      if (monthFilter !== 'all') {
        params.append('month', monthFilter)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await apiClient.request(`/invoices/history?${params.toString()}`)

      if (response.data?.success) {
        setItems(response.data.data.items)
        setTotalPages(response.data.data.totalPages)
        setTotalItems(response.data.data.total)
        if (response.data.data.customers) {
          setCustomers(response.data.data.customers)
        }
      } else {
        setError(response.data?.error || 'データの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('帳票履歴取得エラー:', err)
      setError(err.message || 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [currentPage, typeFilter, customerFilter, statusFilter, yearFilter, monthFilter, searchQuery])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // 日付範囲でのフィルタリング（クライアントサイド）
  const filteredItems = items.filter((item) => {
    const matchesDateFrom = !dateFrom || item.issueDate >= dateFrom
    const matchesDateTo = !dateTo || item.issueDate <= dateTo
    return matchesDateFrom && matchesDateTo
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const getTypeLabel = (type: InvoiceHistoryItem["type"]) => {
    return type === "invoice" ? "請求書" : "納品書"
  }

  const getTypeIcon = (type: InvoiceHistoryItem["type"]) => {
    return type === "invoice" ? <FileText className="h-4 w-4" /> : <Receipt className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toUpperCase()
    switch (normalizedStatus) {
      case "DRAFT":
        return <Badge variant="outline">下書き</Badge>
      case "SENT":
        return (
          <Badge variant="secondary" className="bg-blue-500 text-white">
            送信済み
          </Badge>
        )
      case "PAID":
        return <Badge className="bg-primary">支払済み</Badge>
      case "DELIVERED":
        return (
          <Badge variant="secondary" className="bg-green-500 text-white">
            納品済み
          </Badge>
        )
      case "INVOICED":
        return (
          <Badge variant="secondary" className="bg-purple-500 text-white">
            請求済み
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }


  const clearFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
    setCustomerFilter("all")
    setStatusFilter("all")

    setMonthFilter("all")
    setYearFilter("all")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  const handleOpenSheet = (item: InvoiceHistoryItem) => {
    if (item.googleSheetUrl) {
      window.open(item.googleSheetUrl, '_blank')
    } else {
      alert('スプレッドシートURLが設定されていません')
    }
    onDownload?.(item)
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchHistory()
  }

  const startIndex = (currentPage - 1) * itemsPerPage

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">帳票履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 検索・フィルタエリア */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="取引先名、帳票IDで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" onClick={clearFilters} className="h-12 bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              フィルタクリア
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="年" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての年</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="月別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての月</SelectItem>
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="帳票種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての種別</SelectItem>
                <SelectItem value="invoice">請求書</SelectItem>
                <SelectItem value="delivery_slip">納品書</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={(v) => { setCustomerFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="取引先" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての取引先</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="DRAFT">下書き</SelectItem>
                <SelectItem value="SENT">送信済み</SelectItem>
                <SelectItem value="PAID">支払済み</SelectItem>
                <SelectItem value="DELIVERED">納品済み</SelectItem>
                <SelectItem value="INVOICED">請求済み</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="開始日"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        {/* ローディング・エラー表示 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">読み込み中...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" onClick={fetchHistory} className="mt-4">
              再読み込み
            </Button>
          </div>
        )}

        {/* テーブル */}
        {!loading && !error && (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>発行日</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>帳票ID</TableHead>
                    <TableHead>取引先</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        帳票データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell>{item.issueDate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(item.type)}
                            {getTypeLabel(item.type)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.documentNumber}</TableCell>
                        <TableCell className="font-medium">{item.customerName}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.googleSheetUrl ? (
                            <Button variant="outline" size="sm" onClick={() => handleOpenSheet(item)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              開く
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              <Download className="h-4 w-4 mr-2" />
                              未作成
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ページネーション */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                {totalItems > 0 ? (
                  <>
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} / {totalItems}件
                  </>
                ) : (
                  '0件'
                )}
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
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  次へ
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
