"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import type { Purchase } from "@/types"
import { useIsMobile } from "@/hooks/use-mobile"

// Mock data
const mockPurchases: Purchase[] = [
  {
    id: "1",
    date: "2024-01-15",
    productName: "いちご（あまおう）",
    categoryId: "1",
    quantity: 50,
    unit: "パック",
    unitNotes: "1パック300g",
    price: 125000,
    taxType: "excluded",
    supplierId: "1",
    status: "partial",
    remainingQuantity: 20,
    createdAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "2",
    date: "2024-01-14",
    productName: "トマト（大玉）",
    categoryId: "4",
    quantity: 100,
    unit: "kg",
    price: 80000,
    taxType: "excluded",
    supplierId: "2",
    status: "unused",
    remainingQuantity: 100,
    createdAt: "2024-01-14T14:30:00Z",
  },
  {
    id: "3",
    date: "2024-01-13",
    productName: "すいか（大玉）",
    categoryId: "2",
    quantity: 30,
    unit: "個",
    price: 150000,
    taxType: "included",
    supplierId: "3",
    status: "used",
    remainingQuantity: 0,
    createdAt: "2024-01-13T11:15:00Z",
  },
]

const categories = [
  { id: "1", name: "いちご" },
  { id: "2", name: "すいか" },
  { id: "3", name: "メロン" },
  { id: "4", name: "トマト" },
]

const suppliers = [
  { id: "1", name: "田中農園" },
  { id: "2", name: "山田農場" },
  { id: "3", name: "ABC農園" },
]

interface PurchaseListProps {
  onEdit: (purchase: Purchase) => void
  onDelete: (id: string) => void
  onView: (purchase: Purchase) => void
}

export function PurchaseList({ onEdit, onDelete, onView }: PurchaseListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [sortField, setSortField] = useState<keyof Purchase>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const getStatusBadge = (status: Purchase["status"]) => {
    switch (status) {
      case "unused":
        return <Badge className="bg-primary">未使用</Badge>
      case "partial":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            一部使用
          </Badge>
        )
      case "used":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            使用済み
          </Badge>
        )
      default:
        return <Badge variant="outline">不明</Badge>
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "不明"
  }

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.name || "不明"
  }

  const handleSort = (field: keyof Purchase) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredPurchases = mockPurchases.filter((purchase) => {
    const matchesSearch =
      searchQuery === "" ||
      purchase.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryName(purchase.categoryId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSupplierName(purchase.supplierId).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === "all" || purchase.categoryId === categoryFilter
    const matchesSupplier = supplierFilter === "all" || purchase.supplierId === supplierFilter
    const matchesStatus = statusFilter === "all" || purchase.status === statusFilter
    const matchesMonth = monthFilter === "all" || purchase.date.substring(0, 7) === monthFilter

    return matchesSearch && matchesCategory && matchesSupplier && matchesStatus && matchesMonth
  })

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
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

  const totalPages = Math.ceil(sortedPurchases.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPurchases = sortedPurchases.slice(startIndex, startIndex + itemsPerPage)

  const clearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setSupplierFilter("all")
    setStatusFilter("all")
    setMonthFilter("all")
  }

  const isMobile = useIsMobile()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">仕入れ一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 検索・フィルタエリア */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="商品名、カテゴリー、仕入れ先で検索..."
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

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="カテゴリーで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリー</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="仕入れ先で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての仕入れ先</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="ステータスで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="unused">未使用</SelectItem>
                <SelectItem value="partial">一部使用</SelectItem>
                <SelectItem value="used">使用済み</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isMobile ? (
          /* モバイル用カード表示 */
          <div className="space-y-4">
            {paginatedPurchases.map((purchase) => (
              <Card key={purchase.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{purchase.productName}</h3>
                      <p className="text-sm text-muted-foreground">{getCategoryName(purchase.categoryId)}</p>
                    </div>
                    <div className="flex items-center gap-2">{getStatusBadge(purchase.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">仕入れ日:</span>
                      <p className="font-medium">{purchase.date}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">仕入れ先:</span>
                      <p className="font-medium">{getSupplierName(purchase.supplierId)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">数量:</span>
                      <p className="font-medium">
                        {purchase.quantity} {purchase.unit}
                        {purchase.unitNotes && (
                          <span className="block text-xs text-muted-foreground">{purchase.unitNotes}</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">残数:</span>
                      <p className="font-medium">
                        {purchase.remainingQuantity} {purchase.unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground text-sm">仕入れ価格:</span>
                      <p className="font-bold text-lg">{formatCurrency(purchase.price)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onView(purchase)} className="h-9 w-9 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEdit(purchase)} className="h-9 w-9 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(purchase.id)} className="h-9 w-9 p-0">
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
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("date")}>
                    仕入れ日 {sortField === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("productName")}>
                    商品名 {sortField === "productName" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>カテゴリー</TableHead>
                  <TableHead>数量・単位</TableHead>
                  <TableHead>残数</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("price")}>
                    仕入れ価格 {sortField === "price" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>仕入れ先</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{purchase.date}</TableCell>
                    <TableCell className="font-medium">{purchase.productName}</TableCell>
                    <TableCell>{getCategoryName(purchase.categoryId)}</TableCell>
                    <TableCell>
                      {purchase.quantity} {purchase.unit}
                      {purchase.unitNotes && <div className="text-xs text-muted-foreground">{purchase.unitNotes}</div>}
                    </TableCell>
                    <TableCell>
                      {purchase.remainingQuantity} {purchase.unit}
                    </TableCell>
                    <TableCell>{formatCurrency(purchase.price)}</TableCell>
                    <TableCell>{getSupplierName(purchase.supplierId)}</TableCell>
                    <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onView(purchase)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEdit(purchase)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onDelete(purchase.id)}>
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

        {/* ページネーション */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedPurchases.length)} / {sortedPurchases.length}件
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
