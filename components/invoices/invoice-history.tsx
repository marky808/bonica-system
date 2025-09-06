"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Download, FileText, Receipt, ChevronLeft, ChevronRight } from "lucide-react"

interface InvoiceHistoryItem {
  id: string
  type: "invoice" | "delivery_slip"
  issueDate: string
  customerName: string
  amount: number
  status: "draft" | "sent" | "paid"
  fileName: string
}

// Mock data
const mockInvoiceHistory: InvoiceHistoryItem[] = [
  {
    id: "INV-2024-01-001",
    type: "invoice",
    issueDate: "2024-01-31",
    customerName: "ABC市場",
    amount: 450000,
    status: "paid",
    fileName: "請求書_ABC市場_2024年1月.pdf",
  },
  {
    id: "INV-2024-01-002",
    type: "invoice",
    issueDate: "2024-01-31",
    customerName: "DEF農協",
    amount: 720000,
    status: "sent",
    fileName: "請求書_DEF農協_2024年1月.pdf",
  },
  {
    id: "DS-2024-01-015",
    type: "delivery_slip",
    issueDate: "2024-01-15",
    customerName: "ABC市場",
    amount: 90000,
    status: "sent",
    fileName: "納品書_ABC市場_20240115.pdf",
  },
  {
    id: "DS-2024-01-014",
    type: "delivery_slip",
    issueDate: "2024-01-14",
    customerName: "XYZ青果店",
    amount: 60000,
    status: "sent",
    fileName: "納品書_XYZ青果店_20240114.pdf",
  },
  {
    id: "INV-2023-12-001",
    type: "invoice",
    issueDate: "2023-12-31",
    customerName: "ABC市場",
    amount: 380000,
    status: "paid",
    fileName: "請求書_ABC市場_2023年12月.pdf",
  },
]

const customers = [
  { id: "1", name: "ABC市場" },
  { id: "2", name: "XYZ青果店" },
  { id: "3", name: "DEF農協" },
  { id: "4", name: "GHI スーパー" },
]

interface InvoiceHistoryProps {
  onDownload?: (item: InvoiceHistoryItem) => void
}

export function InvoiceHistory({ onDownload }: InvoiceHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

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

  const getStatusBadge = (status: InvoiceHistoryItem["status"]) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">下書き</Badge>
      case "sent":
        return (
          <Badge variant="secondary" className="bg-blue-500 text-white">
            送信済み
          </Badge>
        )
      case "paid":
        return <Badge className="bg-primary">支払済み</Badge>
      default:
        return <Badge variant="outline">不明</Badge>
    }
  }

  const filteredHistory = mockInvoiceHistory.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === "all" || item.type === typeFilter
    const matchesCustomer = customerFilter === "all" || item.customerName === customerFilter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    const matchesMonth = monthFilter === "all" || item.issueDate.startsWith(`2024-${monthFilter.padStart(2, "0")}`)
    const matchesDateFrom = !dateFrom || item.issueDate >= dateFrom
    const matchesDateTo = !dateTo || item.issueDate <= dateTo

    return (
      matchesSearch &&
      matchesType &&
      matchesCustomer &&
      matchesStatus &&
      matchesMonth &&
      matchesDateFrom &&
      matchesDateTo
    )
  })

  const sortedHistory = [...filteredHistory].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
  )

  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedHistory = sortedHistory.slice(startIndex, startIndex + itemsPerPage)

  const clearFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
    setCustomerFilter("all")
    setStatusFilter("all")
    setMonthFilter("all")
    setDateFrom("")
    setDateTo("")
  }

  const handleDownload = (item: InvoiceHistoryItem) => {
    // TODO: Implement actual PDF download
    console.log("Downloading:", item.fileName)
    alert(`${item.fileName}をダウンロードしました`)
    onDownload?.(item)
  }

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
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" onClick={clearFilters} className="h-12 bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              フィルタクリア
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="月別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての月</SelectItem>
                <SelectItem value="1">1月</SelectItem>
                <SelectItem value="2">2月</SelectItem>
                <SelectItem value="3">3月</SelectItem>
                <SelectItem value="4">4月</SelectItem>
                <SelectItem value="5">5月</SelectItem>
                <SelectItem value="6">6月</SelectItem>
                <SelectItem value="7">7月</SelectItem>
                <SelectItem value="8">8月</SelectItem>
                <SelectItem value="9">9月</SelectItem>
                <SelectItem value="10">10月</SelectItem>
                <SelectItem value="11">11月</SelectItem>
                <SelectItem value="12">12月</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="帳票種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての種別</SelectItem>
                <SelectItem value="invoice">請求書</SelectItem>
                <SelectItem value="delivery_slip">納品書</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="取引先" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての取引先</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.name}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="sent">送信済み</SelectItem>
                <SelectItem value="paid">支払済み</SelectItem>
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

        {/* テーブル */}
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
              {paginatedHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.issueDate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      {getTypeLabel(item.type)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.customerName}</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(item)}>
                      <Download className="h-4 w-4 mr-2" />
                      ダウンロード
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ページネーション */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedHistory.length)} / {sortedHistory.length}件
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
