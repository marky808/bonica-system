"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, ShoppingCart, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { apiClient, type Purchase, type Category, type Supplier } from "@/lib/api"

export default function PurchasesListPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSupplier, setSelectedSupplier] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData()
      loadPurchases()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      loadPurchases()
    }
  }, [currentPage, searchTerm, selectedCategory, selectedSupplier, selectedStatus])

  const loadInitialData = async () => {
    try {
      const [categoriesRes, suppliersRes] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getSuppliers()
      ])
      
      if (categoriesRes.data) setCategories(categoriesRes.data)
      if (suppliersRes.data) setSuppliers(suppliersRes.data)
    } catch (error) {
      console.error('初期データ取得エラー:', error)
      setError('初期データの取得に失敗しました')
    }
  }

  const loadPurchases = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await apiClient.getPurchases({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        category: selectedCategory === "all" ? undefined : selectedCategory || undefined,
        supplier: selectedSupplier === "all" ? undefined : selectedSupplier || undefined,
        status: selectedStatus === "all" ? undefined : selectedStatus || undefined,
      })
      
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setPurchases(response.data.purchases)
        setTotalPages(response.data.pagination.totalPages)
        setTotalItems(response.data.pagination.total)
      }
    } catch (error) {
      setError('仕入れデータの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const downloadCsv = async () => {
    try {
      const blob = await apiClient.downloadCsv({
        type: 'purchases'
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `仕入一覧_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV出力エラー:', error)
      setError('CSV出力に失敗しました')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500">完了</Badge>
      case 'PENDING':
        return <Badge variant="secondary">処理中</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setSelectedSupplier("all")
    setSelectedStatus("all")
    setCurrentPage(1)
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">仕入一覧</h1>
            <p className="text-muted-foreground">
              仕入れデータの一覧表示と検索
            </p>
          </div>
          <Button onClick={downloadCsv} className="gap-2">
            <Download className="h-4 w-4" />
            CSV出力
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* フィルター */}
        <Card>
          <CardHeader>
            <CardTitle>検索・フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">商品名検索</label>
                <Input
                  placeholder="商品名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">カテゴリ</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">仕入先</label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">ステータス</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="PENDING">処理中</SelectItem>
                    <SelectItem value="COMPLETED">完了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters} className="w-full">
                  リセット
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 結果表示 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                仕入データ ({totalItems}件)
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {currentPage} / {totalPages} ページ
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="mt-2">読み込み中...</p>
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                検索条件に一致する仕入れデータがありません
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">仕入日</th>
                        <th className="text-left p-3">商品名</th>
                        <th className="text-left p-3">カテゴリ</th>
                        <th className="text-left p-3">仕入先</th>
                        <th className="text-right p-3">数量</th>
                        <th className="text-right p-3">単価</th>
                        <th className="text-right p-3">合計金額</th>
                        <th className="text-right p-3">残数量</th>
                        <th className="text-center p-3">ステータス</th>
                        <th className="text-left p-3">消費期限</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((purchase) => (
                        <tr key={purchase.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">{formatDate(purchase.purchaseDate)}</td>
                          <td className="p-3 font-medium">{purchase.productName}</td>
                          <td className="p-3">{purchase.category.name}</td>
                          <td className="p-3">{purchase.supplier.companyName}</td>
                          <td className="text-right p-3">{purchase.quantity} {purchase.unit}</td>
                          <td className="text-right p-3">{formatCurrency(purchase.unitPrice)}</td>
                          <td className="text-right p-3 font-medium">{formatCurrency(purchase.price)}</td>
                          <td className="text-right p-3">{purchase.remainingQuantity} {purchase.unit}</td>
                          <td className="text-center p-3">{getStatusBadge(purchase.status)}</td>
                          <td className="p-3">
                            {purchase.expiryDate ? formatDate(purchase.expiryDate) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ページネーション */}
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} 件 / {totalItems} 件中
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}