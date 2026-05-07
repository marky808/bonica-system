"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Filter, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { apiClient, type Purchase, type Category, type Supplier, type PurchasesResponse } from "@/lib/api"
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
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const itemsPerPage = 100

  // Use ref to track if we've already initialized data
  const dataInitialized = useRef(false)
  // onRefreshをrefで保持して無限ループを防ぐ
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  // 現在のフィルタ値をrefで保持（ハンドラ内で最新の値を参照するため）
  const filtersRef = useRef({ categoryFilter, supplierFilter, statusFilter, monthFilter, searchQuery })
  filtersRef.current = { categoryFilter, supplierFilter, statusFilter, monthFilter, searchQuery }

  // フィルタ条件でAPIを呼び出す関数
  const fetchPurchasesWithFilters = async (overrides: {
    page?: number
    categoryId?: string
    supplierId?: string
    status?: string
    month?: string
    search?: string
  } = {}) => {
    setDataLoading(true)
    setError('')

    try {
      const filters = filtersRef.current
      const params: Parameters<typeof apiClient.getPurchases>[0] = {
        page: overrides.page || 1,
        limit: itemsPerPage,
      }

      // フィルタ条件を追加（overridesがあればそれを、なければ現在のフィルタ値を使用）
      const categoryId = overrides.categoryId !== undefined ? overrides.categoryId : filters.categoryFilter
      const supplierId = overrides.supplierId !== undefined ? overrides.supplierId : filters.supplierFilter
      const status = overrides.status !== undefined ? overrides.status : filters.statusFilter
      const month = overrides.month !== undefined ? overrides.month : filters.monthFilter
      const search = overrides.search !== undefined ? overrides.search : filters.searchQuery

      if (categoryId && categoryId !== 'all') {
        params.categoryId = categoryId
      }
      if (supplierId && supplierId !== 'all') {
        params.supplierId = supplierId
      }
      if (status && status !== 'all') {
        params.status = status
      }
      if (month && month !== 'all') {
        params.month = month
      }
      if (search) {
        params.search = search
      }

      const purchasesRes = await apiClient.getPurchases(params)

      if (purchasesRes.data && purchasesRes.data.purchases) {
        onRefreshRef.current(purchasesRes.data.purchases)
        setTotalCount(purchasesRes.data.pagination.total)
        setTotalPages(purchasesRes.data.pagination.totalPages)
      } else {
        setError(purchasesRes.error || '仕入れデータの取得に失敗しました')
      }
    } catch (err) {
      console.error('Data loading error:', err)
      setError('通信エラーが発生しました')
    } finally {
      setDataLoading(false)
    }
  }

  // フィルタ変更ハンドラ
  const handleMonthFilterChange = (value: string) => {
    setMonthFilter(value)
    setCurrentPage(1)
    fetchPurchasesWithFilters({ page: 1, month: value })
  }

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value)
    setCurrentPage(1)
    fetchPurchasesWithFilters({ page: 1, categoryId: value })
  }

  const handleSupplierFilterChange = (value: string) => {
    setSupplierFilter(value)
    setCurrentPage(1)
    fetchPurchasesWithFilters({ page: 1, supplierId: value })
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
    fetchPurchasesWithFilters({ page: 1, status: value })
  }

  // 検索クエリ用のdebounceタイマー
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchPurchasesWithFilters({ page: 1, search: value })
    }, 300)
  }

  // 初期ロード: マスタデータと初回データ取得
  useEffect(() => {
    const loadInitialData = async () => {
      if (dataInitialized.current) {
        return
      }

      setDataLoading(true)
      setError('')

      try {
        // マスタデータ、月一覧、初回データを並行取得
        const [categoriesRes, suppliersRes, monthsRes, purchasesRes] = await Promise.all([
          apiClient.getCategories(),
          apiClient.getSuppliers(),
          apiClient.getPurchaseMonths(),
          apiClient.getPurchases({ limit: itemsPerPage, page: 1 })
        ])

        if (categoriesRes.data) {
          setCategories(categoriesRes.data)
        }

        if (suppliersRes.data) {
          setSuppliers(suppliersRes.data)
        }

        if (monthsRes.data && monthsRes.data.months) {
          setAvailableMonths(monthsRes.data.months)
        }

        if (purchasesRes.data && purchasesRes.data.purchases) {
          onRefreshRef.current(purchasesRes.data.purchases)
          setTotalCount(purchasesRes.data.pagination.total)
          setTotalPages(purchasesRes.data.pagination.totalPages)
          // 成功した場合のみ初期化完了とする
          dataInitialized.current = true
        } else {
          setError(purchasesRes.error || '仕入れデータの取得に失敗しました')
        }
      } catch (err) {
        console.error('Data loading error:', err)
        setError('通信エラーが発生しました')
      } finally {
        setDataLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // ページ変更時
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchPurchasesWithFilters({ page: newPage })
  }

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

  const getDisplayProductName = (purchase: Purchase) => {
    if (purchase.productPrefix?.name) {
      return `${purchase.productPrefix.name}${purchase.productName}`
    }
    return purchase.productName
  }

  const handleSort = (field: keyof Purchase) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // APIからのデータをそのまま使用（ソートはフロントで行う）
  const sortedPurchases = [...purchases].sort((a, b) => {
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

  // ページネーションはAPI側で処理するため、ここではそのまま表示
  const startIndex = (currentPage - 1) * itemsPerPage

  const clearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setSupplierFilter("all")
    setStatusFilter("all")
    setMonthFilter("all")
    setCurrentPage(1)
    // filtersRefの更新を待たずに直接オールクリアでAPI呼び出し
    fetchPurchasesWithFilters({
      page: 1,
      categoryId: 'all',
      supplierId: 'all',
      status: 'all',
      month: 'all',
      search: ''
    })
  }

  // フィルタが適用されているかどうか
  const isFiltered = searchQuery || categoryFilter !== "all" || supplierFilter !== "all" || statusFilter !== "all" || monthFilter !== "all"

  // 仕入れ先別サマリーを計算
  const supplierSummary = useMemo(() => {
    const summaryMap = new Map<string, { id: string; name: string; total: number; count: number }>()

    purchases.forEach(purchase => {
      const supplierId = purchase.supplier?.id || 'unknown'
      const supplierName = purchase.supplier?.companyName || '不明'

      const existing = summaryMap.get(supplierId)
      if (existing) {
        existing.total += purchase.price
        existing.count += 1
      } else {
        summaryMap.set(supplierId, {
          id: supplierId,
          name: supplierName,
          total: purchase.price,
          count: 1
        })
      }
    })

    // 合計金額が多い順にソート
    return Array.from(summaryMap.values()).sort((a, b) => b.total - a.total)
  }, [purchases])

  // 全体の合計金額
  const grandTotal = useMemo(() => {
    return purchases.reduce((sum, p) => sum + p.price, 0)
  }, [purchases])

  const isMobile = useIsMobile()

  // 初期ロード中（マスタデータ未取得）の場合のみ全体ローディング表示
  const isInitialLoading = dataLoading && !dataInitialized.current

  if (isInitialLoading) {
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
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" onClick={clearFilters} className="h-12 bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              フィルタクリア
            </Button>
          </div>
          
          {/* フィルタ適用時の統計情報 */}
          {isFiltered && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">
                  フィルタ適用中: {totalCount}件
                  {purchases.length > 0 && (
                    <span className="ml-2">
                      (表示中の総額: {formatCurrency(purchases.reduce((sum, p) => sum + p.price, 0))})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={monthFilter} onValueChange={handleMonthFilterChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="月で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての月</SelectItem>
                {availableMonths.map(month => {
                  const [year, monthNum] = month.split('-')
                  const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
                  return (
                    <SelectItem key={month} value={month}>
                      {year}年{monthNames[parseInt(monthNum)]}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
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

            <Select value={supplierFilter} onValueChange={handleSupplierFilterChange}>
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

            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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

        {/* データ取得中のオーバーレイ */}
        {dataLoading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>データを取得中...</span>
          </div>
        )}

        {isMobile ? (
          /* モバイル用カード表示 */
          <div className="space-y-4">
            {sortedPurchases.map((purchase) => (
              <Card key={purchase.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{getDisplayProductName(purchase)}</h3>
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
                {sortedPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString('ja-JP')}</TableCell>
                    <TableCell className="font-medium">{getDisplayProductName(purchase)}</TableCell>
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

        {!dataLoading && purchases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {isFiltered
                ? "検索条件に一致する仕入れデータがありません"
                : "仕入れデータがありません"}
            </p>
            {isFiltered && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                フィルタをクリアして全件表示
              </Button>
            )}
          </div>
        )}

        {/* ページネーション */}
        {purchases.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(startIndex + itemsPerPage, startIndex + purchases.length)} / {totalCount}件
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || dataLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                前へ
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || dataLoading}
              >
                次へ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 仕入れ先別サマリー */}
        {purchases.length > 0 && supplierSummary.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">仕入れ先別 支払い金額</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">仕入れ先</TableHead>
                    <TableHead className="text-right">件数</TableHead>
                    <TableHead className="text-right">支払い金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierSummary.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell className="text-right">{supplier.count}件</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(supplier.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>合計</TableCell>
                    <TableCell className="text-right">{purchases.length}件</TableCell>
                    <TableCell className="text-right text-lg">{formatCurrency(grandTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}