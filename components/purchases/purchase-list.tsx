"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Filter, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { apiClient, type Purchase, type Category, type Supplier } from "@/lib/api"
import { useIsMobile } from "@/hooks/use-mobile"

interface PurchaseListProps {
  purchases: Purchase[]
  onEdit: (purchase: Purchase) => void
  onDelete: (id: string) => void
  onView: (purchase: Purchase) => void
  loading?: boolean
  onRefresh: (purchases: Purchase[]) => void
}

export function PurchaseList({ purchases, onEdit, onDelete, onView, loading = false, onRefresh }: PurchaseListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [sortField, setSortField] = useState<keyof Purchase>("purchaseDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const itemsPerPage = 20

  // Use ref to track if we've already initialized data
  const dataInitialized = useRef(false)

  // Load initial data on component mount - ONLY ONCE EVER
  useEffect(() => {
    const loadData = async () => {
      // Check if we already have data or if initialization was already attempted
      if (dataInitialized.current || purchases.length > 0) {
        return
      }

      dataInitialized.current = true
      setDataLoading(true)
      setError('')
      
      try {
        const [purchasesRes, categoriesRes, suppliersRes] = await Promise.all([
          apiClient.getPurchases(),
          apiClient.getCategories(),
          apiClient.getSuppliers()
        ])
        
        if (purchasesRes.data && purchasesRes.data.purchases) {
          onRefresh(purchasesRes.data.purchases)
        } else {
          setError(purchasesRes.error || '仕入れデータの取得に失敗しました')
        }
        
        if (categoriesRes.data) {
          setCategories(categoriesRes.data)
        }
        
        if (suppliersRes.data) {
          setSuppliers(suppliersRes.data)
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

  // Separate effect to load master data if purchases exist but categories don't
  useEffect(() => {
    const loadMasterData = async () => {
      if (purchases.length > 0 && categories.length === 0 && suppliers.length === 0) {
        try {
          const [categoriesRes, suppliersRes] = await Promise.all([
            apiClient.getCategories(),
            apiClient.getSuppliers()
          ])
          
          if (categoriesRes.data) {
            setCategories(categoriesRes.data)
          }
          
          if (suppliersRes.data) {
            setSuppliers(suppliersRes.data)
          }
        } catch (err) {
          console.error('Failed to load master data:', err)
        }
      }
    }

    // Only run this if we have purchases but no categories/suppliers
    if (purchases.length > 0 && categories.length === 0 && suppliers.length === 0) {
      loadMasterData()
    }
  }, [purchases.length, categories.length, suppliers.length])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
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

  const getCategoryName = (purchase: Purchase) => {
    return purchase.category?.name || "不明"
  }

  const getSupplierName = (purchase: Purchase) => {
    return purchase.supplier?.companyName || "不明"
  }

  const handleSort = (field: keyof Purchase) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      searchQuery === "" ||
      purchase.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryName(purchase).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSupplierName(purchase).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === "all" || purchase.categoryId === categoryFilter
    const matchesSupplier = supplierFilter === "all" || purchase.supplierId === supplierFilter
    const matchesStatus = statusFilter === "all" || purchase.status === statusFilter
    const matchesMonth = monthFilter === "all" || purchase.purchaseDate.substring(0, 7) === monthFilter

    return matchesSearch && matchesCategory && matchesSupplier && matchesStatus && matchesMonth
  })

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    // 日付フィールドの場合はDate型に変換してソート
    if (sortField === "purchaseDate" || sortField === "expiryDate") {
      aValue = new Date(aValue as string).getTime()
      bValue = new Date(bValue as string).getTime()
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    // 文字列フィールドの場合
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    // 数値フィールドの場合
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
        <CardTitle className="text-2xl font-bold">仕入れ一覧</CardTitle>
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
          
          {/* フィルタ適用時の統計情報 */}
          {(searchQuery || categoryFilter !== "all" || supplierFilter !== "all" || statusFilter !== "all" || monthFilter !== "all") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">
                  フィルタ適用中: {filteredPurchases.length}件 / 全{purchases.length}件
                  {filteredPurchases.length > 0 && (
                    <span className="ml-2">
                      (総額: {formatCurrency(filteredPurchases.reduce((sum, p) => sum + p.price, 0))})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="月で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての月</SelectItem>
                {(() => {
                  // 仕入れデータから存在する年月を動的に生成
                  const availableMonths = Array.from(
                    new Set(
                      purchases
                        .map(p => p.purchaseDate.substring(0, 7))
                        .sort((a, b) => b.localeCompare(a)) // 新しい順
                    )
                  )
                  
                  return availableMonths.map(month => {
                    const [year, monthNum] = month.split('-')
                    const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
                    return (
                      <SelectItem key={month} value={month}>
                        {year}年{monthNames[parseInt(monthNum)]}
                      </SelectItem>
                    )
                  })
                })()}
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
                    {supplier.companyName}
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
                <SelectItem value="UNUSED">未使用</SelectItem>
                <SelectItem value="PARTIAL">一部使用</SelectItem>
                <SelectItem value="USED">使用済み</SelectItem>
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
                      <p className="text-sm text-muted-foreground">{getCategoryName(purchase)}</p>
                    </div>
                    <div className="flex items-center gap-2">{getStatusBadge(purchase.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">仕入れ日:</span>
                      <p className="font-medium">{new Date(purchase.purchaseDate).toLocaleDateString('ja-JP')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">仕入れ先:</span>
                      <p className="font-medium">{getSupplierName(purchase)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">数量:</span>
                      <p className="font-medium">
                        {purchase.quantity} {purchase.unit}
                        {purchase.unitNote && (
                          <span className="block text-xs text-muted-foreground">{purchase.unitNote}</span>
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
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("purchaseDate")}>
                    仕入れ日 {sortField === "purchaseDate" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("productName")}>
                    商品名 {sortField === "productName" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>カテゴリー</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("quantity")}>
                    数量・単位 {sortField === "quantity" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("remainingQuantity")}>
                    残数 {sortField === "remainingQuantity" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("price")}>
                    仕入れ価格 {sortField === "price" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>仕入れ先</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("status")}>
                    ステータス {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString('ja-JP')}</TableCell>
                    <TableCell className="font-medium">{purchase.productName}</TableCell>
                    <TableCell>{getCategoryName(purchase)}</TableCell>
                    <TableCell>
                      {purchase.quantity} {purchase.unit}
                      {purchase.unitNote && <div className="text-xs text-muted-foreground">{purchase.unitNote}</div>}
                    </TableCell>
                    <TableCell>
                      {purchase.remainingQuantity} {purchase.unit}
                    </TableCell>
                    <TableCell>{formatCurrency(purchase.price)}</TableCell>
                    <TableCell>{getSupplierName(purchase)}</TableCell>
                    <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => onView(purchase)} title="詳細表示">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEdit(purchase)} title="編集">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onDelete(purchase.id)}
                          title="削除"
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
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

        {!dataLoading && filteredPurchases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchQuery || categoryFilter !== "all" || supplierFilter !== "all" || statusFilter !== "all" || monthFilter !== "all"
                ? "検索条件に一致する仕入れデータがありません"
                : "仕入れデータがありません"}
            </p>
            {(searchQuery || categoryFilter !== "all" || supplierFilter !== "all" || statusFilter !== "all" || monthFilter !== "all") && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                フィルタをクリアして全件表示
              </Button>
            )}
          </div>
        )}

        {/* ページネーション */}
        {filteredPurchases.length > 0 && (
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
        )}
      </CardContent>
    </Card>
  )
}